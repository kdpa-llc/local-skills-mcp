import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getAllSkillsDirectories,
  LocalSkillsServer,
  optionalNumber,
  optionalString,
  requireSkillName,
} from "./index.js";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Safely remove a directory with retries for Windows file locking issues.
 * Windows can be slower to release file handles, causing EBUSY errors.
 */
async function removeDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    console.log(`[removeDir] Directory does not exist: ${dir}`);
    return;
  }

  console.log(`[removeDir] Starting cleanup of: ${dir}`);

  // Log what's in the directory before attempting removal
  try {
    const contents = fs.readdirSync(dir, { recursive: true });
    console.log(
      `[removeDir] Directory contains ${contents.length} items:`,
      contents
    );
  } catch (err: any) {
    console.log(`[removeDir] Could not list directory contents:`, err.message);
  }

  const maxRetries = 10;
  const baseDelay = 100;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(
        `[removeDir] Attempt ${attempt + 1}/${maxRetries} to remove: ${dir}`
      );

      // Use fs.rmSync with built-in retry options (Node 14.14+)
      fs.rmSync(dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });

      console.log(`[removeDir] ✓ Successfully removed: ${dir}`);
      return; // Success
    } catch (error: any) {
      console.log(
        `[removeDir] ✗ Attempt ${attempt + 1} failed:`,
        error.code,
        error.message
      );

      // Handle retryable errors: EBUSY, ENOTEMPTY, EPERM (common on Windows)
      const isRetryable =
        error.code === "EBUSY" ||
        error.code === "ENOTEMPTY" ||
        error.code === "EPERM";

      if (isRetryable && attempt < maxRetries - 1) {
        // Exponential backoff: wait progressively longer on Windows
        const delay = baseDelay * (attempt + 1);
        console.log(`[removeDir] Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Not a retryable error or max retries exceeded
      if (attempt === maxRetries - 1) {
        console.warn(
          `[removeDir] ⚠️ Failed to remove directory ${dir} after ${maxRetries} attempts:`,
          error.message
        );

        // Try to provide more diagnostic info on Windows
        if (process.platform === "win32") {
          try {
            console.log(
              `[removeDir] Directory still exists:`,
              fs.existsSync(dir)
            );
            if (fs.existsSync(dir)) {
              const contents = fs.readdirSync(dir, { recursive: true });
              console.log(`[removeDir] Remaining items:`, contents);
            }
          } catch {
            // Ignore
          }
        }

        // Don't throw - allow tests to continue
        return;
      }

      // For non-retryable errors, throw immediately
      throw error;
    }
  }
}

// Mock MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  class MockServer {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    handlers = new Map<any, Function>();
    onerror: any = null;
    close = vi.fn();
    connect = vi.fn();

    constructor(
      public config: any,
      public capabilities: any
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    setRequestHandler(schema: any, handler: Function) {
      this.handlers.set(schema, handler);
    }
  }

  return { Server: MockServer };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: vi.fn(),
  };
});

describe("getAllSkillsDirectories", () => {
  let originalCwd: string;
  let tempDir: string;
  let homeSkillsExist: boolean;
  let restoreExistsSync: () => void;
  const homeClaudeSkills = path.join(os.homedir(), ".claude", "skills");
  const packageSkills = path.resolve(__dirname, "..", "skills");

  beforeEach(() => {
    originalCwd = process.cwd();
    vi.stubEnv("SKILLS_DIR", undefined);

    // Create temp directory for testing
    // Use realpathSync to resolve any symlinks (important on macOS where /var -> /private/var)
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "skills-test-"))
    );
    process.chdir(tempDir);

    // Simulate home-directory presence without inspecting its contents or
    // changing the process home. All other paths belong to test fixtures/repo.
    homeSkillsExist = false;
    const existsSync = fs.existsSync;
    const spy = vi.spyOn(fs, "existsSync").mockImplementation((target) => {
      if (target === homeClaudeSkills) return homeSkillsExist;
      return existsSync(target);
    });
    restoreExistsSync = () => spy.mockRestore();
  });

  afterEach(async () => {
    // Restore original state
    restoreExistsSync();
    process.chdir(originalCwd);
    vi.unstubAllEnvs();

    // Clean up temp directory (with Windows retry logic)
    await removeDir(tempDir);
  });

  it("should include home .claude/skills directory if it exists", () => {
    homeSkillsExist = true;

    const dirs = getAllSkillsDirectories();
    expect(dirs).toEqual([packageSkills, homeClaudeSkills]);
  });

  it("should omit home .claude/skills directory if it does not exist", () => {
    const dirs = getAllSkillsDirectories();
    expect(dirs).not.toContain(homeClaudeSkills);
    expect(dirs).toEqual([packageSkills]);
  });

  it("should include project .claude/skills directory if it exists", () => {
    const projectClaudeSkills = path.join(tempDir, ".claude", "skills");
    fs.mkdirSync(projectClaudeSkills, { recursive: true });

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(projectClaudeSkills);
  });

  it("should include default skills directory", () => {
    const defaultSkills = path.join(tempDir, "skills");
    fs.mkdirSync(defaultSkills, { recursive: true });

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(defaultSkills);
  });

  it("should include SKILLS_DIR from environment if set", () => {
    const customSkillsDir = path.join(tempDir, "custom-skills");
    fs.mkdirSync(customSkillsDir, { recursive: true });

    vi.stubEnv("SKILLS_DIR", customSkillsDir);

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(customSkillsDir);
  });

  it("should return default directory if no directories exist", () => {
    // Create a clean directory with no skills folders
    const emptyDir = path.join(tempDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    process.chdir(emptyDir);
    const dirs = getAllSkillsDirectories();

    expect(dirs).toEqual([packageSkills]);
  });

  it("should prioritize directories correctly", () => {
    // Create all possible directories
    homeSkillsExist = true;
    const projectClaudeSkills = path.join(tempDir, ".claude", "skills");
    const defaultSkills = path.join(tempDir, "skills");
    const customSkills = path.join(tempDir, "custom");

    fs.mkdirSync(projectClaudeSkills, { recursive: true });
    fs.mkdirSync(defaultSkills, { recursive: true });
    fs.mkdirSync(customSkills, { recursive: true });

    vi.stubEnv("SKILLS_DIR", customSkills);

    const dirs = getAllSkillsDirectories();
    expect(dirs).toEqual([
      packageSkills,
      homeClaudeSkills,
      projectClaudeSkills,
      defaultSkills,
      customSkills,
    ]);
  });

  it("should use discovered defaults when no constructor directories are supplied", async () => {
    homeSkillsExist = true;
    const projectSkills = path.join(tempDir, "skills");
    fs.mkdirSync(projectSkills);

    // Defaults are captured at module initialization. Reimport under the scoped
    // existence stub, then inspect configuration without discovering home skills.
    // Other tests retain their original server and SDK schema imports together.
    vi.resetModules();
    const { LocalSkillsServer: DefaultServer } = await import("./index.js");
    const defaultServer = new DefaultServer();
    try {
      expect((defaultServer as any).skillsDirs).toEqual([
        packageSkills,
        homeClaudeSkills,
        projectSkills,
      ]);
    } finally {
      await defaultServer.close();
      vi.resetModules();
    }
  });
});

describe("LocalSkillsServer", () => {
  let tempDir: string;
  let skillsDir: string;
  let originalCwd: string;
  let server: LocalSkillsServer | null = null;
  let testName = "";

  beforeEach(() => {
    originalCwd = process.cwd();
    // Capture current test name for logging
    testName = expect.getState().currentTestName || "unknown";
    console.log(`\n[beforeEach] Starting test: ${testName}`);

    // Use realpathSync to resolve any symlinks (important on macOS where /var -> /private/var)
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "server-test-"))
    );
    console.log(`[beforeEach] Created temp directory: ${tempDir}`);

    skillsDir = path.join(tempDir, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    console.log(`[beforeEach] Created skills directory: ${skillsDir}`);

    // Create test skills
    const testSkillDir = path.join(skillsDir, "test-skill");
    fs.mkdirSync(testSkillDir, { recursive: true });
    const skillFile = path.join(testSkillDir, "SKILL.md");
    fs.writeFileSync(
      skillFile,
      `---
name: test-skill
description: A test skill for unit testing
---

This is test skill content.`
    );
    console.log(`[beforeEach] Created test skill file: ${skillFile}`);

    console.log(`[beforeEach] Changing directory to: ${tempDir}`);
    process.chdir(tempDir);
    console.log(`[beforeEach] Current directory: ${process.cwd()}`);
  });

  afterEach(async () => {
    console.log(`\n[afterEach] Cleaning up test: ${testName}`);

    // CRITICAL: Close server BEFORE cleaning up files (important for Windows)
    if (server) {
      console.log(`[afterEach] Closing server instance...`);
      try {
        await server.close();
        console.log(`[afterEach] ✓ Server closed successfully`);
      } catch (err) {
        console.warn("[afterEach] ✗ Error closing server:", err);
      }
      server = null;
    } else {
      console.log(`[afterEach] No server instance to close`);
    }

    // Wait for all file handles to be released (Windows needs significantly more time)
    // Windows file system takes longer to release handles compared to Unix systems
    const cleanupDelay = process.platform === "win32" ? 1000 : 200;
    console.log(
      `[afterEach] Waiting ${cleanupDelay}ms for handles to be released...`
    );
    await new Promise((resolve) => setTimeout(resolve, cleanupDelay));

    console.log(
      `[afterEach] Current directory before cleanup: ${process.cwd()}`
    );

    // CRITICAL: On Windows, if cwd is inside the directory we're trying to delete, it will be locked
    // Restore the previous directory to release the lock and isolate later tests.
    const cwd = process.cwd();
    if (cwd.startsWith(tempDir)) {
      console.log(
        `[afterEach] ⚠️ CWD is inside tempDir, changing to parent...`
      );
      process.chdir(originalCwd);
      console.log(`[afterEach] Changed CWD to: ${process.cwd()}`);

      // On Windows, even after changing directory, the OS needs time to release the lock
      if (process.platform === "win32") {
        console.log(
          `[afterEach] Waiting additional 500ms for Windows to release directory lock...`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // THEN clean up temp directory
    await removeDir(tempDir);
    console.log(`[afterEach] ✓ Cleanup complete for test: ${testName}\n`);
  });

  it("should create server instance successfully", () => {
    console.log(`[test] Creating LocalSkillsServer instance...`);
    server = new LocalSkillsServer([skillsDir]);
    console.log(`[test] ✓ Server instance created`);
    expect(server).toBeDefined();
  });

  it("should register ListTools handler", async () => {
    console.log(`[test] Creating LocalSkillsServer instance...`);
    server = new LocalSkillsServer([skillsDir]);
    console.log(`[test] ✓ Server instance created`);

    // Access the server's internal state through type assertion
    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    expect(mockServer.handlers.size).toBeGreaterThan(0);
  });

  it("should handle ListTools request with available skills", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // Get the ListTools handler
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);

    expect(listToolsHandler).toBeDefined();

    const result = await listToolsHandler();

    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThanOrEqual(3);
    expect(result.tools[0].name).toBe("get_skill");
    expect(result.tools.some((t: any) => t.name === "validate_skill")).toBe(
      true
    );
    expect(result.tools.some((t: any) => t.name === "evaluate_skill")).toBe(
      true
    );
    expect(result.tools[0].description).toContain("Available skills");
    expect(result.tools[0].description).toContain("test-skill");
    expect(result.tools[0].inputSchema).toBeDefined();
    expect(result.tools[0].inputSchema.required).toContain("skill_name");
  });

  it("should show message when no skills available", async () => {
    // Create empty directory with no skills
    const emptyDir = path.join(tempDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    server = new LocalSkillsServer([emptyDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);

    const result = await listToolsHandler();

    expect(result.tools[0].description).toContain(
      "No skills currently available"
    );
    expect(result.tools[0].description).toContain(
      "Check configured directories"
    );
    expect(result.tools[0].description).toContain(emptyDir);
  });

  it("should handle empty skill lists in tool description", async () => {
    const isolatedDir = path.join(tempDir, "isolated");
    fs.mkdirSync(isolatedDir, { recursive: true });
    server = new LocalSkillsServer([isolatedDir]);

    const mockServer = (server as any).server;
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
    const result = await listToolsHandler();
    const description = result.tools[0].description;

    expect(description).toContain("No skills currently available");
    expect(description).toContain(isolatedDir);
  });

  it("should display empty skills message when no skills directories exist", async () => {
    server = new LocalSkillsServer([]);
    const mockServer = (server as any).server;
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
    const result = await listToolsHandler();
    const description = result.tools[0].description;

    expect(description).toContain("No skills currently available");
    expect(description).toContain("Check configured directories");
    expect(description).toContain("(none configured)");
  });

  it("should show appropriate message based on skill availability", async () => {
    server = new LocalSkillsServer([skillsDir]);
    const serverInternal = server as any;
    const skillNames = await serverInternal.skillLoader.discoverSkills();
    expect(skillNames).toEqual(["test-skill"]);

    const listToolsHandler = serverInternal.server.handlers.get(
      ListToolsRequestSchema
    );
    const result = await listToolsHandler();
    expect(result.tools[0].description).toContain("Available skills");
    expect(result.tools[0].description).toContain("test-skill");
  });

  it("should handle CallTool request with valid skill", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // First get available skills
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
    const listResult = await listToolsHandler();

    // Extract available skill names from description
    const description = listResult.tools[0].description;
    const match = description.match(/Available skills:\n((?:- .+\n?)+)/);
    expect(match).not.toBeNull();
    if (!match) throw new Error("Fixture skill was not listed");
    const skillNames = match[1]
      .split("\n")
      .map((line: string) => line.replace(/^-/u, "").trim())
      .filter(Boolean)
      .map((line: string) => line.split(":")[0]?.trim())
      .filter(Boolean);
    expect(skillNames).toEqual(["test-skill"]);

    const testSkillName = skillNames[0];
    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);
    expect(callToolHandler).toBeDefined();
    const result = await callToolHandler({
      params: {
        name: "get_skill",
        arguments: { skill_name: testSkillName },
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    const responseText = result.content[0].text;
    expect(responseText).toContain(`# Skill: ${testSkillName}`);
    expect(responseText).toContain("**Description:**");
    expect(responseText).toContain("**Source:**");
    expect(responseText).toContain("---");
  });

  it("should fall back to skill name when metadata cannot be loaded", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;
    const skillLoader = serverInternal.skillLoader;

    const discoverSpy = vi
      .spyOn(skillLoader, "discoverSkills")
      .mockResolvedValue(["broken-skill"]);
    const metadataSpy = vi
      .spyOn(skillLoader, "getSkillMetadata")
      .mockRejectedValue(new Error("metadata boom"));

    try {
      const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();

      expect(result.tools[0].description).toContain("- broken-skill");
    } finally {
      discoverSpy.mockRestore();
      metadataSpy.mockRestore();
    }
  });

  it("should truncate long skill descriptions in tool metadata", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;
    const skillLoader = serverInternal.skillLoader;

    const longDescription = "A".repeat(1100);

    const discoverSpy = vi
      .spyOn(skillLoader, "discoverSkills")
      .mockResolvedValue(["detailed-skill"]);
    const metadataSpy = vi
      .spyOn(skillLoader, "getSkillMetadata")
      .mockResolvedValue({
        name: "detailed-skill",
        description: longDescription,
        source: "/fake/path",
      });

    try {
      const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();
      const description = result.tools[0].description;

      const line = description
        .split("\n")
        .find((entry: string) => entry.startsWith("- detailed-skill"));

      expect(line).toBeDefined();

      const detail = line!.slice(line!.indexOf(":") + 2);
      expect(detail.length).toBeLessThanOrEqual(1024);
      expect(detail.endsWith("...")).toBe(true);
    } finally {
      discoverSpy.mockRestore();
      metadataSpy.mockRestore();
    }
  });

  it("should handle CallTool with missing skill_name", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "get_skill",
        arguments: {},
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("skill_name is required");
  });

  it("should handle CallTool with unknown tool name", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "unknown_tool",
        arguments: {},
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("should handle CallTool with non-existent skill", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "get_skill",
        arguments: { skill_name: "non-existent" },
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("not found");
  });

  it("should set up error handler", () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    expect(mockServer.onerror).not.toBeNull();
  });

  it("should register SIGINT handler", () => {
    const listenersBefore = process.listeners("SIGINT").length;

    server = new LocalSkillsServer([skillsDir]);

    const listenersAfter = process.listeners("SIGINT").length;

    expect(listenersAfter).toBeGreaterThanOrEqual(listenersBefore);
  });

  it("should handle server errors via onerror handler", () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    expect(mockServer.onerror).not.toBeNull();

    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Trigger the error handler
    if (typeof mockServer.onerror === "function") {
      mockServer.onerror(new Error("Test error"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[MCP Error]",
        expect.any(Error)
      );
    }

    consoleErrorSpy.mockRestore();
  });

  it("should properly close server on SIGINT", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;
    const previousExitCode = process.exitCode;

    // shutdown() is what the SIGINT listener delegates to. Awaiting it
    // directly makes the assertion deterministic - the listener itself is
    // fire-and-forget, so awaiting that returns before close() settles, which
    // is how the real process.exit() previously escaped the spy.
    await server.shutdown();

    expect(mockServer.close).toHaveBeenCalled();
    expect(process.exitCode).toBe(0);

    process.exitCode = previousExitCode;
  });

  it("should remove its SIGINT listener on close", async () => {
    const before = process.listenerCount("SIGINT");

    const scoped = new LocalSkillsServer([skillsDir]);
    expect(process.listenerCount("SIGINT")).toBe(before + 1);

    await scoped.close();

    // The leak this guards: one listener per constructed server, never
    // removed, which tripped MaxListenersExceededWarning across a test run.
    expect(process.listenerCount("SIGINT")).toBe(before);
  });

  it("should shut down when the registered SIGINT listener fires", async () => {
    const before = process.listeners("SIGINT");
    server = new LocalSkillsServer([skillsDir]);
    const previousExitCode = process.exitCode;

    const serverInternal = server as any;
    const added = process
      .listeners("SIGINT")
      .filter((listener) => !before.includes(listener));
    expect(added).toHaveLength(1);

    // Invoke the listener the way Node would. It returns void, so wait on the
    // end state rather than the call: close() being invoked does not mean the
    // shutdown finished, and the exit status is set a microtask later.
    process.exitCode = undefined;
    (added[0] as () => void)();
    await vi.waitFor(() => {
      expect(process.exitCode).toBe(0);
    });

    expect(serverInternal.server.close).toHaveBeenCalled();
    process.exitCode = previousExitCode;
  });

  it("should report a non-zero exit status when close fails", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const previousExitCode = process.exitCode;
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    serverInternal.server.close = vi
      .fn()
      .mockRejectedValue(new Error("transport already gone"));

    // shutdown() must swallow the failure rather than reject: it runs from a
    // signal handler, where an unhandled rejection would replace a clean
    // shutdown with a crash. The status is how the failure is reported.
    await expect(server.shutdown()).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    process.exitCode = previousExitCode;
    consoleErrorSpy.mockRestore();
  });

  it("should run the server and connect to transport", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock the transport's start method
    mockServer.connect.mockResolvedValue(undefined);

    // Call run method
    await server.run();

    // Verify connect was called
    expect(mockServer.connect).toHaveBeenCalled();

    // Verify console.error was called with version info
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Local Skills MCP Server")
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Aggregating skills from")
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle validate_skill CallTool request", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;
    const skillLoader = serverInternal.skillLoader;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    // First discover available skills
    const skillNames = await skillLoader.discoverSkills();
    expect(skillNames).toEqual(["test-skill"]);
    const result = await callToolHandler({
      params: {
        name: "validate_skill",
        arguments: { skill_name: skillNames[0] },
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty("valid");
    expect(parsed).toHaveProperty("errors");
    expect(parsed).toHaveProperty("warnings");
  });

  it("should return error for validate_skill with missing skill_name", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "validate_skill",
        arguments: {},
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("skill_name is required");
  });

  it("should return error for validate_skill with non-existent skill", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "validate_skill",
        arguments: { skill_name: "totally-nonexistent-skill" },
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("not found");
  });

  it("should return error for evaluate_skill with missing skill_name", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "evaluate_skill",
        arguments: {},
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("skill_name is required");
  });

  it("should return error for evaluate_skill with non-existent skill", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "evaluate_skill",
        arguments: { skill_name: "totally-nonexistent-skill" },
      },
    });

    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("not found");
  });
});

describe("Version handling", () => {
  it("should read version from package.json", () => {
    const projectRoot = path.resolve(__dirname, "..");
    const packageJsonPath = path.join(projectRoot, "package.json");

    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    expect(packageJson.version).toBeDefined();
    expect(typeof packageJson.version).toBe("string");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("requireSkillName", () => {
  it("should accept a plain skill name", () => {
    expect(requireSkillName("code-reviewer")).toBe("code-reviewer");
  });

  it("should trim surrounding whitespace", () => {
    expect(requireSkillName("  code-reviewer  ")).toBe("code-reviewer");
  });

  it("should reject a missing name", () => {
    expect(() => requireSkillName(undefined)).toThrow(
      "skill_name is required and must be a non-empty string"
    );
  });

  it("should reject an empty or whitespace-only name", () => {
    expect(() => requireSkillName("")).toThrow("skill_name is required");
    expect(() => requireSkillName("   ")).toThrow("skill_name is required");
  });

  it("should reject non-string values", () => {
    expect(() => requireSkillName(123)).toThrow("skill_name is required");
    expect(() => requireSkillName({ skill: "x" })).toThrow(
      "skill_name is required"
    );
    expect(() => requireSkillName(null)).toThrow("skill_name is required");
  });

  it("should reject POSIX path traversal", () => {
    expect(() => requireSkillName("../../etc")).toThrow("Invalid skill_name");
    expect(() => requireSkillName("nested/skill")).toThrow(
      "Invalid skill_name"
    );
    expect(() => requireSkillName("/etc/passwd")).toThrow("Invalid skill_name");
  });

  it("should reject Windows path traversal", () => {
    expect(() => requireSkillName("..\\..\\windows")).toThrow(
      "Invalid skill_name"
    );
    expect(() => requireSkillName("nested\\skill")).toThrow(
      "Invalid skill_name"
    );
  });

  it("should reject relative directory references", () => {
    expect(() => requireSkillName(".")).toThrow("Invalid skill_name");
    expect(() => requireSkillName("..")).toThrow("Invalid skill_name");
  });

  it("should reject names containing a null byte", () => {
    expect(() => requireSkillName("skill\0.md")).toThrow("Invalid skill_name");
  });
});

describe("optionalString / optionalNumber", () => {
  it("should return undefined for omitted values", () => {
    expect(optionalString(undefined, "model")).toBeUndefined();
    expect(optionalString(null, "model")).toBeUndefined();
    expect(optionalNumber(undefined, "holdout")).toBeUndefined();
    expect(optionalNumber(null, "holdout")).toBeUndefined();
  });

  it("should pass through well-typed values", () => {
    expect(optionalString("sonnet", "model")).toBe("sonnet");
    expect(optionalNumber(0, "holdout")).toBe(0);
    expect(optionalNumber(0.4, "holdout")).toBe(0.4);
  });

  it("should reject wrong-typed strings", () => {
    expect(() => optionalString(5, "model")).toThrow("model must be a string");
  });

  it("should reject wrong-typed and non-finite numbers", () => {
    expect(() => optionalNumber("5", "holdout")).toThrow(
      "holdout must be a finite number"
    );
    expect(() => optionalNumber(Number.NaN, "holdout")).toThrow(
      "holdout must be a finite number"
    );
    expect(() => optionalNumber(Number.POSITIVE_INFINITY, "holdout")).toThrow(
      "holdout must be a finite number"
    );
  });
});

describe("Path traversal hardening", () => {
  let server: LocalSkillsServer | null = null;
  let outsideDir = "";

  beforeEach(() => {
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "outside-skills-"));
    const secretSkill = path.join(outsideDir, "secret");
    fs.mkdirSync(secretSkill, { recursive: true });
    fs.writeFileSync(
      path.join(secretSkill, "SKILL.md"),
      "---\nname: secret\ndescription: Should be unreachable from a configured skills directory.\n---\n\nsecret body\n"
    );
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
    await removeDir(outsideDir);
  });

  it("should refuse to validate a SKILL.md outside the skills directories", async () => {
    server = new LocalSkillsServer([]);
    const mockServer = (server as any).server;
    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "validate_skill",
        arguments: { skill_name: `../${path.basename(outsideDir)}/secret` },
      },
    });

    expect(result.content[0].text).toContain("Invalid skill_name");
    expect(result.content[0].text).not.toContain("secret body");
  });

  // Symlink creation needs elevated privileges on Windows.
  it.skipIf(process.platform === "win32")(
    "should still serve a skill whose SKILL.md is a symlink into another repo",
    async () => {
      // Managing skills in a dotfiles repo and symlinking them into
      // ~/.claude/skills is a common setup; the file is a link but the skill
      // directory is real, so discovery finds it and validation must too.
      const skillsDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "linked-skills-")
      );
      try {
        const skillDir = path.join(skillsDir, "linked");
        fs.mkdirSync(skillDir);
        fs.symlinkSync(
          path.join(outsideDir, "secret", "SKILL.md"),
          path.join(skillDir, "SKILL.md")
        );

        const { SkillLoader } = await import("./skill-loader.js");
        const loader = new SkillLoader([skillsDir]);

        const location = await loader.getSkillLocation("linked");
        expect(location.path).toBe(skillDir);
      } finally {
        fs.rmSync(skillsDir, { recursive: true, force: true });
      }
    }
  );

  it("should treat an encoded separator as a literal name, not a traversal", () => {
    // %2f is not a path separator at the filesystem layer, so this is just an
    // unusual name — the registry simply has no such key.
    expect(() => requireSkillName("..%2f..%2fsecret")).not.toThrow();
  });

  it("should refuse to evaluate a skill outside the skills directories", async () => {
    server = new LocalSkillsServer([]);
    const mockServer = (server as any).server;
    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: {
        name: "evaluate_skill",
        arguments: { skill_name: "../../../../tmp" },
      },
    });

    expect(result.content[0].text).toContain("Invalid skill_name");
  });
});

describe("get_skill name round-trip", () => {
  let server: LocalSkillsServer | null = null;
  let skillsDir = "";

  beforeEach(() => {
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "roundtrip-skills-"));
    const skillPath = path.join(skillsDir, "session-start-hook");
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(
      path.join(skillPath, "SKILL.md"),
      "---\nname: startup-hook-skill\ndescription: Directory name and frontmatter name deliberately disagree.\n---\n\nhook body\n"
    );
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
    await removeDir(skillsDir);
  });

  it("should return a name the caller can pass straight back to get_skill", async () => {
    server = new LocalSkillsServer([skillsDir]);

    const mockServer = (server as any).server;
    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const first = await callToolHandler({
      params: {
        name: "get_skill",
        arguments: { skill_name: "session-start-hook" },
      },
    });

    const header = (first.content[0].text as string).split("\n")[0];
    expect(header).toBe("# Skill: session-start-hook");
    expect(first.content[0].text).toContain("**Title:** startup-hook-skill");

    // Feed the returned name back in; it must resolve to the same skill.
    const returnedName = header.replace("# Skill: ", "").trim();
    const second = await callToolHandler({
      params: { name: "get_skill", arguments: { skill_name: returnedName } },
    });

    expect(second.content[0].text).toBe(first.content[0].text);
    expect(second.content[0].text).not.toContain("not found");
  });

  it("should omit the title line when it matches the directory name", async () => {
    const matching = path.join(skillsDir, "plain-skill");
    fs.mkdirSync(matching, { recursive: true });
    fs.writeFileSync(
      path.join(matching, "SKILL.md"),
      "---\nname: plain-skill\ndescription: Directory name and frontmatter name agree here.\n---\n\nbody\n"
    );

    server = new LocalSkillsServer([skillsDir]);

    const mockServer = (server as any).server;
    const callToolHandler = mockServer.handlers.get(CallToolRequestSchema);

    const result = await callToolHandler({
      params: { name: "get_skill", arguments: { skill_name: "plain-skill" } },
    });

    expect(result.content[0].text).toContain("# Skill: plain-skill");
    expect(result.content[0].text).not.toContain("**Title:**");
  });
});
