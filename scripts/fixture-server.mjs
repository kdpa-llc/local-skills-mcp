// Test launcher for the real built/installed server, with explicit fixture roots.
// This exercises the exported server and stdio transport, not default CLI discovery.
import path from "node:path";
import { pathToFileURL } from "node:url";

const [packageRoot, ...skillDirectories] = process.argv.slice(2);
if (!packageRoot || skillDirectories.length === 0) {
  throw new Error("Usage: fixture-server.mjs PACKAGE_ROOT SKILL_DIRECTORY...");
}

const { LocalSkillsServer } = await import(
  pathToFileURL(path.resolve(packageRoot, "dist/index.js"))
);
const server = new LocalSkillsServer(
  skillDirectories.map((dir) => path.resolve(dir))
);
await server.run();
