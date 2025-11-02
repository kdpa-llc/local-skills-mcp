# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Skills MCP is a Model Context Protocol (MCP) server that enables any LLM or AI agent to access expert skills from the local filesystem. It works with Claude Code, Claude Desktop, Cline, Continue.dev, and any MCP-compatible client.

**Key value proposition:** Lazy loading preserves context—only skill names and descriptions load initially (~50 tokens/skill), full content loads on-demand.

## Build & Development Commands

### Build
```bash
npm run build          # Compile TypeScript to dist/
npm run watch          # Watch mode for development
```

The `prepare` script automatically runs `npm run build` on install.

### Testing the Server
```bash
# Test global installation
npm install -g .
local-skills-mcp

# Test local build
node dist/index.js

# Test via MCP client
# Add to ~/.config/claude-code/mcp.json and restart Claude Code
```

### Package Testing
```bash
npm pack              # Create tarball for testing npm installation
```

## Architecture

### Core Components

**src/index.ts** (Main MCP Server)
- `LocalSkillsServer` class orchestrates the MCP server lifecycle
- `getAllSkillsDirectories()` aggregates skill directories from multiple sources in priority order:
  1. `~/.claude/skills/` (home directory)
  2. `./.claude/skills/` (project-local)
  3. `./skills` (default)
  4. `$SKILLS_DIR` (custom environment variable)
- Later directories override earlier ones for duplicate skill names
- Single tool: `get_skill` dynamically lists available skills in its description
- Tool description auto-updates with current skill list on each `ListTools` request

**src/skill-loader.ts** (Skill Discovery & Loading)
- `SkillLoader` class handles skill discovery, parsing, and caching
- `discoverSkills()` scans all configured directories and builds registry
- `loadSkill()` implements lazy loading with in-memory caching
- `parseSkillFile()` parses SKILL.md files with YAML frontmatter
- Skill registry maps skill names to their filesystem locations and source directories

**src/types.ts** (Type Definitions)
- `SkillMetadata`: Required frontmatter fields (name, description)
- `Skill`: Full skill object including content, path, and source directory

### SKILL.md File Format

Every skill must be a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description. Use when [trigger keywords].
---

Skill instructions in Markdown...
```

**Required fields:**
- `name`: Skill identifier (lowercase, hyphens, max 64 chars)
- `description`: What it does + when to use it (max 200 chars, should include trigger keywords)

**Best practice:** Description pattern is `[What it does]. Use when [trigger conditions/keywords].`

### Directory Aggregation Strategy

The server aggregates skills from multiple directories to support:
- System-wide skills (`~/.claude/skills/`)
- Project-specific skills (`./.claude/skills/`, `./skills`)
- Custom skill libraries (`$SKILLS_DIR`)

When duplicate skill names exist across directories, later directories in the list override earlier ones. This allows project-specific skills to override global ones.

### MCP Protocol Flow

1. **ListTools request** → Server discovers skills, builds dynamic tool description with available skill names
2. **CallTool (get_skill)** → Server loads skill from filesystem (or cache), returns formatted content
3. **Lazy loading** → Only metadata visible in tool description; full content loads when requested

## Development Notes

### TypeScript Configuration
- Target: ES2022
- Module: Node16 (ES modules with .js extensions)
- Output: `dist/` directory
- Strict mode enabled

### ES Modules
This project uses ES modules. All imports must include `.js` extensions (even when importing `.ts` files) because TypeScript preserves import paths as-is for Node16 module resolution.

### Binary Executable
The `dist/index.js` file has a shebang (`#!/usr/bin/env node`) and is configured as the binary in package.json. This allows the package to be installed globally and invoked as `local-skills-mcp`.

### Error Handling
- Missing skill directories are silently ignored (logs to stderr but continues)
- Skill parsing errors throw with descriptive messages
- MCP server errors are caught and returned as tool error responses

### Performance Considerations
- Skills are discovered once per `ListTools` request (not cached between requests)
- Individual skills are cached in memory after first load
- Registry rebuild is fast (filesystem directory listing only, no file reads)

## MCP Configuration Examples

The repository includes example configurations for reference but should not be modified:
- `mcp-config-example.json`: Basic configuration with custom SKILLS_DIR
- `mcp-config-auto-detect.json`: Minimal auto-detection configuration
