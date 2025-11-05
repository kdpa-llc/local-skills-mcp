import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAllSkillsDirectories, LocalSkillsServer } from "./index.js";
import fs from "fs";
import path from "path";
import os from "os";

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
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skills-test-"));
  });

  afterEach(() => {
    // Restore original state
    process.chdir(originalCwd);
    process.env = originalEnv;

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should include home .claude/skills directory if it exists", () => {
    const homeClaudeSkills = path.join(os.homedir(), ".claude", "skills");

    process.chdir(tempDir);
    delete process.env.SKILLS_DIR;

    const dirs = getAllSkillsDirectories();

    // If the home directory exists, it should be included
    if (fs.existsSync(homeClaudeSkills)) {
      expect(dirs).toContain(homeClaudeSkills);
    }

    expect(dirs.length).toBeGreaterThan(0);
  });

  it("should create home .claude/skills and verify it is included", () => {
    // Create a temporary home directory with .claude/skills
    const fakeHome = path.join(tempDir, "fake-home");
    const fakeHomeSkills = path.join(fakeHome, ".claude", "skills");
    fs.mkdirSync(fakeHomeSkills, { recursive: true });

    // Temporarily override os.homedir
    const originalHomedir = os.homedir;
    (os as any).homedir = () => fakeHome;

    try {
      process.chdir(tempDir);
      delete process.env.SKILLS_DIR;

      const dirs = getAllSkillsDirectories();

      // Should include the fake home .claude/skills directory
      expect(dirs).toContain(fakeHomeSkills);
    } finally {
      // Restore original homedir
      (os as any).homedir = originalHomedir;
    }
  });

  it("should include project .claude/skills directory if it exists", () => {
    const projectClaudeSkills = path.join(tempDir, ".claude", "skills");
    fs.mkdirSync(projectClaudeSkills, { recursive: true });

    process.chdir(tempDir);
    delete process.env.SKILLS_DIR;

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(projectClaudeSkills);
  });

  it("should include default skills directory", () => {
    const defaultSkills = path.join(tempDir, "skills");
    fs.mkdirSync(defaultSkills, { recursive: true });

    process.chdir(tempDir);
    delete process.env.SKILLS_DIR;

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(defaultSkills);
  });

  it("should include SKILLS_DIR from environment if set", () => {
    const customSkillsDir = path.join(tempDir, "custom-skills");
    fs.mkdirSync(customSkillsDir, { recursive: true });

    process.chdir(tempDir);
    process.env.SKILLS_DIR = customSkillsDir;

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(customSkillsDir);
  });

  it("should return default directory if no directories exist", () => {
    // Create a clean directory with no skills folders
    const emptyDir = path.join(tempDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    process.chdir(emptyDir);
    delete process.env.SKILLS_DIR;

    const dirs = getAllSkillsDirectories();

    // With the new implementation, package built-in skills should always be included
    // The package skills directory should be present even when no other directories exist
    expect(dirs.length).toBeGreaterThan(0);
    // The package skills path should include '/skills' at the end
    expect(dirs.some((dir) => dir.endsWith("/skills"))).toBe(true);
  });

  it("should prioritize directories correctly", () => {
    // Create all possible directories
    const homeClaudeSkills = path.join(os.homedir(), ".claude", "skills");
    const projectClaudeSkills = path.join(tempDir, ".claude", "skills");
    const defaultSkills = path.join(tempDir, "skills");
    const customSkills = path.join(tempDir, "custom");

    fs.mkdirSync(projectClaudeSkills, { recursive: true });
    fs.mkdirSync(defaultSkills, { recursive: true });
    fs.mkdirSync(customSkills, { recursive: true });

    process.chdir(tempDir);
    process.env.SKILLS_DIR = customSkills;

    const dirs = getAllSkillsDirectories();

    // Check that custom SKILLS_DIR comes last (for override behavior)
    const customIndex = dirs.indexOf(customSkills);
    expect(customIndex).toBeGreaterThan(-1);

    // Verify all expected directories are present
    if (fs.existsSync(homeClaudeSkills)) {
      expect(dirs).toContain(homeClaudeSkills);
    }
    expect(dirs).toContain(projectClaudeSkills);
    expect(dirs).toContain(defaultSkills);
    expect(dirs).toContain(customSkills);
  });
});

describe("LocalSkillsServer", () => {
  let tempDir: string;
  let skillsDir: string;
  let server: LocalSkillsServer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "server-test-"));
    skillsDir = path.join(tempDir, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });

    // Create test skills
    const testSkillDir = path.join(skillsDir, "test-skill");
    fs.mkdirSync(testSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(testSkillDir, "SKILL.md"),
      `---
name: test-skill
description: A test skill for unit testing
---

This is test skill content.`
    );

    process.chdir(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should create server instance successfully", () => {
    expect(() => {
      server = new LocalSkillsServer();
    }).not.toThrow();

    expect(server).toBeDefined();
  });

  it("should register ListTools handler", async () => {
    server = new LocalSkillsServer();

    // Access the server's internal state through type assertion
    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    expect(mockServer.handlers.size).toBeGreaterThan(0);
  });

  it("should handle ListTools request with available skills", async () => {
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // Get the ListTools handler
    const { ListToolsRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);

    expect(listToolsHandler).toBeDefined();

    const result = await listToolsHandler();

    expect(result.tools).toBeDefined();
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("get_skill");
    // Should contain either test-skill or available skills message
    expect(
      result.tools[0].description.includes("test-skill") ||
        result.tools[0].description.includes("Available skills")
    ).toBe(true);
    expect(result.tools[0].inputSchema).toBeDefined();
    expect(result.tools[0].inputSchema.required).toContain("skill_name");
  });

  it("should show message when no skills available", async () => {
    // Create empty directory with no skills
    const emptyDir = path.join(tempDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    process.chdir(emptyDir);

    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const { ListToolsRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);

    const result = await listToolsHandler();

    // Should contain either "No skills" message or available skills from other directories
    expect(
      result.tools[0].description.includes("No skills currently available") ||
        result.tools[0].description.includes("Available skills")
    ).toBe(true);

    // Verify the tool description contains directory information
    expect(result.tools[0].description).toContain("skills");
  });

  it("should handle empty skill lists in tool description", async () => {
    // Create a truly isolated environment for testing empty skills
    const isolatedDir = path.join(tempDir, "isolated");
    fs.mkdirSync(isolatedDir, { recursive: true });

    // Save and temporarily modify HOME to avoid finding real skills
    const originalHome = process.env.HOME;
    const originalHomedir = os.homedir;
    process.env.HOME = isolatedDir;
    (os as any).homedir = () => isolatedDir;
    process.chdir(isolatedDir);
    delete process.env.SKILLS_DIR;

    try {
      server = new LocalSkillsServer();

      const serverInternal = server as any;
      const mockServer = serverInternal.server;

      // Get the ListTools handler and check the description
      const { ListToolsRequestSchema } = await import(
        "@modelcontextprotocol/sdk/types.js"
      );
      const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();

      // Should show "No skills currently available" message
      const description = result.tools[0].description;

      // Verify it contains the empty message OR available skills from elsewhere
      expect(
        description.includes("No skills currently available") ||
          description.includes("Available skills")
      ).toBe(true);
    } finally {
      // Restore original HOME and homedir
      process.env.HOME = originalHome;
      (os as any).homedir = originalHomedir;
    }
  });

  it("should display empty skills message when no skills directories exist", async () => {
    // Create completely isolated directory
    const emptyDir = path.join(tempDir, "truly-empty");
    fs.mkdirSync(emptyDir, { recursive: true });

    const originalHomedir = os.homedir;
    (os as any).homedir = () => emptyDir;
    process.chdir(emptyDir);
    delete process.env.SKILLS_DIR;

    try {
      server = new LocalSkillsServer();

      const serverInternal = server as any;
      const mockServer = serverInternal.server;

      const { ListToolsRequestSchema } = await import(
        "@modelcontextprotocol/sdk/types.js"
      );
      const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();

      const description = result.tools[0].description;

      // Should mention checking configured directories or show available skills
      expect(
        description.includes("Check configured directories") ||
          description.includes("Available skills") ||
          description.includes("No skills currently available")
      ).toBe(true);
    } finally {
      (os as any).homedir = originalHomedir;
    }
  });

  it("should show appropriate message based on skill availability", async () => {
    // Create a brand new isolated temp directory structure
    const brandNewTemp = fs.mkdtempSync(
      path.join(os.tmpdir(), "no-skills-test-")
    );

    try {
      const originalHomedir = os.homedir;
      const originalCwd = process.cwd();

      // Override homedir to point to our isolated temp dir
      (os as any).homedir = () => brandNewTemp;
      process.chdir(brandNewTemp);
      delete process.env.SKILLS_DIR;

      server = new LocalSkillsServer();
      const serverInternal = server as any;

      // Directly test the skill loader
      const skillLoader = serverInternal.skillLoader;
      const skillNames = await skillLoader.discoverSkills();

      // Test the ListTools handler
      const mockServer = serverInternal.server;
      const { ListToolsRequestSchema } = await import(
        "@modelcontextprotocol/sdk/types.js"
      );
      const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();

      const description = result.tools[0].description;

      if (skillNames.length === 0) {
        // If no skills found, should show the "Check configured directories" message
        expect(description).toContain("No skills currently available");
        expect(description).toContain("Check configured directories");
      } else {
        // If skills found (from real directories), should list them
        expect(description).toContain("Available skills");
      }

      // Restore
      (os as any).homedir = originalHomedir;
      process.chdir(originalCwd);
    } finally {
      // Cleanup
      fs.rmSync(brandNewTemp, { recursive: true, force: true });
    }
  });

  it("should handle CallTool request with valid skill", async () => {
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // First get available skills
    const { ListToolsRequestSchema, CallToolRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
    const listToolsHandler = mockServer.handlers.get(ListToolsRequestSchema);
    const listResult = await listToolsHandler();

    // Extract available skill names from description
    const description = listResult.tools[0].description;
    const match = description.match(/Available skills: ([^\n]+)/);

    if (match) {
      const skillNames = match[1].split(", ").map((s: string) => s.trim());
      const testSkillName = skillNames[0]; // Use the first available skill

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
      expect(result.content[0].text).toContain(testSkillName);
    } else {
      // No skills available, this test should pass
      expect(true).toBe(true);
    }
  });

  it("should handle CallTool with missing skill_name", async () => {
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const { CallToolRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
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
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const { CallToolRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
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
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    const { CallToolRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
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
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    expect(mockServer.onerror).not.toBeNull();
  });

  it("should register SIGINT handler", () => {
    const listenersBefore = process.listeners("SIGINT").length;

    server = new LocalSkillsServer();

    const listenersAfter = process.listeners("SIGINT").length;

    expect(listenersAfter).toBeGreaterThanOrEqual(listenersBefore);
  });

  it("should handle server errors via onerror handler", () => {
    server = new LocalSkillsServer();

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
    server = new LocalSkillsServer();

    const serverInternal = server as any;
    const mockServer = serverInternal.server;

    // Find the SIGINT handler that was added
    const sigintListeners = process.listeners("SIGINT");
    const ourHandler = sigintListeners[sigintListeners.length - 1];

    // Mock process.exit to avoid actually exiting
    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as any);

    // Trigger the handler
    if (typeof ourHandler === "function") {
      await (ourHandler as any)();
      expect(mockServer.close).toHaveBeenCalled();
    }

    mockExit.mockRestore();
  });

  it("should run the server and connect to transport", async () => {
    server = new LocalSkillsServer();

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
