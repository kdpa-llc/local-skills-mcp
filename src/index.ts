#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { SkillLoader } from "./skill-loader.js";
import { validateSkillFile } from "./skill-validator.js";
import { evaluateSkill } from "./eval-runner.js";

// Get version from package.json (single source of truth)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const VERSION = packageJson.version;

/**
 * Get all skills directories to aggregate from.
 *
 * Scans for skill directories in the following order (lowest to highest priority):
 * 1. `<package-root>/skills` - Package built-in skills (self-documenting, always available)
 * 2. `~/.claude/skills` - Global Claude skills
 * 3. `{cwd}/.claude/skills` - Project-level Claude skills
 * 4. `{cwd}/skills` - Default project skills directory
 * 5. `$SKILLS_DIR` - Custom directory from environment variable
 *
 * For duplicate skill names, later directories take precedence. This allows
 * users to override built-in skills with their own versions.
 *
 * @returns Array of directory paths that exist on the filesystem
 *
 * @example
 * ```typescript
 * const dirs = getAllSkillsDirectories();
 * console.log(dirs);
 * // ['/usr/lib/node_modules/local-skills-mcp/skills', '/home/user/.claude/skills', '/home/user/project/skills']
 * ```
 *
 * @example
 * ```typescript
 * // With SKILLS_DIR environment variable
 * process.env.SKILLS_DIR = '/custom/skills';
 * const dirs = getAllSkillsDirectories();
 * // Returns: [...standard paths..., '/custom/skills']
 * ```
 */
export function getAllSkillsDirectories(): string[] {
  const directories: string[] = [];

  // Always include package built-in skills first (lowest priority, always available)
  // This provides self-documenting capabilities out-of-the-box
  const packageRoot = path.join(__dirname, "..");
  const packageSkills = path.join(packageRoot, "skills");
  if (fs.existsSync(packageSkills)) {
    directories.push(packageSkills);
  }

  // Include standard Claude locations if they exist
  const homeClaudeSkills = path.join(os.homedir(), ".claude", "skills");
  if (fs.existsSync(homeClaudeSkills)) {
    directories.push(homeClaudeSkills);
  }

  const projectClaudeSkills = path.join(process.cwd(), ".claude", "skills");
  if (fs.existsSync(projectClaudeSkills)) {
    directories.push(projectClaudeSkills);
  }

  const defaultSkills = path.join(process.cwd(), "skills");
  if (fs.existsSync(defaultSkills)) {
    directories.push(defaultSkills);
  }

  // If SKILLS_DIR is set, add it (it takes precedence for duplicates)
  if (process.env.SKILLS_DIR) {
    directories.push(process.env.SKILLS_DIR);
  }

  return directories;
}

/**
 * Validate and normalize a `skill_name` tool argument.
 *
 * Tool arguments arrive untyped over the wire, so the name is checked here
 * before it is ever used to build a filesystem path. Path separators are
 * rejected outright: a skill name always identifies a single directory inside
 * a configured skills directory, never a path into one.
 *
 * @param value - The raw `skill_name` argument from the tool call
 * @returns The trimmed skill name
 * @throws {Error} If the value is missing, not a string, or not a plain name
 *
 * @example
 * ```typescript
 * requireSkillName("code-reviewer"); // 'code-reviewer'
 * requireSkillName("../../etc");     // throws
 * ```
 */
export function requireSkillName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("skill_name is required and must be a non-empty string");
  }

  const skillName = value.trim();

  if (
    skillName.includes("/") ||
    skillName.includes("\\") ||
    skillName.includes("\0") ||
    skillName === "." ||
    skillName === ".."
  ) {
    throw new Error(
      `Invalid skill_name "${skillName}". A skill name is a single directory name, not a path.`
    );
  }

  return skillName;
}

/**
 * Read an optional string tool argument, rejecting wrong-typed values.
 *
 * @param value - The raw argument value
 * @param field - Argument name, used in the error message
 * @returns The string, or undefined when the argument was omitted
 * @throws {Error} If the value is present but not a string
 */
export function optionalString(
  value: unknown,
  field: string
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

/**
 * Read an optional numeric tool argument, rejecting wrong-typed values.
 *
 * @param value - The raw argument value
 * @param field - Argument name, used in the error message
 * @returns The number, or undefined when the argument was omitted
 * @throws {Error} If the value is present but not a finite number
 */
export function optionalNumber(
  value: unknown,
  field: string
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

const SKILLS_DIRS = getAllSkillsDirectories();

/**
 * Main MCP server class for serving skills to AI clients.
 *
 * LocalSkillsServer handles MCP protocol communication, manages skill discovery
 * and loading through SkillLoader, and formats responses for clients.
 *
 * @example
 * ```typescript
 * const server = new LocalSkillsServer();
 * await server.run();
 * // Server is now running and listening on stdio
 * ```
 */
export class LocalSkillsServer {
  private server: Server;
  private skillLoader: SkillLoader;

  /**
   * Creates a new LocalSkillsServer instance.
   *
   * Initializes the MCP server with capabilities, creates a SkillLoader
   * for all configured directories, and sets up request handlers.
   */
  constructor() {
    this.server = new Server(
      {
        name: "local-skills-mcp",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.skillLoader = new SkillLoader(SKILLS_DIRS);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools (dynamically generated to include current skill list)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Discover skills to get current list
      const skillNames = await this.skillLoader.discoverSkills();

      // Build enhanced description for get_skill following Claude Skills best practices
      // Pattern: [What it does]. [Value proposition]. Use when [trigger conditions].
      let getSkillDescription =
        "Loads specialized expert prompt instructions that transform your capabilities for specific tasks. " +
        "Each skill provides comprehensive guidance, proven methodologies, and domain-specific best practices. " +
        "Use when you need focused expertise, systematic approaches, or professional standards for any task that would benefit from specialized knowledge. " +
        "Invoke with the skill name to receive detailed instructions that enhance your problem-solving approach with structured, expert-level guidance.";

      // Package built-in skills ensure there are always skills available
      if (skillNames.length > 0) {
        // Fetch metadata for each skill to get descriptions
        const skillsWithDescriptions: string[] = [];
        for (const skillName of skillNames) {
          try {
            const metadata = await this.skillLoader.getSkillMetadata(skillName);
            // Truncate description if too long (max 1024 chars)
            let description = metadata.description;
            if (description.length > 1024) {
              description = description.substring(0, 1021) + "...";
            }
            skillsWithDescriptions.push(`- ${skillName}: ${description}`);
          } catch {
            // If metadata fails to load, just show the skill name
            skillsWithDescriptions.push(`- ${skillName}`);
          }
        }
        getSkillDescription += `\n\nAvailable skills:\n${skillsWithDescriptions.join("\n")}`;
      }

      const tools: Tool[] = [
        {
          name: "get_skill",
          description: getSkillDescription,
          inputSchema: {
            type: "object",
            properties: {
              skill_name: {
                type: "string",
                description:
                  'The name of the skill to retrieve (e.g., "code-reviewer", "test-generator")',
              },
            },
            required: ["skill_name"],
          },
        },
        {
          name: "validate_skill",
          description:
            "Validates a SKILL.md file against name/description/frontmatter rules and returns errors + warnings.",
          inputSchema: {
            type: "object",
            properties: {
              skill_name: {
                type: "string",
                description: "The skill directory name to validate",
              },
            },
            required: ["skill_name"],
          },
        },
        {
          name: "evaluate_skill",
          description:
            "Runs Anthropic skill-creator eval loop for a skill (requires Python, Claude CLI auth, and an eval set JSON; legacy layouts may also require ANTHROPIC_API_KEY + anthropic package).",
          inputSchema: {
            type: "object",
            properties: {
              skill_name: {
                type: "string",
                description: "The skill directory name to evaluate",
              },
              eval_set_path: {
                type: "string",
                description:
                  "Optional path to eval set JSON. If omitted, common default locations are checked.",
              },
              max_iterations: {
                type: "number",
                description: "Optional max optimization iterations",
              },
              num_workers: {
                type: "number",
                description:
                  "Optional evaluator parallel workers (defaults to 1 for stable trigger measurements)",
              },
              runs_per_query: {
                type: "number",
                description:
                  "Optional repeats per query (defaults to 1; increase for variance analysis)",
              },
              timeout_seconds: {
                type: "number",
                description:
                  "Optional timeout per query in seconds (defaults to 120)",
              },
              holdout: {
                type: "number",
                description:
                  "Optional holdout fraction for run_loop test split (defaults to 0.4, use 0 to disable holdout)",
              },
              trigger_threshold: {
                type: "number",
                description:
                  "Optional trigger-rate threshold for pass/fail decisions (defaults to 0.5)",
              },
              description_override: {
                type: "string",
                description:
                  "Optional starting description override for what-if optimization without editing SKILL.md first",
              },
              model: {
                type: "string",
                description:
                  'Optional model passed to Claude CLI (defaults to "sonnet")',
              },
            },
            required: ["skill_name"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "get_skill":
            return await this.handleGetSkill(request.params.arguments);
          case "validate_skill":
            return await this.handleValidateSkill(request.params.arguments);
          case "evaluate_skill":
            return await this.handleEvaluateSkill(request.params.arguments);

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private resolveSkillFilePath(skillName: string): string | null {
    for (let i = SKILLS_DIRS.length - 1; i >= 0; i--) {
      const baseDir = path.resolve(SKILLS_DIRS[i]);
      const skillDir = path.resolve(baseDir, skillName);

      // Only accept paths that stay strictly inside the configured directory.
      // Without this, a skill_name such as "../../etc" would let a caller
      // reach SKILL.md files outside every configured skills directory.
      if (!skillDir.startsWith(baseDir + path.sep)) {
        continue;
      }

      const candidate = path.join(skillDir, "SKILL.md");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private async handleValidateSkill(args: Record<string, unknown> | undefined) {
    const skillName = requireSkillName(args?.skill_name);

    const skillFilePath = this.resolveSkillFilePath(skillName);
    if (!skillFilePath) {
      throw new Error(`Skill "${skillName}" not found.`);
    }

    const result = await validateSkillFile(skillFilePath);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleEvaluateSkill(args: Record<string, unknown> | undefined) {
    const skillName = requireSkillName(args?.skill_name);

    const skillFilePath = this.resolveSkillFilePath(skillName);
    if (!skillFilePath) {
      throw new Error(`Skill "${skillName}" not found.`);
    }

    const result = await evaluateSkill(
      {
        skill_name: skillName,
        skill_path: path.dirname(skillFilePath),
        eval_set_path: optionalString(args?.eval_set_path, "eval_set_path"),
        max_iterations: optionalNumber(args?.max_iterations, "max_iterations"),
        num_workers: optionalNumber(args?.num_workers, "num_workers"),
        runs_per_query: optionalNumber(args?.runs_per_query, "runs_per_query"),
        timeout_seconds: optionalNumber(
          args?.timeout_seconds,
          "timeout_seconds"
        ),
        holdout: optionalNumber(args?.holdout, "holdout"),
        trigger_threshold: optionalNumber(
          args?.trigger_threshold,
          "trigger_threshold"
        ),
        description_override: optionalString(
          args?.description_override,
          "description_override"
        ),
        model: optionalString(args?.model, "model"),
      },
      REPO_ROOT
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetSkill(args: Record<string, unknown> | undefined) {
    const skillName = requireSkillName(args?.skill_name);

    const skill = await this.skillLoader.loadSkill(skillName);

    const output = [
      `# Skill: ${skill.name}`,
      ``,
      `**Description:** ${skill.description}`,
      `**Source:** ${skill.source}`,
      ``,
      `---`,
      ``,
      skill.content,
    ];

    return {
      content: [
        {
          type: "text",
          text: output.join("\n"),
        },
      ],
    };
  }

  /**
   * Starts the MCP server and connects it to stdio transport.
   *
   * This method initializes the stdio transport for MCP communication,
   * connects the server, and logs startup information including the
   * list of skill directories being monitored.
   *
   * @throws {Error} If the server fails to connect or start
   *
   * @example
   * ```typescript
   * const server = new LocalSkillsServer();
   * await server.run();
   * // Output to stderr:
   * // Local Skills MCP Server v0.1.0 running on stdio
   * // Aggregating skills from 3 directories:
   * //   - /home/user/.claude/skills
   * //   - /home/user/project/.claude/skills
   * //   - /home/user/project/skills
   * ```
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`Local Skills MCP Server v${VERSION} running on stdio`);
    console.error(
      `Aggregating skills from ${SKILLS_DIRS.length} director${SKILLS_DIRS.length === 1 ? "y" : "ies"}:`
    );
    SKILLS_DIRS.forEach((dir) => console.error(`  - ${dir}`));
  }

  /**
   * Closes the server and releases all resources.
   *
   * This method properly shuts down the MCP server and waits for all
   * file handles and resources to be released. This is particularly
   * important on Windows where file handles may take longer to release.
   *
   * @example
   * ```typescript
   * const server = new LocalSkillsServer();
   * await server.run();
   * // ... do work ...
   * await server.close();
   * ```
   */
  async close(): Promise<void> {
    await this.server.close();
    // Allow time for all handles to be released (important on Windows)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Start the server only if this module is being run directly
/* istanbul ignore if */
if (
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && __filename === fs.realpathSync(process.argv[1]))
) {
  const server = new LocalSkillsServer();
  server.run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
  });
}
