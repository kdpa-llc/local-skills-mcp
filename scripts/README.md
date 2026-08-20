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

## benchmark-shipped-skills.js / optimize-shipped-skills.js

Measure and tune how reliably the bundled skills in `skills/` trigger.

Each script name matches the file it runs: `skills:benchmark-shipped` runs
`benchmark-shipped-skills.js`, and the `skills:optimize-shipped*` pair runs
`optimize-shipped-skills.js`, with `--apply` only on the non-dry-run form.

**Usage:**

```bash
npm run skills:benchmark-shipped      # Measure trigger rates as they stand
npm run skills:optimize-shipped:dry-run  # Propose better descriptions, change nothing
npm run skills:optimize-shipped       # Same, but write the winners to SKILL.md
```

**Eval directory layout:**

| Path                 | Contents                     | Tracked in git |
| -------------------- | ---------------------------- | -------------- |
| `evals/<skill>.json` | Curated eval set (input)     | Yes            |
| `evals/results/`     | Benchmark artifacts (output) | No             |

Each `evals/<skill>.json` is a hand-maintained list of `{ query, should_trigger }`
cases, named after the skill directory it covers. `eval_set_path` defaults to
`evals/<skill_name>.json`, so a shipped skill needs a matching file here for
`evaluate_skill` and both scripts above to run. Run artifacts land in
`evals/results/`, which is gitignored — keep generated output out of the inputs.
