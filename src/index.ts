#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { SkillLoader } from './skill-loader.js';

// Get version from package.json (single source of truth)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

/**
 * Get all skills directories to aggregate from
 * Includes custom SKILLS_DIR if set, plus standard Claude locations
 */
function getAllSkillsDirectories(): string[] {
  const directories: string[] = [];

  // Always include standard Claude locations if they exist
  const homeClaudeSkills = path.join(os.homedir(), '.claude', 'skills');
  if (fs.existsSync(homeClaudeSkills)) {
    directories.push(homeClaudeSkills);
  }

  const projectClaudeSkills = path.join(process.cwd(), '.claude', 'skills');
  if (fs.existsSync(projectClaudeSkills)) {
    directories.push(projectClaudeSkills);
  }

  const defaultSkills = path.join(process.cwd(), 'skills');
  if (fs.existsSync(defaultSkills)) {
    directories.push(defaultSkills);
  }

  // If SKILLS_DIR is set, add it (it takes precedence for duplicates)
  if (process.env.SKILLS_DIR) {
    directories.push(process.env.SKILLS_DIR);
  }

  // If no directories found, at least return the default
  if (directories.length === 0) {
    directories.push(defaultSkills);
  }

  return directories;
}

const SKILLS_DIRS = getAllSkillsDirectories();

class LocalSkillsServer {
  private server: Server;
  private skillLoader: SkillLoader;

  constructor() {
    this.server = new Server(
      {
        name: 'local-skills-mcp',
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
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
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
        'Loads specialized expert prompt instructions that transform your capabilities for specific tasks. ' +
        'Each skill provides comprehensive guidance, proven methodologies, and domain-specific best practices. ' +
        'Use when you need focused expertise, systematic approaches, or professional standards for any task that would benefit from specialized knowledge. ' +
        'Invoke with the skill name to receive detailed instructions that enhance your problem-solving approach with structured, expert-level guidance.';

      if (skillNames.length > 0) {
        getSkillDescription += `\n\nAvailable skills: ${skillNames.join(', ')}`;
      } else {
        getSkillDescription += '\n\nNo skills currently available. Check configured directories: ' + SKILLS_DIRS.join(', ');
      }

      const tools: Tool[] = [
        {
          name: 'get_skill',
          description: getSkillDescription,
          inputSchema: {
            type: 'object',
            properties: {
              skill_name: {
                type: 'string',
                description: 'The name of the skill to retrieve (e.g., "code-reviewer", "test-generator")',
              },
            },
            required: ['skill_name'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'get_skill':
            return await this.handleGetSkill(request.params.arguments);

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleGetSkill(args: any) {
    const skillName = args?.skill_name;
    if (!skillName) {
      throw new Error('skill_name is required');
    }

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
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`Local Skills MCP Server v${VERSION} running on stdio`);
    console.error(`Aggregating skills from ${SKILLS_DIRS.length} director${SKILLS_DIRS.length === 1 ? 'y' : 'ies'}:`);
    SKILLS_DIRS.forEach(dir => console.error(`  - ${dir}`));
  }
}

// Start the server
const server = new LocalSkillsServer();
server.run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
