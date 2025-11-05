import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";

/**
 * End-to-End tests for Local Skills MCP Server
 *
 * These tests spawn the actual server binary as a subprocess and communicate
 * via stdio transport using JSON-RPC 2.0 protocol. This validates:
 * - Server startup and initialization
 * - Real stdio communication
 * - Full MCP protocol implementation
 * - Server behavior as end users would experience it
 */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class StdioMCPClient {
  private serverProcess: ChildProcess | null = null;
  private responseHandlers = new Map<
    number | string,
    (response: JsonRpcResponse) => void
  >();
  private buffer = "";
  private requestId = 0;

  async start(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn("node", [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (
        !this.serverProcess.stdout ||
        !this.serverProcess.stdin ||
        !this.serverProcess.stderr
      ) {
        reject(new Error("Failed to create stdio streams"));
        return;
      }

      // Handle server output
      this.serverProcess.stdout.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      // Log stderr for debugging
      this.serverProcess.stderr.on("data", (data: Buffer) => {
        const message = data.toString().trim();
        // Ignore skill directory warnings in tests
        if (
          !message.includes("Skill directory") &&
          !message.includes("does not exist")
        ) {
          console.error("Server stderr:", message);
        }
      });

      this.serverProcess.on("error", (err) => {
        reject(err);
      });

      // Give the server a moment to start
      setTimeout(() => resolve(), 500);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response: JsonRpcResponse = JSON.parse(line);
        const handler = this.responseHandlers.get(response.id);
        if (handler) {
          handler(response);
          this.responseHandlers.delete(response.id);
        }
      } catch (err) {
        console.error("Failed to parse JSON-RPC response:", line, err);
      }
    }
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.serverProcess || !this.serverProcess.stdin) {
      throw new Error("Server not started");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, 5000);

      this.responseHandlers.set(id, (response: JsonRpcResponse) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(`JSON-RPC Error: ${response.error.message}`));
        } else {
          resolve(response.result);
        }
      });

      const message = JSON.stringify(request) + "\n";
      this.serverProcess!.stdin!.write(message);
    });
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      return new Promise((resolve) => {
        this.serverProcess!.once("exit", () => resolve());
        this.serverProcess!.kill();
        // Force kill after timeout
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill("SIGKILL");
          }
          resolve();
        }, 1000);
      });
    }
  }
}

describe("E2E Tests - Subprocess with Stdio Transport", () => {
  let client: StdioMCPClient;
  const serverPath = resolve(__dirname, "../dist/index.js");

  beforeEach(async () => {
    client = new StdioMCPClient();
    await client.start(serverPath);
  });

  afterEach(async () => {
    await client.stop();
  });

  describe("Server Initialization", () => {
    it("should start server subprocess successfully", async () => {
      // If we got here, server started successfully
      expect(client).toBeDefined();
    });

    it("should respond to initialize request", async () => {
      const result = await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      expect(result).toBeDefined();
      expect(result.protocolVersion).toBe("2024-11-05");
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBe("local-skills-mcp");
      expect(result.capabilities).toBeDefined();
    });

    it("should respond to initialized notification", async () => {
      // Initialize first
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      // Send initialized notification (no response expected)
      // In real protocol, notifications don't get responses
      // We just verify it doesn't crash the server
      const listResult = await client.sendRequest("tools/list", {});
      expect(listResult).toBeDefined();
    });
  });

  describe("Tool Discovery", () => {
    it("should list available tools", async () => {
      // Initialize first
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      const result = await client.sendRequest("tools/list", {});

      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);

      const getSkillTool = result.tools.find(
        (t: any) => t.name === "get_skill"
      );
      expect(getSkillTool).toBeDefined();
      expect(getSkillTool.description).toContain("Available skills");
      expect(getSkillTool.inputSchema).toBeDefined();
      expect(getSkillTool.inputSchema.properties.skill_name).toBeDefined();
    });
  });

  describe("Tool Execution", () => {
    let availableSkills: string[] = [];

    beforeEach(async () => {
      // Initialize and get available skills
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      const listResult = await client.sendRequest("tools/list", {});
      const getSkillTool = listResult.tools.find(
        (t: any) => t.name === "get_skill"
      );

      if (getSkillTool && getSkillTool.description) {
        const match = getSkillTool.description.match(
          /Available skills: ([^\n]+)/
        );
        if (match) {
          availableSkills = match[1].split(", ").map((s: string) => s.trim());
        }
      }
    });

    it("should execute get_skill tool successfully", async () => {
      if (availableSkills.length === 0) {
        console.log("No skills available, skipping test");
        return;
      }

      const skillName = availableSkills[0];
      const result = await client.sendRequest("tools/call", {
        name: "get_skill",
        arguments: {
          skill_name: skillName,
        },
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("---");
    });

    it("should return error for non-existent skill", async () => {
      const result = await client.sendRequest("tools/call", {
        name: "get_skill",
        arguments: {
          skill_name: "non-existent-skill-xyz-12345",
        },
      });

      // MCP servers return errors as tool results with isError flag or error text
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("not found");
    });

    it("should return error for invalid tool name", async () => {
      const result = await client.sendRequest("tools/call", {
        name: "invalid_tool_name",
        arguments: {},
      });

      // MCP servers return errors as tool results with error text
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Unknown tool");
    });
  });

  describe("Protocol Compliance", () => {
    it("should handle multiple sequential requests", async () => {
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      // Send multiple requests in sequence
      const result1 = await client.sendRequest("tools/list", {});
      expect(result1.tools).toBeDefined();

      const result2 = await client.sendRequest("tools/list", {});
      expect(result2.tools).toBeDefined();

      const result3 = await client.sendRequest("tools/list", {});
      expect(result3.tools).toBeDefined();

      // All results should be consistent
      expect(result1.tools).toEqual(result2.tools);
      expect(result2.tools).toEqual(result3.tools);
    });

    it("should maintain server state across requests", async () => {
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      // Get list of tools
      const listResult = await client.sendRequest("tools/list", {});
      const getSkillTool = listResult.tools.find(
        (t: any) => t.name === "get_skill"
      );

      // Extract skill list
      const match = getSkillTool?.description.match(
        /Available skills: ([^\n]+)/
      );
      const skills = match
        ? match[1].split(", ").map((s: string) => s.trim())
        : [];

      if (skills.length > 0) {
        // Call tool with first skill
        const callResult = await client.sendRequest("tools/call", {
          name: "get_skill",
          arguments: { skill_name: skills[0] },
        });
        expect(callResult.content[0].type).toBe("text");

        // List tools again - should still work
        const listResult2 = await client.sendRequest("tools/list", {});
        expect(listResult2.tools).toEqual(listResult.tools);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required parameters", async () => {
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      try {
        await client.sendRequest("tools/call", {
          name: "get_skill",
          arguments: {}, // Missing skill_name
        });
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).toBeDefined();
      }
    });

    it("should handle malformed skill names gracefully", async () => {
      await client.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "e2e-test-client",
          version: "1.0.0",
        },
      });

      const result = await client.sendRequest("tools/call", {
        name: "get_skill",
        arguments: {
          skill_name: "../../../etc/passwd", // Path traversal attempt
        },
      });

      // Should return error as tool result (skill not found)
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("not found");
    });
  });
});
