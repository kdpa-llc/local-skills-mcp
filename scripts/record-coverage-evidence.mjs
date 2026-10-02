import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const statePath = ".tmp/coverage-evidence/source-before.json";
const outputPath = "coverage/evidence/provenance.json";
const reports = [
  "coverage/coverage-final.json",
  "coverage/coverage-summary.json",
];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const same = (a, b, message) =>
  assert.equal(JSON.stringify(a), JSON.stringify(b), message);
const git = (cwd, args) =>
  execFileSync("git", ["--no-optional-locks", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const validSha = (value) =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);

// Inspect each path component without following a symlink, including output paths.
function localPath(cwd, relative, allowLeafLink = false) {
  assert.ok(
    relative &&
      !path.isAbsolute(relative) &&
      !relative.split(/[\\/]/).includes(".."),
    "Invalid local path"
  );
  const parts = relative.split("/");
  let current = cwd;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) continue;
    assert.ok(
      !stat.isSymbolicLink() || (allowLeafLink && index === parts.length - 1),
      "Symlink traversal rejected"
    );
  }
  return current;
}

function writeJson(cwd, relative, value) {
  const target = localPath(cwd, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
}

export function snapshot(cwd) {
  const commit = git(cwd, ["rev-parse", "HEAD"]);
  const headers = git(cwd, ["cat-file", "-p", "HEAD"])
    .split("\n\n", 1)[0]
    .split("\n");
  const tree = headers.find((line) => line.startsWith("tree ")).slice(5);
  const parents = headers
    .filter((line) => line.startsWith("parent "))
    .map((line) => line.slice(7));
  const entries = git(cwd, ["ls-tree", "-rz", "HEAD"])
    .split("\0")
    .filter(Boolean);
  const hash = createHash("sha256");
  const files = [];
  for (const entry of entries) {
    const tab = entry.indexOf("\t");
    const [mode, , blob] = entry.slice(0, tab).split(" ");
    const name = entry.slice(tab + 1);
    if (mode === "160000") {
      files.push({ path: name, mode, gitObject: blob, kind: "gitlink" });
      hash.update("gitlink\0" + name + "\0" + blob + "\0");
      continue;
    }
    assert.ok(
      ["100644", "100755", "120000"].includes(mode),
      "Unsupported tracked mode"
    );
    const target = localPath(cwd, name, mode === "120000");
    const stat = fs.lstatSync(target);
    assert.ok(
      mode === "120000" ? stat.isSymbolicLink() : stat.isFile(),
      "Tracked type changed"
    );
    const bytes =
      mode === "120000"
        ? fs.readlinkSync(target, { encoding: "buffer" })
        : fs.readFileSync(target);
    hash
      .update(mode === "120000" ? "symlink\0" : "")
      .update(name)
      .update("\0")
      .update(bytes)
      .update("\0");
    files.push({
      path: name,
      mode,
      gitObject: blob,
      kind: mode === "120000" ? "symlink" : "file",
      bytes: bytes.length,
      workingSha256: digest(bytes),
    });
  }
  // Ignore submodule working directories: only their committed/index link is relevant.
  git(cwd, [
    "diff",
    "--quiet",
    "--no-ext-diff",
    "--no-textconv",
    "--ignore-submodules=all",
    "HEAD",
    "--",
  ]);
  const index = git(cwd, ["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((entry) => {
      const tab = entry.indexOf("\t");
      const [mode, blob, stage] = entry.slice(0, tab).split(" ");
      assert.equal(stage, "0", "Unmerged index");
      return { path: entry.slice(tab + 1), mode, gitObject: blob };
    });
  same(
    index,
    files.map(({ path: name, mode, gitObject }) => ({
      path: name,
      mode,
      gitObject,
    })),
    "Index differs from tested tree"
  );
  return {
    commit,
    tree,
    parents,
    fingerprint: hash.digest("hex"),
    files,
    bytePolicy:
      "Raw working bytes; Git blob identity and Git-normalized cleanliness are separate. No EOL normalization; preserve .gitattributes.",
  };
}

export function context(env, source) {
  const result = {
    repository: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
    job: env.GITHUB_JOB,
    event: env.GITHUB_EVENT_NAME,
    eventSha: env.GITHUB_SHA,
    eventRef: env.GITHUB_REF,
    os: env.COVERAGE_OS,
    node: env.COVERAGE_NODE,
    actualNode: process.version,
    actualPlatform: process.platform,
  };
  assert.equal(
    result.repository,
    "kdpa-llc/local-skills-mcp",
    "Unexpected repository"
  );
  assert.ok(
    /^[1-9]\d*$/.test(result.runId) && /^[1-9]\d*$/.test(result.attempt),
    "Invalid run identity"
  );
  assert.ok(result.job && result.eventRef, "Missing job/ref identity");
  assert.ok(
    ["ubuntu-latest", "windows-latest", "macos-latest"].includes(result.os) &&
      ["22", "24"].includes(result.node),
    "Invalid lane"
  );
  assert.equal(
    result.node,
    process.versions.node.split(".")[0],
    "Node lane differs from runtime"
  );
  assert.equal(
    result.os,
    { linux: "ubuntu-latest", darwin: "macos-latest", win32: "windows-latest" }[
      process.platform
    ],
    "OS lane differs from runtime"
  );
  assert.ok(
    validSha(result.eventSha) && result.eventSha === source.commit,
    "Event SHA differs from HEAD"
  );
  if (result.event === "pull_request") {
    result.eventBase = env.COVERAGE_BASE;
    result.eventHead = env.COVERAGE_PR_HEAD;
    assert.ok(
      validSha(result.eventBase) && validSha(result.eventHead),
      "Invalid PR identity"
    );
    assert.ok(
      source.parents.length === 2 && source.parents[1] === result.eventHead,
      "PR head differs from tested second parent"
    );
    result.testedBase = source.parents[0];
    result.baseRelation =
      result.eventBase === result.testedBase
        ? "identical"
        : "ancestry-not-verified";
  } else {
    assert.equal(result.event, "push", "Unsupported event");
    result.before = env.COVERAGE_BEFORE;
    result.after = env.COVERAGE_AFTER;
    assert.ok(
      validSha(result.before) && result.after === source.commit,
      "Invalid push identity"
    );
  }
  return result;
}

export function normalizeSource(cwd, name, paths = path) {
  assert.ok(
    typeof name === "string" && name && !name.split(/[\\/]/).includes(".."),
    "Invalid report source"
  );
  const relative = paths.relative(cwd, paths.resolve(cwd, name));
  assert.ok(
    relative &&
      !paths.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(".." + paths.sep),
    "Report source outside checkout"
  );
  return relative.split(paths.sep).join("/");
}

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const keys = (value) => Object.keys(value).sort();

export function validateReports(cwd, raw, summary, source) {
  assert.ok(
    object(raw) &&
      Object.keys(raw).length &&
      object(summary) &&
      object(summary.total),
    "Empty or malformed coverage report"
  );
  const tracked = new Map(
    source.files
      .filter((file) => file.kind === "file")
      .map((file) => [file.path, file])
  );
  const mappings = [];
  const seen = new Set();
  for (const [name, record] of Object.entries(raw)) {
    const relative = normalizeSource(cwd, name);
    assert.ok(!seen.has(relative), "Duplicate normalized source");
    seen.add(relative);
    assert.ok(
      tracked.has(relative),
      "Report source is not a regular tracked file"
    );
    assert.ok(
      object(record) && normalizeSource(cwd, record.path) === relative,
      "Inconsistent raw source path"
    );
    for (const [map, counters] of [
      ["statementMap", "s"],
      ["fnMap", "f"],
      ["branchMap", "b"],
    ]) {
      assert.ok(
        object(record[map]) && object(record[counters]),
        "Malformed coverage maps"
      );
      same(
        keys(record[map]),
        keys(record[counters]),
        "Counter keys differ from mapping"
      );
      for (const id of keys(record[counters])) {
        assert.ok(object(record[map][id]), "Malformed source mapping");
        const hits = record[counters][id];
        if (counters === "b") {
          assert.ok(
            Array.isArray(hits) &&
              hits.every(count) &&
              Array.isArray(record[map][id].locations) &&
              hits.length === record[map][id].locations.length,
            "Malformed branch counters"
          );
        } else assert.ok(count(hits), "Malformed coverage counter");
      }
    }
    mappings.push({
      reportPath: name,
      sourcePath: relative,
      workingSha256: tracked.get(relative).workingSha256,
    });
  }
  const summaryFiles = [];
  for (const [name, record] of Object.entries(summary)) {
    assert.ok(object(record), "Malformed summary");
    for (const metric of ["statements", "branches", "functions", "lines"]) {
      const item = record[metric];
      assert.ok(
        object(item) &&
          count(item.total) &&
          count(item.covered) &&
          item.covered <= item.total &&
          Number.isFinite(item.pct) &&
          item.pct >= 0 &&
          item.pct <= 100,
        "Malformed summary counters"
      );
    }
    if (name !== "total") summaryFiles.push(normalizeSource(cwd, name));
  }
  same(
    summaryFiles.sort(),
    [...seen].sort(),
    "Raw and summary source sets differ"
  );
  return mappings;
}

export function prepare(cwd, env) {
  for (const name of [...reports, "coverage/evidence", statePath])
    fs.rmSync(localPath(cwd, name), { force: true, recursive: true });
  const source = snapshot(cwd);
  const prepared = {
    schemaVersion: 1,
    preparedAt: new Date().toISOString(),
    context: context(env, source),
    source,
  };
  writeJson(cwd, statePath, prepared);
  return prepared;
}

export function finalize(cwd, env) {
  const result = {
    schemaVersion: 1,
    finalizedAt: new Date().toISOString(),
    coverageOutcome: env.COVERAGE_TEST_OUTCOME,
    verified: false,
  };
  try {
    const prepared = JSON.parse(
      fs.readFileSync(localPath(cwd, statePath), "utf8")
    );
    assert.equal(prepared.schemaVersion, 1, "Invalid preparation schema");
    const source = snapshot(cwd);
    same(
      prepared.context,
      context(env, source),
      "Stale run/lane/event identity"
    );
    same(prepared.source, source, "Source identity changed during coverage");
    writeJson(cwd, "coverage/evidence/source-before.json", prepared);
    const reportBytes = reports.map((name) =>
      fs.readFileSync(localPath(cwd, name))
    );
    const parsed = reportBytes.map((bytes) => JSON.parse(bytes));
    result.sourceMappings = validateReports(cwd, ...parsed, source);
    result.reports = reports.map((name, index) => ({
      path: name,
      bytes: reportBytes[index].length,
      sha256: digest(reportBytes[index]),
    }));
    result.context = prepared.context;
    result.testedCommit = source.commit;
    result.testedTree = source.tree;
    result.testedParents = source.parents;
    result.sourceFingerprint = source.fingerprint;
    assert.equal(
      result.coverageOutcome,
      "success",
      "Original coverage step failed"
    );
    result.verified = true;
  } catch (error) {
    result.error = error.message;
  }
  writeJson(cwd, outputPath, result);
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const command = process.argv[2];
    assert.ok(
      ["prepare", "finalize"].includes(command),
      "Use prepare or finalize"
    );
    const result =
      command === "prepare"
        ? prepare(process.cwd(), process.env)
        : finalize(process.cwd(), process.env);
    if (command === "finalize" && !result.verified)
      throw new Error(result.error);
  } catch (error) {
    console.error("Coverage evidence failed: " + error.message);
    process.exitCode = 1;
  }
}
