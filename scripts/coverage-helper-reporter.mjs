const MAX_BYTES = 65536;
const COUNT_KEYS = [
  "tests",
  "suites",
  "passed",
  "failed",
  "cancelled",
  "skipped",
  "todo",
  "topLevel",
];

export default async function* reporter(source) {
  const report = {
    schemaVersion: 1,
    node: process.version,
    platform: process.platform,
    events: { passed: 0, failed: 0 },
    summary: null,
    cases: [],
    truncated: false,
  };
  const text = (value, limit) => {
    if (typeof value !== "string") return undefined;
    if (value.length > limit) report.truncated = true;
    return value.slice(0, limit);
  };
  const number = (value) =>
    Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  const errorFields = (error) =>
    error && typeof error === "object"
      ? {
          name: text(error.name, 64),
          code: text(error.code, 64),
          message: text(error.message, 1024),
        }
      : undefined;

  for await (const event of source) {
    const data = event.data ?? {};
    if (event.type === "test:summary") {
      // File summaries precede the runner's aggregate summary.
      if (!data.file) {
        report.summary = Object.fromEntries(
          COUNT_KEYS.map((key) => [key, number(data.counts?.[key])])
        );
      }
      continue;
    }
    if (!["test:pass", "test:fail"].includes(event.type)) continue;
    const failed = event.type === "test:fail";
    report.events[failed ? "failed" : "passed"]++;
    if (report.cases.length === 64) {
      report.truncated = true;
      continue;
    }
    const error = data.details?.error;
    report.cases.push({
      name: text(data.name, 256),
      status: failed ? "failed" : "passed",
      file: text(
        typeof data.file === "string"
          ? data.file.split(/[\\/]/).pop()
          : undefined,
        128
      ),
      line: number(data.line),
      column: number(data.column),
      error: failed ? errorFields(error) : undefined,
      cause: failed ? errorFields(error?.cause) : undefined,
    });
  }

  // JSON escapes C0 controls; escape C1 controls and line separators as well.
  const serialize = () =>
    JSON.stringify(report).replace(
      /[\u007f-\u009f\u2028\u2029]/g,
      (character) =>
        "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")
    ) + "\n";
  let output = serialize();
  while (Buffer.byteLength(output) > MAX_BYTES && report.cases.length) {
    report.cases.pop();
    report.truncated = true;
    output = serialize();
  }
  yield output;
}
