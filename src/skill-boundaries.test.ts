import fs from "fs/promises";
import os from "os";
import path from "path";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalSkillsServer } from "./index.js";

type ToolHandler = (request: {
  params: { name: string; arguments: Record<string, unknown> };
}) => Promise<{ content: { type: string; text: string }[] }>;

const mocks = vi.hoisted(() => ({
  handlers: new Map<unknown, ToolHandler>(),
  validate: vi.fn(async (_file: string) => ({ valid: true })),
  evaluate: vi.fn(async (_input: unknown, _root: string) => ({
    status: "verified",
  })),
}));

// Capture the registered MCP callbacks; the server's real dispatch and registry
// logic still run, while neither file processor can reach an external provider.
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: class {
    setRequestHandler(schema: unknown, handler: ToolHandler) {
      mocks.handlers.set(schema, handler);
    }

    async close() {}
  },
}));
vi.mock("./skill-validator.js", () => ({ validateSkillFile: mocks.validate }));
vi.mock("./eval-runner.js", () => ({ evaluateSkill: mocks.evaluate }));

describe("validation and evaluation registry boundaries", () => {
  let root: string | undefined;
  let skills: string;
  let outsideFile: string;
  let server: LocalSkillsServer | undefined;
  let callTool: ToolHandler;

  beforeEach(async () => {
    mocks.handlers.clear();
    mocks.validate.mockClear();
    mocks.evaluate.mockClear();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "skill-boundaries-"));
    skills = path.join(root, "skills");
    outsideFile = path.join(root, "outside", "SKILL.md");
    await fs.mkdir(path.join(skills, "regular"), { recursive: true });
    await fs.mkdir(path.dirname(outsideFile));
    // Deliberately malformed: validation must reach the validator without
    // requiring the loader to parse frontmatter first.
    await fs.writeFile(path.join(skills, "regular", "SKILL.md"), "fixture");
    await fs.writeFile(outsideFile, "outside fixture");

    server = new LocalSkillsServer([skills]);
    const handler = mocks.handlers.get(CallToolRequestSchema);
    if (!handler) throw new Error("CallTool handler was not registered");
    callTool = handler;
  });

  afterEach(async () => {
    try {
      await server?.close();
    } finally {
      server = undefined;
      mocks.handlers.clear();
      if (root) {
        await fs.rm(root, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 100,
        });
        root = undefined;
      }
    }
  });

  for (const tool of ["validate_skill", "evaluate_skill"]) {
    it.each([
      "../outside",
      "..\\outside",
      ".",
      "..",
      "bad\0name",
      "",
      "   ",
      42,
      null,
      undefined,
    ])(
      `${tool} rejects invalid name %j before processing`,
      async (skillName) => {
        const result = await callTool({
          params: { name: tool, arguments: { skill_name: skillName } },
        });

        expect(result.content).toEqual([
          {
            type: "text",
            text: expect.stringMatching(
              /^Error: (Invalid skill_name|skill_name is required)/
            ),
          },
        ]);
        expect(mocks.validate).not.toHaveBeenCalled();
        expect(mocks.evaluate).not.toHaveBeenCalled();
        // This checks no modification; processor noninvocation is asserted above.
        expect(await fs.readFile(outsideFile, "utf8")).toBe("outside fixture");
      }
    );

    // Match the existing canonical convention: Windows symlinks can require
    // privileges that are not available to CI workers.
    it.skipIf(process.platform === "win32")(
      `${tool} rejects a symlinked skill directory before processing`,
      async () => {
        await fs.symlink(
          path.dirname(outsideFile),
          path.join(skills, "linked"),
          "dir"
        );
        const result = await callTool({
          params: { name: tool, arguments: { skill_name: "linked" } },
        });

        expect(result.content).toEqual([
          {
            type: "text",
            text: expect.stringContaining('Error: Skill "linked" not found.'),
          },
        ]);
        expect(mocks.validate).not.toHaveBeenCalled();
        expect(mocks.evaluate).not.toHaveBeenCalled();
        expect(await fs.readFile(outsideFile, "utf8")).toBe("outside fixture");
      }
    );
  }

  it("validates a malformed skill on a cold registry without parsing it first", async () => {
    const result = await callTool({
      params: { name: "validate_skill", arguments: { skill_name: "regular" } },
    });

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(
      path.join(skills, "regular", "SKILL.md")
    );
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ valid: true }, null, 2) },
    ]);
  });

  it("forwards every documented evaluation control and registered skill path", async () => {
    const controls = {
      eval_set_path: path.join(skills, "eval.json"),
      max_iterations: 3,
      num_workers: 2,
      runs_per_query: 4,
      timeout_seconds: 42,
      holdout: 0.3,
      trigger_threshold: 0.6,
      description_override: "fixture description",
      model: "fixture-model",
    };
    const result = await callTool({
      params: {
        name: "evaluate_skill",
        arguments: { skill_name: "regular", ...controls },
      },
    });

    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
    expect(mocks.evaluate).toHaveBeenCalledWith(
      {
        skill_name: "regular",
        skill_path: path.join(skills, "regular"),
        ...controls,
      },
      expect.any(String)
    );
    expect(mocks.validate).not.toHaveBeenCalled();
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ status: "verified" }, null, 2) },
    ]);
  });
});
