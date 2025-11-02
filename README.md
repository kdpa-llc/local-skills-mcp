<div align="center">

# 🎯 Local Skills MCP

**Enable any LLM or AI agent to utilize expert skills from your local filesystem via MCP**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/moscaverd/local-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

[Quick Start](#quick-start) •
[Features](#features) •
[Installation](#installation) •
[Documentation](#documentation) •
[Examples](#examples) •
[Contributing](CONTRIBUTING.md)

</div>

---

## What is Local Skills MCP?

A **universal** Model Context Protocol (MCP) server that enables **any LLM or AI agent** to access expert skills from your local filesystem. Using the SKILL.md format with YAML frontmatter, your skills become portable, reusable prompt libraries that work across different AI systems.

**🌐 Universal Compatibility**: Works with any MCP-compatible client—Claude Code, Claude Desktop, Cline, Continue.dev, custom agents, or any LLM integration that supports the Model Context Protocol.

**💡 The Power of Skills**: Transform any AI agent's capabilities by providing structured, expert-level prompt instructions for specialized tasks. Your skills become a knowledge base that any compatible AI can leverage on-demand.

**⚡ Efficient Context Management**: Reduces context consumption through lazy loading—only the skill names and descriptions are initially visible to the AI. Full skill content loads only when invoked, preserving precious context window space for your actual work.

## ✨ Features

### Universal LLM/Agent Support
- **🌐 Any MCP Client** - Works with Claude Code, Claude Desktop, Cline, Continue.dev, custom agents, or any MCP-compatible LLM
- **🔄 Portable Skills** - Write once, use across multiple AI systems and agents
- **🤖 LLM-Agnostic** - Skills are structured prompts that work with any language model (Claude, GPT, Gemini, local models, etc.)

### Powerful Skill Management
- **🗂️ Standard Format** - Uses SKILL.md format with YAML frontmatter for maximum compatibility
- **⚡ Lazy Loading** - Skills loaded on-demand with intelligent caching; reduces context consumption by loading full content only when invoked
- **💾 Context Efficient** - Only skill names and descriptions consume context initially; full instructions load on-demand
- **🔄 Skill Aggregation** - Automatically aggregates skills from all configured directories
- **🎯 Multi-Source** - Combines skills from ~/.claude/skills, ./.claude/skills, ./skills, and custom paths
- **🤖 Dynamic Discovery** - Tool description updates in real-time to include available skills
- **📦 Zero Config** - Works out-of-the-box with standard locations
- **✨ Ultra Simple** - Just 1 tool: get_skill (with built-in discovery)

## 🚀 Quick Start

### 1. Install

**Easiest way - Install from GitHub:**

```bash
npm install -g github:moscaverd/local-skills
```

**Or clone and build:**

```bash
git clone https://github.com/moscaverd/local-skills.git
cd local-skills
npm install
```

The `prepare` script automatically builds the project.

### 2. Configure Your MCP Client

The server works with any MCP-compatible client. Here are examples for popular clients:

#### Claude Code / Claude Desktop

Add to `~/.config/claude-code/mcp.json` (or Claude Desktop's config):

**Option A: Global Command (If installed from GitHub)**
```json
{
  "mcpServers": {
    "local-skills": {
      "command": "local-skills-mcp"
    }
  }
}
```

**Option B: Direct Path (If cloned locally)**
```json
{
  "mcpServers": {
    "local-skills": {
      "command": "node",
      "args": ["/absolute/path/to/local-skills/dist/index.js"]
    }
  }
}
```

**Option C: From Specific Install Location**
```json
{
  "mcpServers": {
    "local-skills": {
      "command": "node",
      "args": ["~/mcp-servers/local-skills/node_modules/local-skills-mcp/dist/index.js"]
    }
  }
}
```

#### Cline (VS Code Extension)

Cline is a popular VS Code extension that supports MCP servers. Add to your Cline MCP settings:

**Using VS Code Settings (Recommended):**

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Cline: MCP Settings"
3. Click "Edit in settings.json"
4. Add the server configuration:

```json
{
  "cline.mcpServers": {
    "local-skills": {
      "command": "local-skills-mcp"
    }
  }
}
```

**Or configure via Cline's settings UI:**

1. Open Cline extension
2. Go to Settings → MCP Servers
3. Add new server:
   - **Name**: local-skills
   - **Command**: `local-skills-mcp`
   - **Args**: (leave empty if using global install)

#### Other MCP-Compatible Clients

For custom agents or other MCP clients, configure according to their MCP server setup process. The command and arguments are the same:

```bash
# Command
local-skills-mcp

# Or with full path
node /path/to/local-skills-mcp/dist/index.js
```

The server automatically aggregates skills from all existing directories:
- `~/.claude/skills/` (personal, Claude compatibility)
- `./.claude/skills/` (project-local)
- `./skills` (repository/workspace)
- `$SKILLS_DIR` (custom location via environment variable)

### 3. Create a Skill

**`~/.claude/skills/my-skill/SKILL.md`**

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

You are an expert at [domain].

Your task is to [specific task].

Guidelines:
1. Be specific
2. Provide examples
3. Be helpful
```

### 4. Use It

In any MCP-compatible client, simply request a skill by name:

**Example with Claude Code:**
```
Use the code-reviewer skill to review this code
```

**Example with custom agent:**
```python
# The agent sees available skills via MCP tools
# and can invoke get_skill with the skill name
result = mcp_client.call_tool("get_skill", {"skill_name": "code-reviewer"})
```

The AI sees all available skills in the tool description automatically and retrieves the one needed for the task.

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- Claude Code or any MCP-compatible client

### Method 1: Install Directly from GitHub (Easiest)

No cloning required! Install directly from GitHub:

```bash
npm install -g github:moscaverd/local-skills
```

Then use the `local-skills-mcp` command in your MCP configuration.

**Or** install to a specific directory without global install:

```bash
npm install github:moscaverd/local-skills --prefix ~/mcp-servers/local-skills
```

Then use: `node ~/mcp-servers/local-skills/node_modules/local-skills-mcp/dist/index.js`

### Method 2: Clone and Build (For Development)

```bash
git clone https://github.com/moscaverd/local-skills.git
cd local-skills
npm install
npm run build
```

Then use the direct path in your MCP configuration (see Configuration section below).

### Method 3: Global Link (For Development)

After cloning, link it globally:

```bash
cd local-skills
npm install
npm link
```

Then you can use `local-skills-mcp` as a command in your MCP configuration.

### Development Mode

For active development:

```bash
npm run watch
```

## 🎯 Usage

### MCP Tool Available

**`get_skill`** - The only tool you need!

**What it does:**
- Loads specialized expert prompt instructions that transform Claude's capabilities for specific tasks
- Each skill provides comprehensive guidance, proven methodologies, and domain-specific best practices
- **Dynamically includes the current list of available skills in its description**

**When to use it:**
- When you need focused expertise, systematic approaches, or professional standards
- Any task that would benefit from specialized knowledge or structured guidance
- Invoke with the skill name to receive detailed, expert-level instructions

**How it works:**
1. Claude sees all available skills listed in the tool description automatically
2. When you request a skill (e.g., "use the code-reviewer skill"), Claude invokes get_skill
3. The full skill content loads with detailed instructions and best practices

That's it! Ultra simple - just one tool with built-in discovery.

#### 🌟 Intelligent Tool Descriptions

Following **Claude Skills best practices**, our tool descriptions are designed to help Claude understand:

- **What** the tool does (capability)
- **Why** it's valuable (benefit/outcome)
- **When** to use it (trigger conditions)

**Pattern**: `[What it does]. [Value proposition]. Use when [specific trigger keywords/contexts].`

This follows Anthropic's approach where Claude makes tool decisions based purely on language understanding—no embeddings or classifiers. The tool description uses generic utilization language, while the dynamic skill list provides the specific capabilities available in your environment.

**Dynamic Discovery**: The `get_skill` tool description is regenerated each time Claude queries for tools, always showing the current list of available skills. This progressive disclosure pattern ensures Claude knows what expertise is available without extra API calls.

### Skills Aggregation

The server **aggregates skills from ALL existing directories**:

1. **`~/.claude/skills/`** - Personal Claude skills
2. **`./.claude/skills/`** - Project-local skills
3. **`./skills`** - Local development skills
4. **`$SKILLS_DIR`** - Additional custom directory (if set)

Skills from later directories override duplicates from earlier ones.

### Configuration Examples

**Auto-aggregate all directories (recommended):**

If installed globally from GitHub:
```json
{
  "command": "local-skills-mcp"
}
```

If cloned locally:
```json
{
  "command": "node",
  "args": ["/absolute/path/to/local-skills/dist/index.js"]
}
```

This aggregates from ~/.claude/skills/, ./.claude/skills/, and ./skills automatically.

**Add custom directory:**

With global command:
```json
{
  "command": "local-skills-mcp",
  "env": {
    "SKILLS_DIR": "/custom/path/to/skills"
  }
}
```

With local path:
```json
{
  "command": "node",
  "args": ["/absolute/path/to/local-skills/dist/index.js"],
  "env": {
    "SKILLS_DIR": "/custom/path/to/skills"
  }
}
```

This adds your custom directory to the aggregation (along with the standard locations).

## 📝 SKILL.md Format

Every skill is a single `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description of what this skill does and when to use it
---

Your skill instructions in Markdown format...

You are an expert at [domain].

Your task is to [task].

Follow these guidelines:
1. First guideline
2. Second guideline
```

### Required Fields

- **`name`** - Skill identifier (lowercase, hyphens, max 64 chars)
- **`description`** - Critical for skill selection (max 200 chars)

### Writing Effective Descriptions

Based on **Anthropic's Claude Skills best practices**, descriptions should follow this pattern:

**Pattern**: `[What it does]. Use when [trigger conditions/keywords].`

**Best Practices**:
- ✅ Be **specific** about capabilities and outcomes
- ✅ Include **trigger keywords** users would mention (file types, task names, domains)
- ✅ Use **problem-solution framing**
- ✅ Mention **when to use it** explicitly
- ❌ Avoid vague descriptions like "helps with coding"

**Examples**:
- ✅ **Good**: "Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes."
- ✅ **Good**: "Analyze Excel spreadsheets, create pivot tables, and generate charts. Use when working with Excel files, spreadsheets, or analyzing tabular data in .xlsx format."
- ❌ **Poor**: "Helps with Excel files"

**Why This Matters**: Claude uses pure language understanding to decide when to invoke skills—no embeddings or classifiers. Clear descriptions with specific trigger keywords help Claude make better decisions.

## 📚 Examples

### Code Review Skill

```markdown
---
name: code-reviewer
description: Reviews code for best practices, potential bugs, and security issues. Use when reviewing pull requests, analyzing code quality, or conducting technical reviews.
---

You are a code reviewer with expertise in software engineering best practices.

Analyze the code for:
1. Correctness and bugs
2. Best practices
3. Performance issues
4. Security vulnerabilities
5. Maintainability

Provide specific, actionable feedback.
```

### Test Generator Skill

```markdown
---
name: test-generator
description: Generates comprehensive unit tests with edge cases and mocking. Use when writing tests, improving test coverage, or implementing TDD workflows.
---

You are a testing expert who writes high-quality unit tests.

Create tests that:
1. Cover edge cases
2. Test happy paths
3. Test error handling
4. Follow AAA pattern (Arrange, Act, Assert)

Use descriptive test names and mock dependencies.
```

## 🏗️ Project Structure

```
local-skills-mcp/
├── src/
│   ├── index.ts          # MCP server
│   ├── skill-loader.ts   # Skill loading logic
│   └── types.ts          # TypeScript types
├── skills/               # Example skills
│   ├── code-reviewer/
│   │   └── SKILL.md
│   ├── test-generator/
│   │   └── SKILL.md
│   └── ...
├── dist/                 # Compiled output
└── package.json
```

## 🤖 Why Local Skills Matter for AI Agents

### Universal Skill Library
Skills are **structured prompt instructions** that work with any LLM or AI agent. By using the MCP protocol, you create a portable skill library that:

- **Works across AI systems** - Same skills work with Claude, GPT-based agents, custom LLMs, or future AI systems
- **Centralizes expertise** - Build once, reuse everywhere - no need to recreate prompts for each AI tool
- **Enables team sharing** - Share skill directories across your team for consistent AI behavior
- **Supports multi-agent workflows** - Different agents can access the same expert knowledge
- **Preserves context** - Lazy loading means only relevant skill details consume your AI's context window

### Real-World Use Cases

**For Developers:**
- Custom coding agents that leverage your team's best practices
- CI/CD agents with access to code review and testing skills
- Development workflows with specialized skills for each stage

**For Teams:**
- Shared skill libraries across different AI tools
- Consistent expertise across multiple agents
- Version-controlled prompt management

**For Custom Agents:**
- Build specialized AI agents with curated skill sets
- Create domain-specific assistants (legal, medical, technical, etc.)
- Extend any MCP-compatible LLM with expert capabilities

### Context Window Efficiency

**The Problem**: Loading all expert prompts into an AI's context upfront wastes valuable context window space and limits what you can accomplish.

**The Solution**: Local Skills MCP uses progressive disclosure:
- **Discovery Phase**: AI sees only skill names and brief descriptions (~50 tokens per skill)
- **Invocation Phase**: Full skill instructions load only when requested
- **Result**: Preserve 95%+ of your context window for actual work instead of prompt libraries

This is especially valuable when:
- Working with long conversations or large codebases
- Using models with smaller context windows
- Managing dozens or hundreds of skills
- Running multiple agents that need different skill subsets

### The MCP Advantage

The Model Context Protocol makes this possible by providing a **standard interface** for AI tools. Any agent that speaks MCP can:
1. **Discover** available skills dynamically (minimal context usage)
2. **Load** expert instructions on-demand (only when needed)
3. **Execute** with enhanced capabilities (without context bloat)
4. **Share** skills across different AI systems (universal compatibility)

This means your investment in creating skills pays off across your entire AI ecosystem, not just one tool.

## 🆚 Differences from Built-in Skills

| Feature | Local Skills MCP | Built-in Claude Skills |
|---------|------------------|------------------------|
| **Storage** | Multiple directories aggregated | `~/.claude/skills/` only |
| **Aggregation** | Combines all skill sources | Single directory |
| **Invocation** | Explicit via MCP tool | Auto-invoked by Claude |
| **Control** | Full control over when | Claude decides when |
| **Portability** | Any MCP client | Claude Code only |
| **Context Usage** | Lazy loading (names only) | All skills in context |
| **Tools** | 1 simple tool | Built into Claude |

## 📖 Documentation

### Project Documentation
- [Quick Start Guide](./QUICK_START.md) - Get running in 5 minutes
- [Full Documentation](./README.md) - Comprehensive guide
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute
- [Code of Conduct](./CODE_OF_CONDUCT.md) - Community standards
- [Security Policy](./SECURITY.md) - Security and vulnerability reporting
- [Changelog](./CHANGELOG.md) - Version history and changes

### External Resources
- [MCP Documentation](https://modelcontextprotocol.io/) - MCP protocol info
- [Claude Skills Docs](https://docs.claude.com/en/docs/claude-code/skills) - Official skills format

## 🛠️ Troubleshooting

### Server Not Starting

```bash
# Check Node version (should be 18+)
node --version

# Rebuild
npm run build

# Check compiled output exists
ls dist/index.js
```

### Skills Not Found

```bash
# Check which directory is being used
# (shown in server startup logs)

# Verify skills directory exists
ls -la ~/.claude/skills/

# Check SKILL.md format
cat ~/.claude/skills/my-skill/SKILL.md
```

### YAML Parsing Errors

- Ensure frontmatter starts with `---\n`
- Ensure frontmatter ends with `\n---\n`
- Check YAML syntax (no tabs, proper format)
- Verify `name` and `description` fields exist

## 🤝 Contributing

Contributions are welcome! We appreciate your help in making Local Skills MCP better.

**Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.**

Quick start:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test them
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright © 2025 KDPA**

## 🙏 Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Inspired by [Claude Skills](https://docs.claude.com/en/docs/claude-code/skills)
- Uses [YAML](https://yaml.org/) for frontmatter parsing

## 📊 Version History

### v0.1.0 (First Public Release) 🎉
This is a **proof of concept** release showcasing universal LLM/agent skill management via MCP.

**Key Features:**
- Universal compatibility with any MCP client (Claude, Cline, custom agents)
- Context-efficient lazy loading (preserves 95%+ of context window)
- Single tool design with dynamic skill discovery
- Multi-directory skill aggregation
- Zero-configuration setup
- Complete open source best practices

**Technical:**
- Version centralized in package.json (single source of truth)
- TypeScript with Node.js 18+
- Standard SKILL.md format with YAML frontmatter

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

<div align="center">

**[⬆ Back to Top](#-local-skills-mcp)**

Made with ❤️ by KDPA

</div>
