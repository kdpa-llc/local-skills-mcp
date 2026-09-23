import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Only the installed artifact supplies the server and its runtime SDK dependency.
const packageRoot = path.resolve(
  process.argv[2] || "node_modules/local-skills-mcp"
);
const require = createRequire(path.join(packageRoot, "package.json"));
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const relativePackage = path.relative(repositoryRoot, packageRoot);
assert.ok(
  relativePackage.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePackage),
  "Install the tarball outside the checkout so development dependencies cannot mask missing runtime dependencies"
);
const installModules = await fs.realpath(path.dirname(packageRoot));
const packageMetadata = require("./package.json");
for (const specifier of [
  "@modelcontextprotocol/sdk/client/index.js",
  "@modelcontextprotocol/sdk/client/stdio.js",
  "@modelcontextprotocol/sdk/server/index.js",
  "yaml",
]) {
  const resolved = await fs.realpath(require.resolve(specifier));
  assert.ok(
    resolved.startsWith(installModules + path.sep),
    `Runtime dependency resolved outside the clean installation: ${specifier}`
  );
}
const { Client } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js"))
);
const { StdioClientTransport } = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/stdio.js"))
);
const fixture = await fs.mkdtemp(
  path.join(os.tmpdir(), "skills-package-smoke-")
);
const fixtureSkills = path.join(fixture, "skills");
const packageSkills = path.join(packageRoot, "skills");
const launcher = fileURLToPath(
  new URL("./fixture-server.mjs", import.meta.url)
);
const makeSkill = async (name, content) => {
  const dir = path.join(fixtureSkills, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Use this fixture to verify packed runtime behavior.\n---\n${content}`
  );
};
const client = new Client(
  { name: "packed-server-smoke", version: "1.0.0" },
  { capabilities: {} }
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [launcher, packageRoot, packageSkills, fixtureSkills],
  cwd: fixture,
  // The SDK supplies its documented safe environment defaults. No host-root
  // replacement or global homedir patch is needed with explicit directories.
  stderr: "pipe",
});
const text = (result) => {
  assert.notEqual(result.isError, true);
  assert.equal(result.content[0]?.type, "text");
  return result.content[0].text;
};
let timeout;
try {
  await makeSkill("cold-fixture", "Cold package fixture content");
  const checks = async () => {
    await client.connect(transport);
    assert.match(
      text(
        await client.callTool({
          name: "get_skill",
          arguments: { skill_name: "cold-fixture" },
        })
      ),
      /Cold package fixture content/
    );
    await makeSkill("new-fixture", "Discovered after cold request");
    assert.match(
      text(
        await client.callTool({
          name: "get_skill",
          arguments: { skill_name: "new-fixture" },
        })
      ),
      /Discovered after cold request/
    );

    const { tools } = await client.listTools();
    for (const name of ["get_skill", "validate_skill", "evaluate_skill"]) {
      const tool = tools.find((item) => item.name === name);
      assert.ok(tool, `Required tool is missing: ${name}`);
      assert.ok(tool.inputSchema.required.includes("skill_name"));
    }
    assert.match(
      tools.find((tool) => tool.name === "get_skill").description,
      /cold-fixture: Use this fixture/
    );

    const entries = await fs.readdir(packageSkills, { withFileTypes: true });
    const builtin = entries.find((entry) => entry.isDirectory());
    assert.ok(builtin, "The installed tarball must contain bundled skills");
    const builtinText = text(
      await client.callTool({
        name: "get_skill",
        arguments: { skill_name: builtin.name },
      })
    );
    assert.ok(!builtinText.startsWith("Error:"), "A bundled skill must load");
    assert.match(builtinText, /# Skill:/);

    const validation = text(
      await client.callTool({
        name: "validate_skill",
        arguments: { skill_name: "cold-fixture" },
      })
    );
    assert.equal(JSON.parse(validation).valid, true);
    // Evaluation is called only with a rejected name: never invoke a provider.
    for (const name of ["get_skill", "validate_skill", "evaluate_skill"]) {
      const invalid = await client.callTool({
        name,
        arguments: { skill_name: "../outside" },
      });
      assert.equal(invalid.content[0]?.type, "text");
      assert.match(invalid.content[0].text, /^Error: Invalid skill_name/);
    }
  };
  await Promise.race([
    checks(),
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Packaged server smoke timed out")),
        30000
      );
    }),
  ]);
  console.log(
    JSON.stringify({
      node: process.version,
      packageVersion: packageMetadata.version,
      coverage:
        "installed server module and real MCP stdio; not default CLI discovery/bin shim",
      coldLoad: true,
      newlyAdded: true,
      requiredTools: true,
      builtinLoad: true,
      validation: true,
      traversalRejected: true,
    })
  );
} finally {
  clearTimeout(timeout);
  try {
    await client.close();
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
}
