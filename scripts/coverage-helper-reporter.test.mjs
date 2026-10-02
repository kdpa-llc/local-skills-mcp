import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import reporter from "./coverage-helper-reporter.mjs";

const reporterPath = fileURLToPath(
  new URL("./coverage-helper-reporter.mjs", import.meta.url)
);
async function report(events) {
  let output = "";
  for await (const chunk of reporter(events)) output += chunk;
  return { output, data: JSON.parse(output) };
}
const summary = (counts) => ({ type: "test:summary", data: { counts } });

test("records selected results and the aggregate summary only", async () => {
  const { data } = await report([
    {
      type: "test:pass",
      data: { name: "pass", file: "C:\\fixture\\pass.mjs", line: 3, column: 1 },
    },
    {
      type: "test:fail",
      data: {
        name: "fail",
        file: "/fixture/fail.mjs",
        line: 9,
        details: {
          error: {
            name: "Error",
            code: "ERR_TEST_FAILURE",
            message: "wrapper",
            stack: "STACK_SENTINEL",
            cause: {
              name: "AssertionError",
              code: "ERR_ASSERTION",
              message: "selected cause",
              stack: "STACK_SENTINEL",
              cause: { message: "NESTED_SENTINEL" },
              stdout: "OUTPUT_SENTINEL",
            },
          },
        },
      },
    },
    {
      type: "test:summary",
      data: { file: "/fixture/fail.mjs", counts: { tests: 99 } },
    },
    summary({
      tests: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      secret: "ENV_SENTINEL",
    }),
  ]);
  assert.equal(data.cases[0].file, "pass.mjs");
  assert.equal(data.cases[1].file, "fail.mjs");
  assert.equal(data.cases[1].cause.message, "selected cause");
  assert.deepEqual(data.events, { passed: 1, failed: 1 });
  assert.deepEqual(data.summary, {
    tests: 2,
    passed: 1,
    failed: 1,
    skipped: 0,
  });
  assert.equal(data.truncated, false);
  assert.doesNotMatch(JSON.stringify(data), /SENTINEL/);
});

test("missing optional fields stay absent and diagnostic streams are discarded", async () => {
  const { data, output } = await report([
    ...["test:stdout", "test:stderr", "test:diagnostic"].map((type) => ({
      type,
      data: { message: "STREAM_SENTINEL" },
    })),
    { type: "test:pass" },
    { type: "test:fail", data: { name: "unknown", line: -1, column: 0 } },
    summary({ tests: -1, failed: NaN }),
  ]);
  assert.deepEqual(data.cases[0], { status: "passed" });
  assert.deepEqual(data.cases[1], {
    name: "unknown",
    status: "failed",
    column: 0,
  });
  assert.deepEqual(data.summary, {});
  assert.doesNotMatch(output, /SENTINEL/);
  assert.equal((await report([])).data.summary, null);
});

test("escapes control characters while keeping JSON parseable", async () => {
  const value = "a\u0000\u001b\u007f\u0085\u2028\u2029z";
  const { output, data } = await report([
    {
      type: "test:fail",
      data: { name: value, details: { error: { message: value } } },
    },
  ]);
  assert.equal(data.cases[0].name, value);
  assert.equal(data.cases[0].error.message, value);
  assert.doesNotMatch(
    output,
    /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029]/
  );
});

test("bounds optional text fields and record count with explicit truncation", async () => {
  const events = Array.from({ length: 70 }, () => ({
    type: "test:fail",
    data: {
      name: "n".repeat(400),
      file: "f".repeat(200),
      details: {
        error: {
          name: "e".repeat(100),
          code: "c".repeat(100),
          message: "m".repeat(2000),
          cause: "ignored primitive",
        },
      },
    },
  }));
  const { data, output } = await report([
    ...events,
    summary({ tests: 70, failed: 70 }),
  ]);
  assert.equal(data.events.failed, 70);
  assert.equal(data.summary.failed, 70);
  assert.ok(data.cases.length <= 64);
  assert.equal(data.cases[0].name.length, 256);
  assert.equal(data.cases[0].file.length, 128);
  assert.equal(data.cases[0].error.name.length, 64);
  assert.equal(data.cases[0].error.code.length, 64);
  assert.equal(data.cases[0].error.message.length, 1024);
  assert.equal(data.truncated, true);
  assert.ok(Buffer.byteLength(output) <= 65536);
});

test("byte cap includes escaped expansion and preserves totals", async () => {
  const events = Array.from({ length: 64 }, () => ({
    type: "test:fail",
    data: {
      name: "case",
      details: {
        error: {
          message: "\u0000".repeat(1024),
          cause: { message: "\u001b".repeat(1024) },
        },
      },
    },
  }));
  const { data, output } = await report([
    ...events,
    summary({ tests: 64, failed: 64 }),
  ]);
  assert.ok(Buffer.byteLength(output) <= 65536);
  assert.ok(data.cases.length < 64);
  assert.equal(data.summary.failed, 64);
  assert.equal(data.truncated, true);
});

for (const shouldFail of [false, true]) {
  test(
    "new pure CLI fixture writes a report and preserves exit " +
      Number(shouldFail),
    (t) => {
      const cwd = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), "helper-reporter-"))
      );
      t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
      const reportFile = path.join(cwd, "results.json");
      fs.writeFileSync(
        path.join(cwd, "fixture.test.mjs"),
        'import {test} from "node:test";\n' +
          'test("pure diagnostic fixture", () => {\n' +
          'console.log("STDOUT_SENTINEL"); console.error("STDERR_SENTINEL");\n' +
          (shouldFail
            ? 'throw new Error("intentional\\u001b[31m failure");\n'
            : "") +
          "});\n"
      );
      const result = spawnSync(
        process.execPath,
        [
          "--test",
          "--test-reporter=spec",
          "--test-reporter-destination=stdout",
          "--test-reporter=" + reporterPath,
          "--test-reporter-destination=" + reportFile,
          path.join(cwd, "fixture.test.mjs"),
        ],
        {
          cwd,
          encoding: "utf8",
          env: {
            ...Object.fromEntries(
              Object.keys(process.env)
                .filter((key) =>
                  [
                    "PATH",
                    "SYSTEMROOT",
                    "WINDIR",
                    "COMSPEC",
                    "PATHEXT",
                    "TEMP",
                    "TMP",
                    "TMPDIR",
                    "NODE_V8_COVERAGE",
                  ].includes(key.toUpperCase())
                )
                .map((key) => [key, process.env[key]])
            ),
            REPORTER_SENTINEL: "ENV_SENTINEL",
          },
        }
      );
      assert.equal(result.status, Number(shouldFail), result.stderr);
      const output = fs.readFileSync(reportFile, "utf8");
      const data = JSON.parse(output);
      const item = data.cases.find(
        (entry) => entry.name === "pure diagnostic fixture"
      );
      assert.equal(item.status, shouldFail ? "failed" : "passed");
      assert.equal(data.summary.failed, Number(shouldFail));
      if (shouldFail) assert.match(item.cause.message, /intentional/);
      assert.doesNotMatch(output, /SENTINEL|"stack"|[\u001b\u007f-\u009f]/);
      assert.ok(Buffer.byteLength(output) <= 65536);
      assert.equal(data.truncated, false);
    }
  );
}

test("source stream failure propagates without a success report", async () => {
  async function* broken() {
    yield { type: "test:summary", data: {} };
    throw new Error("stream failure");
  }
  await assert.rejects(report(broken()), /stream failure/);
});
