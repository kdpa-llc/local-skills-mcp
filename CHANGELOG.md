# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-01

### 🎉 First Public Release

This is the initial public release of Local Skills MCP - a proof of concept for enabling any LLM or AI agent to utilize expert skills via the Model Context Protocol.

### Features

#### Universal LLM/Agent Support
- Works with any MCP-compatible client (Claude Code, Claude Desktop, Cline, Continue.dev, custom agents)
- Portable skills that work across multiple AI systems
- LLM-agnostic design (Claude, GPT, Gemini, local models, etc.)

#### Efficient Context Management
- Lazy loading: only skill names and descriptions initially visible (~50 tokens per skill)
- Full content loads on-demand, preserving 95%+ of context window
- Progressive disclosure pattern optimized for context efficiency

#### Powerful Skill Management
- Standard SKILL.md format with YAML frontmatter
- Automatic aggregation from multiple directories (~/.claude/skills, ./.claude/skills, ./skills, custom)
- Dynamic discovery: tool description updates in real-time with available skills
- Zero configuration: works out-of-the-box with standard locations
- Ultra-simple API: single `get_skill` tool with built-in discovery

#### Open Source Best Practices
- Comprehensive contribution guidelines (CONTRIBUTING.md)
- Code of Conduct (Contributor Covenant v2.0)
- Security policy and vulnerability reporting (SECURITY.md)
- Complete documentation and examples
- GitHub issue and PR templates
- MIT License

### Technical Implementation
- TypeScript with Node.js 18+
- Model Context Protocol SDK integration
- Version centralized in package.json (single source of truth)
- Intelligent caching and lazy loading
- Multi-directory skill aggregation with override support

---

## Pre-Release Development History

The following versions were internal development iterations before the public release:

### [Internal 2.2.0] - 2025-11-01
- Simplified to single tool (removed list_skills)
- Generic, utilization-focused tool descriptions
- Dynamic skill list in get_skill description

### [Internal 2.1.0] - 2025-11-01
- Enhanced tool descriptions following Claude Skills best practices
- Added comprehensive documentation on skill description patterns
- Improved trigger keyword matching

### [Internal 2.0.0] - 2025-10-30
- Changed to official Claude Skills format (SKILL.md)
- Added multi-directory skill aggregation
- Removed custom skill.json format

### [Internal 1.0.0] - 2025-10-29
- Initial prototype with custom format
- Four MCP tools with parameter interpolation

---

[0.1.0]: https://github.com/moscaverd/local-skills/releases/tag/v0.1.0
