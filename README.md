<div align="center">

# 🎯 Local Skills MCP

**Enable any LLM or AI agent to utilize expert skills from your local filesystem via MCP**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/moscaverd/local-skills-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

[![GitHub Stars](https://img.shields.io/github/stars/moscaverd/local-skills-mcp?style=social)](https://github.com/moscaverd/local-skills-mcp/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/moscaverd/local-skills-mcp?style=social)](https://github.com/moscaverd/local-skills-mcp/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/moscaverd/local-skills-mcp)](https://github.com/moscaverd/local-skills-mcp/issues)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/moscaverd/local-skills-mcp)](https://github.com/moscaverd/local-skills-mcp/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Quick Start](#-quick-start) •
[Features](#-features) •
[Usage](#-usage) •
[FAQ](#-faq) •
[Contributing](#-contributing)

</div>

---

## 📑 Table of Contents

- [What is Local Skills MCP?](#what-is-local-skills-mcp)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📝 SKILL.md Format](#-skillmd-format)
- [🎯 Usage](#-usage)
- [🆚 Differences from Built-in Skills](#-differences-from-built-in-skills)
- [❓ FAQ](#-faq)
- [🤝 Contributing](#-contributing)

---

## What is Local Skills MCP?

A **universal** Model Context Protocol (MCP) server that enables **any LLM or AI agent** to access expert skills from your local filesystem. Your skills become portable, reusable prompt libraries that work across Claude Code, Claude Desktop, Cline, Continue.dev, custom agents, or any MCP-compatible client.

Transform AI capabilities with structured, expert-level instructions for specialized tasks. Lazy loading preserves context—only skill names and descriptions load initially; full content loads on-demand.

## ✨ Features

- **🌐 Universal** - Works with any MCP client (Claude Code, Desktop, Cline, Continue.dev, custom agents)
- **🔄 Portable** - Write once, use across multiple AI systems and LLMs (Claude, GPT, Gemini, local models)
- **⚡ Context Efficient** - Lazy loading: only skill names/descriptions load initially (~50 tokens/skill), full content on-demand
- **🎯 Multi-Source** - Auto-aggregates from `~/.claude/skills`, `./.claude/skills`, `./skills`, and custom paths
- **📦 Zero Config** - Works out-of-the-box with standard skill locations
- **✨ Ultra Simple** - Single tool (`get_skill`) with dynamic skill discovery

## 🚀 Quick Start

### Install

**From GitHub (recommended):**
```bash
npm install -g github:moscaverd/local-skills-mcp
```

**Or clone locally:**
```bash
git clone https://github.com/moscaverd/local-skills-mcp.git
cd local-skills-mcp
npm install  # The prepare script auto-builds
```

**Requirements:** Node.js 18+, any MCP-compatible client

### Configure MCP Client

Add to your MCP client configuration (e.g., `~/.config/claude-code/mcp.json`):

**If installed globally:**
```json
{
  "mcpServers": {
    "local-skills": {
      "command": "local-skills-mcp"
    }
  }
}
```

**If cloned locally:**
```json
{
  "mcpServers": {
    "local-skills": {
      "command": "node",
      "args": ["/absolute/path/to/local-skills-mcp/dist/index.js"]
    }
  }
}
```

**For Cline:** Same config in VS Code Settings → "Cline: MCP Settings"

**For other MCP clients:** Use the same command/args structure according to their MCP server setup.

The server auto-aggregates from: `~/.claude/skills/`, `./.claude/skills/`, `./skills`, and `$SKILLS_DIR` (if set).

### Create & Use Skills

Create `~/.claude/skills/my-skill/SKILL.md`:
```markdown
---
name: my-skill
description: What this skill does and when to use it
---

You are an expert at [domain]. Your task is to [specific task].

Guidelines:
1. Be specific
2. Provide examples
3. Be helpful
```

Then request it in your AI client: `"Use the my-skill skill"`

The AI auto-discovers available skills and loads them on-demand.

## 📝 SKILL.md Format

Every skill is a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description of what this skill does and when to use it
---

Your skill instructions in Markdown format...
```

**Required Fields:**
- `name` - Skill identifier (lowercase, hyphens, max 64 chars)
- `description` - Critical for skill selection (max 200 chars)

**Writing Effective Descriptions:**

Pattern: `[What it does]. Use when [trigger conditions/keywords].`

- ✅ **Good**: "Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes."
- ✅ **Good**: "Analyze Excel spreadsheets and create pivot tables. Use when working with .xlsx files or tabular data."
- ❌ **Poor**: "Helps with Excel files"

Claude uses language understanding to decide when to invoke skills—specific trigger keywords help Claude make better decisions.

## 🎯 Usage

**Single Tool:** `get_skill` - loads expert prompt instructions for specific tasks

**How it works:**
1. AI sees all available skills in the tool description (auto-updated)
2. When you request a skill, AI invokes `get_skill`
3. Full skill content loads with detailed instructions

**Skill Aggregation:** Auto-aggregates from `~/.claude/skills/`, `./.claude/skills/`, `./skills`, and `$SKILLS_DIR` (if set). Later directories override duplicates.

**Custom Directory:** Add via environment variable:
```json
{
  "command": "local-skills-mcp",
  "env": {
    "SKILLS_DIR": "/custom/path/to/skills"
  }
}
```

**Example Skill:**
```markdown
---
name: code-reviewer
description: Reviews code for best practices, bugs, and security. Use when reviewing PRs or analyzing code quality.
---

You are a code reviewer with expertise in software engineering best practices.

Analyze the code for:
1. Correctness and bugs
2. Best practices
3. Performance and security issues
4. Maintainability

Provide specific, actionable feedback.
```

## 🆚 Differences from Built-in Skills

| Feature | Local Skills MCP | Built-in Claude Skills |
|---------|------------------|------------------------|
| **Portability** | Any MCP client | Claude Code only |
| **Storage** | Multiple directories aggregated | `~/.claude/skills/` only |
| **Invocation** | Explicit via MCP tool | Auto-invoked by Claude |
| **Context Usage** | Lazy loading (names only) | All skills in context |

## ❓ FAQ

**Q: What MCP clients are supported?**
A: Any MCP-compatible client: Claude Code, Claude Desktop, Cline, Continue.dev, or custom agents.

**Q: How is this different from Claude's built-in skills?**
A: Works with any MCP client (not just Claude), aggregates from multiple directories, explicit invocation control, and better context efficiency via lazy loading.

**Q: Can I use existing Claude skills?**
A: Yes! Auto-aggregates from `~/.claude/skills/` along with other directories.

**Q: Do I need to restart after adding skills?**
A: Yes, currently requires restart. Hot reloading planned for future releases.

**Q: How much context does this consume?**
A: Minimal! Only names/descriptions initially (~50 tokens/skill). Full content loads on-demand, preserving 95%+ of context.

**Q: Can I use multiple skill directories?**
A: Yes! Auto-aggregates from `~/.claude/skills/`, `./.claude/skills/`, `./skills`, and `$SKILLS_DIR`.

**Q: What if I have duplicate skill names?**
A: Later directories override earlier ones: `~/.claude/skills` → `./.claude/skills` → `./skills` → `$SKILLS_DIR`.

**Q: Works with local LLMs (Ollama, LM Studio)?**
A: Yes! Works with any MCP-compatible LLM setup. Skills are structured prompts that work with any model.

**Q: Works offline?**
A: Yes! Runs entirely on local filesystem (though your LLM may need internet depending on the model).

**Q: How to create a good skill?**
A: Follow [SKILL.md format](#-skillmd-format). Use clear descriptions with trigger keywords, specific instructions, and examples.

**Q: Where can I get help?**
A: Open an [issue on GitHub](https://github.com/moscaverd/local-skills-mcp/issues).

**More:** See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CHANGELOG.md](CHANGELOG.md)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Quick start:
1. Fork the repository
2. Create your feature branch
3. Make your changes and test
4. Commit and push
5. Open a Pull Request

Note: This project follows a [Code of Conduct](CODE_OF_CONDUCT.md).

## 💖 Support This Project

If you find Local Skills MCP useful, please consider supporting its development!

<div align="center">

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa?logo=github)](https://github.com/sponsors/moscaverd)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/moscaverd)
[![PayPal](https://img.shields.io/badge/PayPal-donate-blue?logo=paypal)](https://paypal.me/moscaverd)

</div>

**Ways to support:**
- ⭐ Star this repository
- 💰 Sponsor via the badges above
- 🐛 Report bugs and suggest features
- 📝 Contribute code or documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file. **Copyright © 2025 KDPA**

## 🙏 Acknowledgments

Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) • Inspired by [Claude Skills](https://docs.claude.com/en/docs/claude-code/skills)

---

<div align="center">

**[⬆ Back to Top](#-local-skills-mcp)**

Made with ❤️ by KDPA

</div>
