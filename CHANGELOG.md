# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.0 (2026-08-20)

- feat!: signal the Node.js 22 requirement and make "!" mark a breaking change ([599a0fd](https://github.com/kdpa-llc/local-skills-mcp/commit/599a0fd)), closes [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98)
- feat!: signal the Node.js 22 requirement and make "!" mark a breaking change (#106) ([f10dc86](https://github.com/kdpa-llc/local-skills-mcp/commit/f10dc86)), closes [#106](https://github.com/kdpa-llc/local-skills-mcp/issues/106) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98)

### BREAKING CHANGE

- Node.js 18 and 20 are not supported. The minimum runtime is
  Node.js 22. This shipped in 0.5.0 but was released as a minor version by
  mistake; 1.0.0 states it correctly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015oP5dZ2WxDSSSpMoRtbASi

- signal the Node.js 22 requirement and make "!" mark a breaking change (#106)

## 0.5.0 (2026-08-20)

- fix: align evaluate_skill with anthropics run loop ([83f1357](https://github.com/kdpa-llc/local-skills-mcp/commit/83f1357))
- fix: correct anthropics skills submodule url ([0c5cb51](https://github.com/kdpa-llc/local-skills-mcp/commit/0c5cb51))
- fix: cross-platform test paths and insecure temp file usage ([12de1a8](https://github.com/kdpa-llc/local-skills-mcp/commit/12de1a8))
- fix: exclude vendored submodule from prettier ([bbf3823](https://github.com/kdpa-llc/local-skills-mcp/commit/bbf3823)), closes [#95](https://github.com/kdpa-llc/local-skills-mcp/issues/95)
- fix: re-add @semantic-release/git plugin and sync version to 0.4.4 ([5abe4ea](https://github.com/kdpa-llc/local-skills-mcp/commit/5abe4ea))
- fix: re-pin anthropic-skills submodule to an existing commit ([9d5ce79](https://github.com/kdpa-llc/local-skills-mcp/commit/9d5ce79)), closes [#95](https://github.com/kdpa-llc/local-skills-mcp/issues/95)
- fix: re-pin dead anthropic-skills submodule, unblocking clones and Dependabot (#96) ([39d37f6](https://github.com/kdpa-llc/local-skills-mcp/commit/39d37f6)), closes [#96](https://github.com/kdpa-llc/local-skills-mcp/issues/96)
- fix: reject skill-name path traversal and resolve skills lazily ([9bfd144](https://github.com/kdpa-llc/local-skills-mcp/commit/9bfd144))
- fix: reliable eval mechanism and sharper skill descriptions ([c7e1c6f](https://github.com/kdpa-llc/local-skills-mcp/commit/c7e1c6f))
- fix: restore curated eval sets and separate them from run artifacts ([5ba769f](https://github.com/kdpa-llc/local-skills-mcp/commit/5ba769f)), closes [#94](https://github.com/kdpa-llc/local-skills-mcp/issues/94)
- fix: return the skill name that round-trips and confine lookups to the registry ([64fd43e](https://github.com/kdpa-llc/local-skills-mcp/commit/64fd43e))
- fix: skill_name traversal, get_skill name round-trip, and repo health (#95) ([ad21e60](https://github.com/kdpa-llc/local-skills-mcp/commit/ad21e60)), closes [#95](https://github.com/kdpa-llc/local-skills-mcp/issues/95)
- fix: support claude oauth auth for evaluate_skill ([da03639](https://github.com/kdpa-llc/local-skills-mcp/commit/da03639))
- fix: update prettier formatting for CI compatibility ([3798aaf](https://github.com/kdpa-llc/local-skills-mcp/commit/3798aaf))
- fix: use path.join in test assertions for Windows compatibility ([97e319e](https://github.com/kdpa-llc/local-skills-mcp/commit/97e319e))
- fix: use RELEASE_TOKEN to bypass repository rulesets ([f0a6ab9](https://github.com/kdpa-llc/local-skills-mcp/commit/f0a6ab9))
- fix: use RELEASE_TOKEN to bypass repository rulesets (#57) ([c6f9d41](https://github.com/kdpa-llc/local-skills-mcp/commit/c6f9d41)), closes [#57](https://github.com/kdpa-llc/local-skills-mcp/issues/57)
- fix(deps-dev): upgrade eslint to 10, lint-staged to 17, commitlint to 21 ([a225665](https://github.com/kdpa-llc/local-skills-mcp/commit/a225665))
- fix(deps-dev): upgrade vitest to 4.x and fix the test isolation it exposed ([5876c65](https://github.com/kdpa-llc/local-skills-mcp/commit/5876c65)), closes [#95](https://github.com/kdpa-llc/local-skills-mcp/issues/95)
- fix(deps): bring dependencies to latest, clearing all production advisories (#97) ([8e1c24f](https://github.com/kdpa-llc/local-skills-mcp/commit/8e1c24f)), closes [#97](https://github.com/kdpa-llc/local-skills-mcp/issues/97)
- fix(deps): bump @modelcontextprotocol/sdk to 1.30.0 and yaml to 2.9.0 ([573540d](https://github.com/kdpa-llc/local-skills-mcp/commit/573540d))
- fix(deps): pin conventionalcommits preset to a writer-8 compatible major ([f1a4eee](https://github.com/kdpa-llc/local-skills-mcp/commit/f1a4eee))
- fix(deps): pin conventionalcommits preset to a writer-8 compatible major (#105) ([120b00f](https://github.com/kdpa-llc/local-skills-mcp/commit/120b00f)), closes [#105](https://github.com/kdpa-llc/local-skills-mcp/issues/105)
- ci: allow the release workflow to be triggered manually ([c1cf0df](https://github.com/kdpa-llc/local-skills-mcp/commit/c1cf0df))
- ci: allow the release workflow to be triggered manually (#104) ([b208604](https://github.com/kdpa-llc/local-skills-mcp/commit/b208604)), closes [#104](https://github.com/kdpa-llc/local-skills-mcp/issues/104)
- ci: fail the release with a readable error when RELEASE_TOKEN is bad ([d7232a3](https://github.com/kdpa-llc/local-skills-mcp/commit/d7232a3))
- ci: let production dependency bumps trigger a release ([8b1d63a](https://github.com/kdpa-llc/local-skills-mcp/commit/8b1d63a))
- ci: run CI, CodeQL and dependency review on every pull request ([ea91535](https://github.com/kdpa-llc/local-skills-mcp/commit/ea91535)), closes [#97](https://github.com/kdpa-llc/local-skills-mcp/issues/97) [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98)
- ci: set npm registry in release workflow so publishing can authenticate (#103) ([b57d60d](https://github.com/kdpa-llc/local-skills-mcp/commit/b57d60d)), closes [#103](https://github.com/kdpa-llc/local-skills-mcp/issues/103) [#99](https://github.com/kdpa-llc/local-skills-mcp/issues/99)
- ci: set the npm registry in the release workflow ([3c6ccd9](https://github.com/kdpa-llc/local-skills-mcp/commit/3c6ccd9))
- ci(deps): bump actions/checkout from 5 to 6 ([42ca7ac](https://github.com/kdpa-llc/local-skills-mcp/commit/42ca7ac))
- ci(deps): bump actions/first-interaction from 1 to 3 ([3659f5b](https://github.com/kdpa-llc/local-skills-mcp/commit/3659f5b))
- ci(deps): bump actions/github-script from 7 to 8 ([a805d4a](https://github.com/kdpa-llc/local-skills-mcp/commit/a805d4a))
- ci(deps): bump actions/labeler from 5 to 6 ([7c3f8fa](https://github.com/kdpa-llc/local-skills-mcp/commit/7c3f8fa))
- ci(deps): bump actions/stale from 9 to 10 ([88d3cf4](https://github.com/kdpa-llc/local-skills-mcp/commit/88d3cf4))
- docs: add MCP Tool Aggregator as complementary project ([900ec1a](https://github.com/kdpa-llc/local-skills-mcp/commit/900ec1a))
- docs: backfill changelog entries for 0.4.3 and 0.4.4 ([34bca80](https://github.com/kdpa-llc/local-skills-mcp/commit/34bca80))
- docs: correct false claims in the bundled skills ([71d1465](https://github.com/kdpa-llc/local-skills-mcp/commit/71d1465))
- docs: correct false security claims and a stale diagram in ARCHITECTURE ([78dc08f](https://github.com/kdpa-llc/local-skills-mcp/commit/78dc08f))
- docs: document the Skill identity split and injectable skills directories ([8556000](https://github.com/kdpa-llc/local-skills-mcp/commit/8556000))
- docs: drop phantom cache from the dev guide and unswap the skill scripts ([9d13955](https://github.com/kdpa-llc/local-skills-mcp/commit/9d13955)), closes [#100](https://github.com/kdpa-llc/local-skills-mcp/issues/100) [#101](https://github.com/kdpa-llc/local-skills-mcp/issues/101)
- docs: fix nonexistent function and false caching claims in bundled skills (#101) ([160e2d3](https://github.com/kdpa-llc/local-skills-mcp/commit/160e2d3)), closes [#101](https://github.com/kdpa-llc/local-skills-mcp/issues/101)
- docs: improve bundled skills using eval-driven pass ([fa48d15](https://github.com/kdpa-llc/local-skills-mcp/commit/fa48d15))
- docs: polish README for improved clarity and organization (#69) ([6f1ac28](https://github.com/kdpa-llc/local-skills-mcp/commit/6f1ac28)), closes [#69](https://github.com/kdpa-llc/local-skills-mcp/issues/69)
- docs: remove phantom cache from dev guide, fix README tool count and script names (#102) ([689c77e](https://github.com/kdpa-llc/local-skills-mcp/commit/689c77e)), closes [#102](https://github.com/kdpa-llc/local-skills-mcp/issues/102) [#100](https://github.com/kdpa-llc/local-skills-mcp/issues/100) [#101](https://github.com/kdpa-llc/local-skills-mcp/issues/101) [#101](https://github.com/kdpa-llc/local-skills-mcp/issues/101)
- docs: update Complementary Projects to refer to MCP Compression Proxy ([3eef465](https://github.com/kdpa-llc/local-skills-mcp/commit/3eef465))
- feat!: require Node.js 22+ and test on Node 22/24 (#98) ([9ca547d](https://github.com/kdpa-llc/local-skills-mcp/commit/9ca547d)), closes [#98](https://github.com/kdpa-llc/local-skills-mcp/issues/98)
- chore: gitignore evals/ and remove tracked benchmark results ([950f77a](https://github.com/kdpa-llc/local-skills-mcp/commit/950f77a))
- chore: gitignore evals/ and remove tracked benchmark results (#94) ([d7538ce](https://github.com/kdpa-llc/local-skills-mcp/commit/d7538ce)), closes [#94](https://github.com/kdpa-llc/local-skills-mcp/issues/94)
- chore(deps-dev): bump @semantic-release/exec from 6.0.3 to 7.1.0 ([dac57c4](https://github.com/kdpa-llc/local-skills-mcp/commit/dac57c4))
- chore(deps-dev): bump the development-dependencies group across 1 directory with 10 updates (#79) ([692d161](https://github.com/kdpa-llc/local-skills-mcp/commit/692d161)), closes [#79](https://github.com/kdpa-llc/local-skills-mcp/issues/79)
- chore(deps-dev): bump the development-dependencies group with 4 updates (#71) ([69522ca](https://github.com/kdpa-llc/local-skills-mcp/commit/69522ca)), closes [#71](https://github.com/kdpa-llc/local-skills-mcp/issues/71)
- chore(deps-dev): bump the development-dependencies group with 9 updates ([868d838](https://github.com/kdpa-llc/local-skills-mcp/commit/868d838))
- chore(deps-dev): refresh in-range dev dependencies ([c2bfa06](https://github.com/kdpa-llc/local-skills-mcp/commit/c2bfa06))
- chore(deps): bump @modelcontextprotocol/sdk ([c92fcf0](https://github.com/kdpa-llc/local-skills-mcp/commit/c92fcf0))
- chore(deps): bump the production-dependencies group with 2 updates (#75) ([a7560f5](https://github.com/kdpa-llc/local-skills-mcp/commit/a7560f5)), closes [#75](https://github.com/kdpa-llc/local-skills-mcp/issues/75)
- test: add coverage for eval-runner, skill-validator, and index handlers ([dbda456](https://github.com/kdpa-llc/local-skills-mcp/commit/dbda456))
- test: add skill eval sets and benchmark snapshot ([0084c8c](https://github.com/kdpa-llc/local-skills-mcp/commit/0084c8c))
- test: assert the real source path instead of a POSIX-shaped regex ([738bc2e](https://github.com/kdpa-llc/local-skills-mcp/commit/738bc2e))
- test: build dist automatically and install the documented test UI ([ff75213](https://github.com/kdpa-llc/local-skills-mcp/commit/ff75213))
- style: format tracked files with prettier and enforce it in CI ([4268563](https://github.com/kdpa-llc/local-skills-mcp/commit/4268563))
- feat: add automated shipped-skill optimization workflow ([ce8c17b](https://github.com/kdpa-llc/local-skills-mcp/commit/ce8c17b))
- feat: add repeatable shipped-skill benchmark and retune descriptions ([d6b324a](https://github.com/kdpa-llc/local-skills-mcp/commit/d6b324a))
- feat: add skill validation and evaluation tools ([80caee1](https://github.com/kdpa-llc/local-skills-mcp/commit/80caee1))
- feat: tune evaluate_skill controls and refresh shipped skill descriptions ([5fdc918](https://github.com/kdpa-llc/local-skills-mcp/commit/5fdc918))

## <small>0.4.4 (2025-11-11)</small>

- fix: add @semantic-release/git plugin and sync version to 0.4.3 ([4b5ef0c](https://github.com/kdpa-llc/local-skills-mcp/commit/4b5ef0c))

## <small>0.4.3 (2025-11-11)</small>

- fix: revert release workflow to direct commits instead of PR creation ([3390139](https://github.com/kdpa-llc/local-skills-mcp/commit/3390139))

## <small>0.4.2 (2025-11-11)</small>

- docs: add npm downloads and types badges to README ([110c285](https://github.com/kdpa-llc/local-skills-mcp/commit/110c285))
- docs: improve README with collapsible FAQ and enhanced support links ([8daffb5](https://github.com/kdpa-llc/local-skills-mcp/commit/8daffb5))
- docs: update README with hot reload support and interactive skill creation examples ([6300cfc](https://github.com/kdpa-llc/local-skills-mcp/commit/6300cfc))
- refactor: remove skill-refresh-helper from built-in skills ([c003f38](https://github.com/kdpa-llc/local-skills-mcp/commit/c003f38))

## 0.4.0 (2025-11-10)

- feat: add skill descriptions to ListTools output ([2451bcb](https://github.com/kdpa-llc/local-skills-mcp/commit/2451bcb)), closes [#50](https://github.com/kdpa-llc/local-skills-mcp/issues/50)

## 0.3.0 (2025-11-10)

- feat: automate version syncing with generated server.json ([ad12154](https://github.com/kdpa-llc/local-skills-mcp/commit/ad12154))

## <small>0.2.2 (2025-11-10)</small>

- fix: trigger 0.2.2 release ([cce30a5](https://github.com/kdpa-llc/local-skills-mcp/commit/cce30a5))
- chore: bump version to 0.2.2 ([1e26933](https://github.com/kdpa-llc/local-skills-mcp/commit/1e26933))

## <small>0.2.1 (2025-11-09)</small>

- fix: resolve symlink issue in entry point detection for npm global installs (#49) ([629ea38](https://github.com/kdpa-llc/local-skills-mcp/commit/629ea38)), closes [#49](https://github.com/kdpa-llc/local-skills-mcp/issues/49) [#48](https://github.com/kdpa-llc/local-skills-mcp/issues/48)

## 0.2.0 (2025-11-08)

- feat: add code quality tools (ESLint, Prettier, Husky) (#16) ([870a240](https://github.com/kdpa-llc/local-skills-mcp/commit/870a240)), closes [#16](https://github.com/kdpa-llc/local-skills-mcp/issues/16) [#16](https://github.com/kdpa-llc/local-skills-mcp/issues/16)
- feat: add GitHub Actions CI/CD workflows (#15) ([bc95dbf](https://github.com/kdpa-llc/local-skills-mcp/commit/bc95dbf)), closes [#15](https://github.com/kdpa-llc/local-skills-mcp/issues/15) [#15](https://github.com/kdpa-llc/local-skills-mcp/issues/15)
- feat: configure Dependabot for automated dependency management (#18) ([44a4eb0](https://github.com/kdpa-llc/local-skills-mcp/commit/44a4eb0)), closes [#18](https://github.com/kdpa-llc/local-skills-mcp/issues/18) [#18](https://github.com/kdpa-llc/local-skills-mcp/issues/18)
- feat: implement semantic-release for automated versioning (#19) ([af79614](https://github.com/kdpa-llc/local-skills-mcp/commit/af79614)), closes [#19](https://github.com/kdpa-llc/local-skills-mcp/issues/19) [#19](https://github.com/kdpa-llc/local-skills-mcp/issues/19)
- feat: Include package built-in skills as default base (#7) ([b18f61f](https://github.com/kdpa-llc/local-skills-mcp/commit/b18f61f)), closes [#7](https://github.com/kdpa-llc/local-skills-mcp/issues/7) [#7](https://github.com/kdpa-llc/local-skills-mcp/issues/7)
- feat: npm publishing with OIDC trusted publishers and initial v0.1.0 release (#46) ([b660431](https://github.com/kdpa-llc/local-skills-mcp/commit/b660431)), closes [#46](https://github.com/kdpa-llc/local-skills-mcp/issues/46)
- Add comprehensive API documentation (#23) ([6434598](https://github.com/kdpa-llc/local-skills-mcp/commit/6434598)), closes [#23](https://github.com/kdpa-llc/local-skills-mcp/issues/23) [Hi#level](https://github.com/Hi/issues/level) [#23](https://github.com/kdpa-llc/local-skills-mcp/issues/23)
- Add comprehensive test suite achieving 95%+ coverage with unit, integration, and E2E tests (#29) ([5971d31](https://github.com/kdpa-llc/local-skills-mcp/commit/5971d31)), closes [#29](https://github.com/kdpa-llc/local-skills-mcp/issues/29)
- Add GitHub Sponsors funding option ([d86f368](https://github.com/kdpa-llc/local-skills-mcp/commit/d86f368))
- Add project documentation for Claude Code ([4c5683d](https://github.com/kdpa-llc/local-skills-mcp/commit/4c5683d))
- Add repository-specific example skills and comprehensive usage guide ([e3ca56d](https://github.com/kdpa-llc/local-skills-mcp/commit/e3ca56d)), closes [hi#quality](https://github.com/hi/issues/quality)
- Claude/enable full hot reload 011 c us6 eneh bty xhds km xyqv (#45) ([0cc9740](https://github.com/kdpa-llc/local-skills-mcp/commit/0cc9740)), closes [#45](https://github.com/kdpa-llc/local-skills-mcp/issues/45)
- Configure branch protection and repository settings (#21) ([d9919bc](https://github.com/kdpa-llc/local-skills-mcp/commit/d9919bc)), closes [#21](https://github.com/kdpa-llc/local-skills-mcp/issues/21) [#21](https://github.com/kdpa-llc/local-skills-mcp/issues/21)
- Enhance contributor experience with automation (#22) ([b3ac1ad](https://github.com/kdpa-llc/local-skills-mcp/commit/b3ac1ad)), closes [#22](https://github.com/kdpa-llc/local-skills-mcp/issues/22) [#22](https://github.com/kdpa-llc/local-skills-mcp/issues/22)
- Enhance README with badges, ToC, demo section, and comprehensive FAQ ([3986194](https://github.com/kdpa-llc/local-skills-mcp/commit/3986194))
- Fix repository references and optimize npm packaging ([3944ca4](https://github.com/kdpa-llc/local-skills-mcp/commit/3944ca4))
- Fix version numbers in SECURITY.md ([06a14e3](https://github.com/kdpa-llc/local-skills-mcp/commit/06a14e3))
- Streamline and fix README documentation ([43cce88](https://github.com/kdpa-llc/local-skills-mcp/commit/43cce88))
- Streamline and refine README (#4) ([cb04ece](https://github.com/kdpa-llc/local-skills-mcp/commit/cb04ece)), closes [#4](https://github.com/kdpa-llc/local-skills-mcp/issues/4)
- Update repository URLs from moscaverd to kdpa-llc organization ([da739be](https://github.com/kdpa-llc/local-skills-mcp/commit/da739be))
- fix: resolve linting errors and sync fork with upstream (#41) ([dc6965c](https://github.com/kdpa-llc/local-skills-mcp/commit/dc6965c)), closes [#41](https://github.com/kdpa-llc/local-skills-mcp/issues/41)
- fix: resolve test file handle leaks and improve cross-platform compatibility ([ccc2408](https://github.com/kdpa-llc/local-skills-mcp/commit/ccc2408))
- ci(deps): bump actions/checkout from 4 to 5 ([a0fa14f](https://github.com/kdpa-llc/local-skills-mcp/commit/a0fa14f))
- ci(deps): bump actions/setup-node from 4 to 6 ([75eac33](https://github.com/kdpa-llc/local-skills-mcp/commit/75eac33))
- ci(deps): bump codecov/codecov-action from 4 to 5 ([d8a95e3](https://github.com/kdpa-llc/local-skills-mcp/commit/d8a95e3))
- ci(deps): bump github/codeql-action from 3 to 4 ([2b2820e](https://github.com/kdpa-llc/local-skills-mcp/commit/2b2820e))
- chore: exclude CLAUDE.md from git and npm, add .tmp/ for temporary files ([7c2f06d](https://github.com/kdpa-llc/local-skills-mcp/commit/7c2f06d))
- chore(deps-dev): bump @types/node from 22.18.13 to 24.10.0 ([af8bc4f](https://github.com/kdpa-llc/local-skills-mcp/commit/af8bc4f))
- chore(deps-dev): bump the development-dependencies group with 2 updates (#37) ([6ce77d2](https://github.com/kdpa-llc/local-skills-mcp/commit/6ce77d2)), closes [#37](https://github.com/kdpa-llc/local-skills-mcp/issues/37)
- docs: replace hardcoded values with dynamic references (#20) ([45a8d80](https://github.com/kdpa-llc/local-skills-mcp/commit/45a8d80)), closes [#20](https://github.com/kdpa-llc/local-skills-mcp/issues/20) [#20](https://github.com/kdpa-llc/local-skills-mcp/issues/20)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Package built-in skills directory as base default for all MCP instances
- Self-documenting capabilities: `local-skills-mcp-usage`, `local-skills-mcp-guide`, and `skill-creator` skills
- Skills are now available immediately after installation with zero configuration

### Changed

- Directory aggregation priority updated to include package built-in skills as lowest priority (first in list)
- Updated documentation to reflect new built-in skills feature

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

<!-- Version Links -->

[0.1.0]: https://github.com/kdpa-llc/local-skills-mcp/releases/tag/v0.1.0
[unreleased]: https://github.com/kdpa-llc/local-skills-mcp/compare/v0.1.0...HEAD

<!-- Reference Links -->

[repo]: https://github.com/kdpa-llc/local-skills-mcp
[issues]: https://github.com/kdpa-llc/local-skills-mcp/issues
[pulls]: https://github.com/kdpa-llc/local-skills-mcp/pulls
[releases]: https://github.com/kdpa-llc/local-skills-mcp/releases
[contributing]: CONTRIBUTING.md
[security]: SECURITY.md
