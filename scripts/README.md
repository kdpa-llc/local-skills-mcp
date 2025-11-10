# Scripts

This directory contains utility scripts for the project.

## generate-server-json.js

Generates `server.json` from `package.json` to keep version numbers in sync.

**Usage:**

```bash
npm run generate:server-json
```

**Why this exists:**

- `server.json` is now a generated file (not tracked in git)
- Version number comes from `package.json` as the single source of truth
- Semantic-release automatically generates it during releases
- Run this script locally if you need `server.json` for testing

**When it runs automatically:**

- During semantic-release preparation step
- Can be run manually with `npm run generate:server-json`

## verify-links.js

Verifies that links in markdown files are valid (existing script).
