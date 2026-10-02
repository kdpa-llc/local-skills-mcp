import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  context,
  finalize,
  normalizeSource,
  prepare,
  snapshot,
  validateReports,
} from "./record-coverage-evidence.mjs";

const script = fileURLToPath(
  new URL("./record-coverage-evidence.mjs", import.meta.url)
);
const git = (cwd, args) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Coverage fixture",
      "-c",
      "user.email=coverage@example.invalid",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
const write = (cwd, name, value) => {
  fs.mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, name),
    typeof value === "string" ? value : JSON.stringify(value)
  );
};
const commit = (cwd) => {
  git(cwd, ["add", "."]);
  git(cwd, ["commit", "-qm", "fixture"]);
};
function fixture(t) {
  const cwd = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "coverage-evidence-"))
  );
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  git(cwd, ["init", "-q", "-b", "main"]);
  write(cwd, ".gitattributes", "* text=auto eol=lf\n");
  write(cwd, ".gitignore", "coverage/\n.tmp/\n");
  write(cwd, "src/a.ts", "export const choose = (flag) => flag ? 1 : 2;\n");
  commit(cwd);
  const head = git(cwd, ["rev-parse", "HEAD"]);
  const env = {
    GITHUB_REPOSITORY: "kdpa-llc/local-skills-mcp",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_JOB: "test",
    GITHUB_EVENT_NAME: "push",
    GITHUB_SHA: head,
    GITHUB_REF: "refs/heads/main",
    COVERAGE_OS: {
      linux: "ubuntu-latest",
      darwin: "macos-latest",
      win32: "windows-latest",
    }[process.platform],
    COVERAGE_NODE: process.versions.node.split(".")[0],
    COVERAGE_BEFORE: "0".repeat(40),
    COVERAGE_AFTER: head,
    COVERAGE_TEST_OUTCOME: "success",
  };
  return { cwd, env };
}
function coverage(cwd, branchHits = [1, 1]) {
  const name = path.join(cwd, "src/a.ts");
  const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: 40 } };
  const raw = {
    [name]: {
      path: name,
      statementMap: { 0: loc },
      s: { 0: 1 },
      fnMap: {},
      f: {},
      branchMap: { 0: { locations: [loc, loc] } },
      b: { 0: branchHits },
    },
  };
  const item = (total, covered) => ({
    total,
    covered,
    skipped: 0,
    pct: total ? (covered / total) * 100 : 100,
  });
  const metrics = {
    statements: item(1, 1),
    lines: item(1, 1),
    functions: item(0, 0),
    branches: item(2, branchHits.filter(Boolean).length),
  };
  return { raw, summary: { total: metrics, [name]: metrics } };
}
function emit(cwd, data = coverage(cwd)) {
  write(cwd, "coverage/coverage-final.json", data.raw);
  write(cwd, "coverage/coverage-summary.json", data.summary);
}

test("push preparation clears old reports and binds fresh selected evidence", (t) => {
  const { cwd, env } = fixture(t);
  emit(cwd);
  const before = prepare(cwd, {
    ...env,
    PRIVATE_SENTINEL: "must-not-be-saved",
  });
  assert.equal(
    fs.existsSync(path.join(cwd, "coverage/coverage-final.json")),
    false
  );
  assert.equal(JSON.stringify(before).includes("must-not-be-saved"), false);
  emit(cwd);
  const result = finalize(cwd, env);
  assert.equal(result.verified, true);
  assert.equal(result.testedCommit, env.GITHUB_SHA);
  assert.equal(result.sourceFingerprint, before.source.fingerprint);
  assert.equal(result.reports.length, 2);
  assert.equal(result.sourceMappings[0].sourcePath, "src/a.ts");
  assert.equal(result.reports[0].sha256.length, 64);
});

test("raw PR parents survive a shallow commit; older event base stays separate", (t) => {
  const { cwd, env } = fixture(t);
  const base = env.GITHUB_SHA;
  git(cwd, ["checkout", "-qb", "topic"]);
  write(cwd, "topic.txt", "topic\n");
  commit(cwd);
  const head = git(cwd, ["rev-parse", "HEAD"]);
  git(cwd, ["checkout", "-q", "main"]);
  write(cwd, "main.txt", "main\n");
  commit(cwd);
  const testedBase = git(cwd, ["rev-parse", "HEAD"]);
  git(cwd, ["merge", "--no-ff", "--no-edit", "topic"]);
  const merge = git(cwd, ["rev-parse", "HEAD"]);
  fs.writeFileSync(path.join(cwd, ".git/shallow"), merge + "\n");
  const source = snapshot(cwd);
  assert.deepEqual(source.parents, [testedBase, head]);
  const prEnv = {
    ...env,
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_SHA: merge,
    GITHUB_REF: "refs/pull/115/merge",
    COVERAGE_BASE: base,
    COVERAGE_PR_HEAD: head,
  };
  assert.equal(context(prEnv, source).baseRelation, "ancestry-not-verified");
  assert.equal(
    context({ ...prEnv, COVERAGE_BASE: testedBase }, source).baseRelation,
    "identical"
  );
  prepare(cwd, prEnv);
  emit(cwd);
  assert.equal(finalize(cwd, prEnv).verified, true);
  assert.throws(
    () => context({ ...prEnv, COVERAGE_PR_HEAD: base }, source),
    /second parent/
  );
  assert.throws(
    () => context({ ...prEnv, COVERAGE_BASE: "" }, source),
    /Invalid PR/
  );
});

test("Gitlinks and symlinks are identities, never followed", (t) => {
  const { cwd, env } = fixture(t);
  git(cwd, [
    "update-index",
    "--add",
    "--cacheinfo",
    "160000",
    env.GITHUB_SHA,
    "vendor/absent",
  ]);
  git(cwd, ["commit", "-qm", "gitlink"]);
  fs.symlinkSync(
    path.join(cwd, "nonexistent-outside"),
    path.join(cwd, "link"),
    "file"
  );
  const linkBlob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    input: fs.readlinkSync(path.join(cwd, "link")),
    encoding: "utf8",
  }).trim();
  git(cwd, [
    "update-index",
    "--add",
    "--cacheinfo",
    "120000",
    linkBlob,
    "link",
  ]);
  git(cwd, ["commit", "-qm", "link"]);
  assert.match(git(cwd, ["ls-tree", "HEAD", "link"]), /^120000 blob /);
  // Model Git for Windows' common default in this disposable fixture only.
  git(cwd, ["config", "core.symlinks", "false"]);
  const source = snapshot(cwd);
  assert.equal(
    source.files.find((f) => f.path === "vendor/absent").kind,
    "gitlink"
  );
  assert.equal(source.files.find((f) => f.path === "link").kind, "symlink");
  assert.equal(fs.existsSync(path.join(cwd, "vendor/absent")), false);
});

test("raw EOL bytes are distinct from clean normalized Git blobs", (t) => {
  const { cwd } = fixture(t);
  const lf = snapshot(cwd);
  write(
    cwd,
    "src/a.ts",
    fs.readFileSync(path.join(cwd, "src/a.ts"), "utf8").replace(/\n/g, "\r\n")
  );
  const crlf = snapshot(cwd);
  assert.equal(lf.tree, crlf.tree);
  assert.notEqual(lf.fingerprint, crlf.fingerprint);
  assert.equal(
    lf.files.find((f) => f.path === "src/a.ts").gitObject,
    crlf.files.find((f) => f.path === "src/a.ts").gitObject
  );
});

test("Windows and POSIX paths map without accepting traversal/outside paths", () => {
  assert.equal(
    normalizeSource("C:\\work\\repo", "C:\\work\\repo\\src\\a.ts", path.win32),
    "src/a.ts"
  );
  assert.equal(
    normalizeSource("/work/repo", "/work/repo/src/a.ts", path.posix),
    "src/a.ts"
  );
  for (const name of ["../a.ts", "/else/a.ts", "src/../a.ts"])
    assert.throws(() => normalizeSource("/work/repo", name, path.posix));
  assert.throws(() =>
    normalizeSource("C:\\work\\repo", "D:\\src\\a.ts", path.win32)
  );
});

const invalidReports = [
  [
    "empty raw",
    (d) => {
      d.raw = {};
    },
  ],
  [
    "no total",
    (d) => {
      delete d.summary.total;
    },
  ],
  [
    "bad mapping",
    (d) => {
      Object.values(d.raw)[0].statementMap = null;
    },
  ],
  [
    "counter key",
    (d) => {
      Object.values(d.raw)[0].s = { 8: 1 };
    },
  ],
  [
    "bad location",
    (d) => {
      Object.values(d.raw)[0].statementMap[0] = null;
    },
  ],
  [
    "negative counter",
    (d) => {
      Object.values(d.raw)[0].s[0] = -1;
    },
  ],
  [
    "branch length",
    (d) => {
      Object.values(d.raw)[0].b[0] = [1];
    },
  ],
  [
    "branch negative",
    (d) => {
      Object.values(d.raw)[0].b[0] = [1, -1];
    },
  ],
  [
    "invalid pct",
    (d) => {
      d.summary.total.lines.pct = null;
    },
  ],
  [
    "covered exceeds total",
    (d) => {
      d.summary.total.lines.covered = 10;
    },
  ],
  [
    "missing raw source",
    (d, cwd) => {
      d.raw[path.join(cwd, "src/missing.ts")] = Object.values(d.raw)[0];
    },
  ],
  [
    "duplicate normalized",
    (d) => {
      d.raw["src/a.ts"] = Object.values(d.raw)[0];
    },
  ],
  [
    "raw path mismatch",
    (d) => {
      Object.values(d.raw)[0].path = "src/other.ts";
    },
  ],
  [
    "summary set",
    (d) => {
      d.summary["src/other.ts"] = d.summary.total;
    },
  ],
  [
    "malformed summary",
    (d) => {
      d.summary.total = [];
    },
  ],
  [
    "outside mapping",
    (d) => {
      d.raw["/outside/a.ts"] = Object.values(d.raw)[0];
    },
  ],
];
for (const [name, mutate] of invalidReports)
  test(name + " fails evidence validation", (t) => {
    const { cwd, env } = fixture(t);
    prepare(cwd, env);
    const data = coverage(cwd);
    mutate(data, cwd);
    emit(cwd, data);
    assert.equal(finalize(cwd, env).verified, false);
  });

for (const missing of [
  ".tmp/coverage-evidence/source-before.json",
  "coverage/coverage-final.json",
  "coverage/coverage-summary.json",
]) {
  test("missing " + missing + " fails", (t) => {
    const { cwd, env } = fixture(t);
    prepare(cwd, env);
    emit(cwd);
    fs.rmSync(path.join(cwd, missing));
    assert.equal(finalize(cwd, env).verified, false);
  });
}
test("malformed JSON, source mutation and original failure remain failed", (t) => {
  const { cwd, env } = fixture(t);
  prepare(cwd, env);
  emit(cwd);
  write(cwd, "coverage/coverage-final.json", "{");
  assert.equal(finalize(cwd, env).verified, false);
  emit(cwd);
  assert.equal(
    finalize(cwd, { ...env, COVERAGE_TEST_OUTCOME: "failure" }).verified,
    false
  );
  write(cwd, "src/a.ts", "changed\n");
  assert.equal(finalize(cwd, env).verified, false);
});
test("stale metadata, HEAD/tree, source list and Gitlink changes fail", (t) => {
  const { cwd, env } = fixture(t);
  prepare(cwd, env);
  emit(cwd);
  for (const key of [
    "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_JOB",
    "GITHUB_REF",
  ]) {
    assert.equal(
      finalize(cwd, { ...env, [key]: env[key] + "1" }).verified,
      false
    );
  }
  const state = path.join(cwd, ".tmp/coverage-evidence/source-before.json");
  const prepared = JSON.parse(fs.readFileSync(state, "utf8"));
  for (const key of ["tree", "commit", "fingerprint", "files"]) {
    const changed = structuredClone(prepared);
    changed.source[key] = "stale";
    write(cwd, ".tmp/coverage-evidence/source-before.json", changed);
    assert.equal(finalize(cwd, env).verified, false);
  }
  write(cwd, ".tmp/coverage-evidence/source-before.json", {
    ...prepared,
    schemaVersion: 2,
  });
  assert.equal(finalize(cwd, env).verified, false);
  write(cwd, ".tmp/coverage-evidence/source-before.json", prepared);
  write(cwd, "new.txt", "new");
  commit(cwd);
  assert.equal(finalize(cwd, env).verified, false);
  assert.equal(
    finalize(cwd, {
      ...env,
      GITHUB_SHA: git(cwd, ["rev-parse", "HEAD"]),
      COVERAGE_AFTER: git(cwd, ["rev-parse", "HEAD"]),
    }).verified,
    false
  );
});

test("invalid context inputs fail; unrelated environment stays absent", (t) => {
  const { cwd, env } = fixture(t);
  const source = snapshot(cwd);
  for (const [key, value] of [
    ["GITHUB_REPOSITORY", "other/repo"],
    ["GITHUB_RUN_ID", ""],
    ["GITHUB_JOB", ""],
    ["COVERAGE_NODE", "20"],
    ["COVERAGE_OS", "other"],
    ["GITHUB_SHA", "bad"],
    ["GITHUB_EVENT_NAME", "workflow_dispatch"],
    ["COVERAGE_BEFORE", "bad"],
    ["COVERAGE_AFTER", "bad"],
  ]) {
    assert.throws(() => context({ ...env, [key]: value }, source));
  }
  assert.throws(
    () =>
      context(
        { ...env, COVERAGE_NODE: env.COVERAGE_NODE === "22" ? "24" : "22" },
        source
      ),
    /runtime/
  );
  assert.throws(
    () =>
      context(
        {
          ...env,
          COVERAGE_OS:
            env.COVERAGE_OS === "ubuntu-latest"
              ? "macos-latest"
              : "ubuntu-latest",
        },
        source
      ),
    /runtime/
  );
});

test("CLI succeeds and preserves failure exit status", (t) => {
  const { cwd, env } = fixture(t);
  const run = (command) =>
    spawnSync(process.execPath, [script, command], {
      cwd,
      env: {
        ...Object.fromEntries(
          ["PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR", "NODE_V8_COVERAGE"]
            .filter((key) => process.env[key] !== undefined)
            .map((key) => [key, process.env[key]])
        ),
        ...env,
      },
      encoding: "utf8",
    });
  const prepared = run("prepare");
  assert.equal(prepared.status, 0, prepared.stderr);
  emit(cwd);
  const finalized = run("finalize");
  assert.equal(finalized.status, 0, finalized.stderr);
  fs.rmSync(path.join(cwd, "coverage/coverage-final.json"));
  assert.equal(run("finalize").status, 1);
  assert.equal(run("unknown").status, 1);
});

test("index link changes and output symlink traversal fail without following targets", (t) => {
  const { cwd, env } = fixture(t);
  prepare(cwd, env);
  git(cwd, [
    "update-index",
    "--add",
    "--cacheinfo",
    "160000",
    env.GITHUB_SHA,
    "vendor/new",
  ]);
  assert.throws(() => snapshot(cwd), /Index differs/);
  git(cwd, ["reset", "--quiet", "HEAD"]);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "coverage-no-follow-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(
    outside,
    path.join(cwd, "coverage"),
    process.platform === "win32" ? "junction" : "dir"
  );
  assert.throws(() => prepare(cwd, env), /Symlink traversal/);
  assert.deepEqual(fs.readdirSync(outside), []);
});
