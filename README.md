<div align="center">

# 🎯 Local Skills MCP

**Enable any LLM or AI agent to utilize expert skills from your local filesystem via MCP**

[![npm version][npm-version-badge]][npm-package]
[![npm downloads][npm-downloads-badge]][npm-package]
[![npm types][npm-types-badge]][npm-package]
[![License: MIT][license-badge]][license]
[![Node][node-badge]][nodejs]
[![MCP][mcp-badge]][mcp-protocol]

[![CI][ci-badge]][ci-workflow]
[![codecov][codecov-badge]][codecov]
[![CodeQL][codeql-badge]][codeql-workflow]

[![GitHub Stars][stars-badge]][stargazers]
[![GitHub Forks][forks-badge]][network]
[![GitHub Issues][issues-badge]][repo-issues]
[![GitHub Last Commit][commit-badge]][commits]
[![PRs Welcome][prs-badge]][contributing]

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
- [❓ FAQ](#-faq)
- [🤝 Contributing](#-contributing)

---

## What is Local Skills MCP?

A **universal** Model Context Protocol (MCP) server that enables **any LLM or AI agent** to access expert skills from your local filesystem. Write skills once, use them across Claude Code, Claude Desktop, Cline, Continue.dev, custom agents, or any MCP-compatible client.

Transform AI capabilities with structured, expert-level instructions for specialized tasks. Context-efficient lazy loading—only skill names/descriptions load initially (~50 tokens/skill), full content on-demand.

### 🆚 Why Use Local Skills MCP?

| Feature           | Local Skills MCP                | Built-in Claude Skills   |
| ----------------- | ------------------------------- | ------------------------ |
| **Portability**   | Any MCP client                  | Claude Code only         |
| **Storage**       | Multiple directories aggregated | `~/.claude/skills/` only |
| **Invocation**    | Explicit via MCP tool           | Auto-invoked by Claude   |
| **Context Usage** | Lazy loading (names only)       | All skills in context    |

## ✨ Features

- **🌐 Universal** - Works with any MCP client (Claude Code/Desktop, Cline, Continue.dev, custom agents)
- **🔄 Portable** - Write once, use across multiple AI systems and LLMs (Claude, GPT, Gemini, Ollama, etc.)
- **⚡ Context Efficient** - Lazy loading (~50 tokens/skill for names/descriptions, full content loads on-demand)
- **🔥 Hot Reload** - Changes apply instantly without restart (new skills, edits, deletions)
- **🎯 Multi-Source** - Auto-aggregates from built-in skills, `~/.claude/skills`, `./.claude/skills`, `./skills`, custom paths
- **📦 Zero Config** - Works out-of-the-box with standard locations
- **✨ Simple API** - Single tool (`get_skill`) with dynamic discovery

## 🚀 Quick Start

### 1. Install

**Requirements:** Node.js 18+

Choose one installation method:

```bash
# From npm (recommended)
npm install -g local-skills-mcp

# From GitHub
npm install -g github:kdpa-llc/local-skills-mcp

# Or clone and build locally
git clone https://github.com/kdpa-llc/local-skills-mcp.git
cd local-skills-mcp
npm install  # Automatically builds via prepare script
```

### 2. Configure MCP Client

Add to your MCP client configuration:

**For Claude Code/Desktop** (`~/.config/claude-code/mcp.json` or `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "local-skills": {
      "command": "local-skills-mcp"
    }
  }
}
```

**For Cline:** VS Code Settings → "Cline: MCP Settings" (same JSON structure)

**For other MCP clients:** Use the same command/args structure

**If cloned locally** (not installed globally), use:

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

**Skill Discovery:**

The server auto-aggregates skills from multiple directories (priority: low to high):

1. Package built-in skills (self-documenting guides)
2. `~/.claude/skills/` - Global skills
3. `./.claude/skills/` - Project-specific (hidden)
4. `./skills` - Project-specific (visible)
5. `$SKILLS_DIR` - Custom path (if env var set)

Later directories override earlier ones, letting you customize built-in skills.

### 3. Create & Use Skills

**Create Skills (Option 1: Ask AI - Recommended)**

Simply ask your AI to create skills:

```
"Create a Python expert skill for clean, idiomatic code"
"Make a PR review skill focusing on security and best practices"
```

The AI uses the built-in `skill-creator` skill to generate well-structured skills with proper YAML frontmatter and trigger keywords.

**Create Skills (Option 2: Manual)**

Create `~/.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

You are an expert at [domain]. Your task is to [specific task].

Guidelines:
1. Be specific and actionable
2. Provide examples
3. Include best practices
```

**Use Skills**

Request any skill: `"Use the my-skill skill"`

Skills are auto-discovered and load on-demand. **All changes apply instantly** with hot reload—no restart needed!

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

Use pattern: `[What it does]. Use when [trigger conditions/keywords].`

✅ **Good Examples:**
- "Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes."
- "Analyzes Excel spreadsheets and creates pivot tables. Use when working with .xlsx files or tabular data."

❌ **Poor Example:**
- "Helps with Excel files"

Specific trigger keywords help the AI make better decisions when selecting skills.

## 🎯 Usage

**How It Works:**

1. AI sees all available skill names/descriptions (auto-updated, ~50 tokens each)
2. When you request a skill, AI invokes the `get_skill` tool
3. Full skill content loads on-demand with detailed instructions

**Built-in Skills:**

Three self-documenting skills are included:
- `local-skills-mcp-usage` - Quick usage guide
- `local-skills-mcp-guide` - Comprehensive documentation
- `skill-creator` - Skill authoring best practices

**Skill Directories:**

Auto-aggregates from multiple locations (later ones override earlier):
1. Package built-in skills
2. `~/.claude/skills/` - Global skills
3. `./.claude/skills/` - Project-specific (hidden)
4. `./skills` - Project-specific (visible)
5. `$SKILLS_DIR` - Custom path (optional)

**Custom Directory:**

Configure via environment variable in your MCP client config:

```json
{
  "mcpServers": {
    "local-skills": {
      "command": "local-skills-mcp",
      "env": {
        "SKILLS_DIR": "/custom/path/to/skills"
      }
    }
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
2. Best practices and maintainability
3. Performance and security issues

Provide specific, actionable feedback with examples.
```

## ❓ FAQ

<details>
<summary><strong>Q: What MCP clients are supported?</strong></summary>
<p>Any MCP-compatible client: Claude Code, Claude Desktop, Cline, Continue.dev, or custom agents.</p>
</details>

<details>
<summary><strong>Q: Can I use existing Claude skills from ~/.claude/skills/?</strong></summary>
<p>Yes! The server automatically aggregates skills from <code>~/.claude/skills/</code> along with other directories.</p>
</details>

<details>
<summary><strong>Q: Do I need to restart after adding or editing skills?</strong></summary>
<p>No! Hot reload is fully supported. All changes (new skills, edits, deletions) apply instantly without restarting the MCP server.</p>
</details>

<details>
<summary><strong>Q: How do I override a built-in skill?</strong></summary>
<p>Create a skill with the same name in a higher-priority directory. Priority order: package built-in → <code>~/.claude/skills</code> → <code>./.claude/skills</code> → <code>./skills</code> → <code>$SKILLS_DIR</code>.</p>
</details>

<details>
<summary><strong>Q: Does this work with local LLMs (Ollama, LM Studio)?</strong></summary>
<p>Yes! Works with any MCP-compatible client and LLM. Skills are structured prompts that work with any model.</p>
</details>

<details>
<summary><strong>Q: Does this work offline?</strong></summary>
<p>Yes! The MCP server runs entirely on your local filesystem (though your LLM may require internet depending on the provider).</p>
</details>

<details>
<summary><strong>Q: How do I create effective skills?</strong></summary>
<p>See the <a href="#-skillmd-format">SKILL.md format section</a>. Use clear descriptions with trigger keywords, specific instructions, and examples. Or ask your AI to create skills using the built-in <code>skill-creator</code> skill.</p>
</details>

<details>
<summary><strong>Q: Where can I get help?</strong></summary>
<p>Open an <a href="https://github.com/kdpa-llc/local-skills-mcp/issues">issue on GitHub</a> or check the built-in <code>local-skills-mcp-guide</code> skill.</p>
</details>

**More:** See [CONTRIBUTING.md][contributing], [SECURITY.md][security], [CHANGELOG.md][changelog]

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md][contributing] for detailed guidelines.

**Quick start:**

1. Fork and clone the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and add tests
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. Open a Pull Request

This project follows a [Code of Conduct][code-of-conduct].

## 🔗 Complementary Projects

**Optimize your MCP setup with these complementary tools:**

### [MCP Compression Proxy][mcp-tool-aggregator]

**Aggregate and compress tool descriptions from multiple MCP servers**

While Local Skills MCP provides expert prompt instructions, [MCP Compression Proxy][mcp-tool-aggregator] optimizes your tool descriptions with intelligent LLM-based compression.

**Perfect combination:**
- **Local Skills MCP** - Expert skills with lazy loading (~50 tokens/skill)
- **MCP Compression Proxy** - Compressed tool descriptions (50-80% token reduction)

**Together they enable:**
- 🎯 Maximum context efficiency across skills AND tools
- 🔗 Access to multiple MCP servers through one connection
- ⚡ Minimal token consumption for large-scale workflows
- 🚀 Professional AI agent setups with hundreds of tools

[Learn more about MCP Compression Proxy →][mcp-tool-aggregator]

## 💖 Support This Project

If you find Local Skills MCP useful, please consider supporting its development!

<div align="center">

[![GitHub Sponsors][sponsor-github-badge]][sponsor-github]
[![Buy Me A Coffee][sponsor-coffee-badge]][sponsor-coffee]
[![PayPal][sponsor-paypal-badge]][sponsor-paypal]

</div>

**Ways to support:**

- ⭐ [Star this repository][stargazers]
- 💰 Sponsor via the badges above
- 🐛 [Report bugs and suggest features][repo-issues]
- 📝 [Contribute code or documentation][contributing]

## 📄 License

MIT License - see [LICENSE][license-file] file. **Copyright © 2025 KDPA**

## 🙏 Acknowledgments

Built with [Model Context Protocol SDK][mcp-sdk] • Inspired by [Claude Skills][claude-skills]

---

<div align="center">

**[⬆ Back to Top](#-local-skills-mcp)**

Made with ❤️ by KDPA

</div>

<!-- Reference Links -->
<!-- Badges - Top of README -->

[npm-version-badge]: https://img.shields.io/npm/v/local-skills-mcp.svg
[npm-package]: https://www.npmjs.com/package/local-skills-mcp
[npm-downloads-badge]: https://img.shields.io/npm/dm/local-skills-mcp
[npm-types-badge]: https://img.shields.io/npm/types/local-skills-mcp
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license]: https://opensource.org/licenses/MIT
[node-badge]: https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg
[nodejs]: https://nodejs.org/
[mcp-badge]: https://img.shields.io/badge/MCP-Compatible-purple.svg
[mcp-protocol]: https://modelcontextprotocol.io/

<!-- CI/CD Badges -->

[ci-badge]: https://github.com/kdpa-llc/local-skills-mcp/actions/workflows/ci.yml/badge.svg
[ci-workflow]: https://github.com/kdpa-llc/local-skills-mcp/actions/workflows/ci.yml
[codecov-badge]: https://codecov.io/gh/kdpa-llc/local-skills-mcp/branch/main/graph/badge.svg
[codecov]: https://codecov.io/gh/kdpa-llc/local-skills-mcp
[codeql-badge]: https://github.com/kdpa-llc/local-skills-mcp/actions/workflows/codeql.yml/badge.svg
[codeql-workflow]: https://github.com/kdpa-llc/local-skills-mcp/actions/workflows/codeql.yml

<!-- GitHub Badges -->

[stars-badge]: https://img.shields.io/github/stars/kdpa-llc/local-skills-mcp?style=social
[stargazers]: https://github.com/kdpa-llc/local-skills-mcp/stargazers
[forks-badge]: https://img.shields.io/github/forks/kdpa-llc/local-skills-mcp?style=social
[network]: https://github.com/kdpa-llc/local-skills-mcp/network/members
[issues-badge]: https://img.shields.io/github/issues/kdpa-llc/local-skills-mcp
[repo-issues]: https://github.com/kdpa-llc/local-skills-mcp/issues
[commit-badge]: https://img.shields.io/github/last-commit/kdpa-llc/local-skills-mcp
[commits]: https://github.com/kdpa-llc/local-skills-mcp/commits/main
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg

<!-- Repository Links -->

[repo]: https://github.com/kdpa-llc/local-skills-mcp
[pulls]: https://github.com/kdpa-llc/local-skills-mcp/pulls

<!-- Documentation Links -->

[contributing]: CONTRIBUTING.md
[security]: SECURITY.md
[changelog]: CHANGELOG.md
[code-of-conduct]: CODE_OF_CONDUCT.md
[license-file]: LICENSE

<!-- Sponsorship Links -->

[sponsor-github-badge]: https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa?logo=github
[sponsor-github]: https://github.com/sponsors/moscaverd
[sponsor-coffee-badge]: https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buy-me-a-coffee
[sponsor-coffee]: https://buymeacoffee.com/moscaverd
[sponsor-paypal-badge]: https://img.shields.io/badge/PayPal-donate-blue?logo=paypal
[sponsor-paypal]: https://paypal.me/moscaverd

<!-- External Links -->

[mcp-sdk]: https://github.com/modelcontextprotocol/sdk
[claude-skills]: https://docs.claude.com/en/docs/claude-code/skills
[mcp-tool-aggregator]: https://github.com/kdpa-llc/mcp-compression-proxy
