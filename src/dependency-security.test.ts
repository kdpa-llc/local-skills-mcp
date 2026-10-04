import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { parse, normalize, equal } from "fast-uri";
import { Address4, Address6, AddressError } from "ip-address";

// These are pure dependency behavior checks, not a network exploit simulation.
describe("URI authority validation", () => {
  it.each([
    "http://[fe80",
    "http://[",
    "http://[not-an-ip",
    "http://[日本",
    "http://example.com]/",
    "http://[example.com]/",
  ])("rejects malformed brackets in %s", (uri) => {
    expect(parse(uri).error).toBeTruthy();
  });

  it("rejects or consistently parses brackets in userinfo", () => {
    const uri = "http://[@127.0.0.1/";
    const parsed = parse(uri);
    expect(Boolean(parsed.error) || parsed.host === new URL(uri).hostname).toBe(
      true
    );
  });

  it.each(["https://example.com/resource", "http://[2001:db8::1]/"])(
    "preserves valid authority handling for %s",
    (uri) => {
      expect(parse(uri).error).toBeUndefined();
    }
  );
});

describe("IPv6 trust-boundary classification", () => {
  it.each([
    "64:ff9b:1:7f00:0:100::",
    "64:ff9b:1::7f00:1",
    "64:ff9b:1::",
    "64:ff9b:1:ffff:ffff:ffff:ffff:ffff",
  ])("classifies NAT64 local-use address %s as private", (address) => {
    expect(new Address6(address).isPrivate()).toBe(true);
  });

  it("preserves the well-known NAT64 loopback classification", () => {
    expect(new Address6("64:ff9b::7f00:1").isLoopback()).toBe(true);
  });

  it("preserves IPv4-mapped private classification", () => {
    expect(new Address6("::ffff:192.168.1.1").isPrivate()).toBe(true);
  });

  it("does not classify an ordinary global address as private", () => {
    expect(new Address6("2606:4700:4700::1111").isPrivate()).toBe(false);
  });
});

describe("Host canonicalization across equivalent spellings", () => {
  it("folds decoded host case", () => {
    expect(parse("//%41.com").host).toBe("a.com");
  });

  it("normalizes the host idempotently", () => {
    expect(normalize("//%41.com")).toBe("//a.com");
    expect(normalize(normalize("//%41.com"))).toBe("//a.com");
  });

  it("compares encoded and literal hosts equally", () => {
    expect(equal("//%41.com", "//a.com")).toBe(true);
  });

  it("preserves path case", () => {
    expect(equal("//%41.com/Path", "//a.com/path")).toBe(false);
  });
});

describe("Address-family containment boundaries", () => {
  it.each(["isInSubnet", "isHostInSubnet"] as const)(
    "%s rejects IPv6 in IPv4",
    (method) => {
      expect(new Address6("a00::1")[method](new Address4("10.0.0.0/8"))).toBe(
        false
      );
    }
  );

  it.each(["isInSubnet", "isHostInSubnet"] as const)(
    "%s rejects IPv4 in IPv6",
    (method) => {
      expect(new Address4("32.0.0.1")[method](new Address6("2000::/3"))).toBe(
        false
      );
    }
  );

  it.each(["isInSubnet", "isHostInSubnet"] as const)(
    "%s preserves same-family and explicit conversion controls",
    (method) => {
      expect(new Address4("10.0.0.1")[method](new Address4("10.0.0.0/8"))).toBe(
        true
      );
      expect(new Address4("8.8.8.8")[method](new Address4("10.0.0.0/8"))).toBe(
        false
      );
      expect(
        new Address6("2001:db8::1")[method](new Address6("2001:db8::/32"))
      ).toBe(true);
      expect(
        new Address6("2001:db9::1")[method](new Address6("2001:db8::/32"))
      ).toBe(false);
      expect(
        new Address6("::ffff:10.0.0.1")
          .to4()
          [method](new Address4("10.0.0.0/8"))
      ).toBe(true);
    }
  );
});

describe("Bounded IPv6 parsing diagnostics", () => {
  it("accepts the 45-character IPv6 boundary", () => {
    const address = "ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255";
    expect(address).toHaveLength(45);
    expect(Address6.isValid(address)).toBe(true);
    expect(new Address6(address).correctForm()).toBe(
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"
    );
  });

  it("rejects 46 characters without an amplified diagnostic", () => {
    const address = "!".repeat(46);
    expect(() => new Address6(address)).toThrow(AddressError);
    try {
      new Address6(address);
    } catch (error) {
      expect(error).toBeInstanceOf(AddressError);
      expect((error as AddressError).parseMessage).toBeUndefined();
    }
    expect(Address6.isValid(address)).toBe(false);
  });
});

type MarkdownToken = {
  type: string;
  children: MarkdownToken[] | null;
};
type MarkdownRenderer = {
  render(source: string): string;
  validateLink(url: string): boolean;
  helpers: {
    parseLinkDestination(
      source: string,
      start: number,
      end: number
    ): { ok: boolean; pos: number; str: string };
  };
  core: {
    ruler: {
      before(
        before: string,
        name: string,
        rule: (state: { tokens: MarkdownToken[] }) => void
      ): void;
    };
  };
};
type MarkdownFactory = new (
  options: Record<string, boolean>
) => MarkdownRenderer;

const dependencyRequire = createRequire(import.meta.url);
const MarkdownCjs = dependencyRequire("markdown-it") as MarkdownFactory;
const markdownEsmUrl = pathToFileURL(
  dependencyRequire.resolve("markdown-it/index.mjs")
).href;
const { default: MarkdownEsm } = (await import(markdownEsmUrl)) as {
  default: MarkdownFactory;
};
const inlineRuleUrl = pathToFileURL(
  dependencyRequire.resolve("markdown-it/lib/rules_inline/linkify.mjs")
).href;
const { default: inlineLinkify } = (await import(inlineRuleUrl)) as {
  default: (state: Record<string, unknown>, silent: boolean) => boolean;
};
const docsOptions = { html: true, linkify: true };

// Tiny deterministic work counters exercise the affected parser rules. They
// neither patch global prototypes nor claim whole-parser timing guarantees.
describe("Bounded Markdown linkification", () => {
  it("bounds child-array reconstruction while preserving soft-break emails", () => {
    const measurements = [8, 16].map((count) => {
      const md = new MarkdownEsm(docsOptions);
      let rewrittenChildren = 0;
      let finalChildren: MarkdownToken[] = [];
      md.core.ruler.before("linkify", "count-child-reconstruction", (state) => {
        for (const token of state.tokens) {
          if (token.type !== "inline" || !token.children) continue;
          let children = token.children;
          finalChildren = children;
          Object.defineProperty(token, "children", {
            configurable: true,
            get: () => children,
            set: (next: MarkdownToken[]) => {
              rewrittenChildren += next.length;
              children = next;
              finalChildren = next;
            },
          });
        }
      });
      const rendered = md.render("a@b.co\n".repeat(count));
      expect(rendered.match(/href="mailto:a@b.co"/g)).toHaveLength(count);
      expect(rendered.match(/\n/g)).toHaveLength(count);
      return {
        count,
        rewrittenChildren,
        budget: 2 * finalChildren.length,
      };
    });
    console.info("markdown-child-work", JSON.stringify(measurements));
    for (const result of measurements) {
      expect(result.rewrittenChildren).toBeLessThanOrEqual(result.budget);
    }
  });

  it("bounds scheme inspection without accepting an unregistered scheme", () => {
    const measurements = [8, 16].map((count) => {
      const text = "a://".repeat(count);
      const md = new MarkdownEsm(docsOptions);
      let inspectedCharacters = 0;
      for (let index = 0; index < count; index++) {
        const position = index * 4 + 1;
        const prefix = text.slice(0, position);
        const state: Record<string, unknown> = {
          md,
          pos: position,
          posMax: text.length,
          linkLevel: 0,
          src: {
            charCodeAt(at: number) {
              inspectedCharacters++;
              return text.charCodeAt(at);
            },
            slice(start: number, end?: number) {
              return text.slice(start, end);
            },
          },
          pending: {
            length: prefix.length,
            match(pattern: RegExp) {
              inspectedCharacters += prefix.length;
              return prefix.match(pattern);
            },
          },
        };
        expect(inlineLinkify(state, false)).toBe(false);
        expect(state.pos).toBe(position);
      }
      return { count, inspectedCharacters, budget: 16 * count };
    });
    console.info("markdown-scheme-work", JSON.stringify(measurements));
    for (const result of measurements) {
      expect(result.inspectedCharacters).toBeLessThanOrEqual(result.budget);
    }
  });

  it("preserves actual ESM and CommonJS rendering with TypeDoc defaults", () => {
    const input = "hello a@b.co\nok a@b.co\n\na://a://\n";
    const expected =
      '<p>hello <a href="mailto:a@b.co">a@b.co</a>\n' +
      'ok <a href="mailto:a@b.co">a@b.co</a></p>\n' +
      "<p>a://a://</p>\n";
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      expect(new Factory(docsOptions).render(input)).toBe(expected);
    }
  });

  it("preserves explicit links when automatic linkification is disabled", () => {
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      const md = new Factory({ html: true, linkify: false });
      expect(md.render("a@b.co a:// [ok](https://example.com)\n")).toBe(
        '<p>a@b.co a:// <a href="https://example.com">ok</a></p>\n'
      );
    }
  });

  it("rejects unsafe destinations while retaining ordinary HTTPS links", () => {
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      const md = new Factory(docsOptions);
      expect(md.validateLink("javascript:alert(1)")).toBe(false);
      expect(md.validateLink("data:text/html,example")).toBe(false);
      expect(md.validateLink("https://example.com")).toBe(true);
      const rendered = md.render(
        "[bad](javascript:alert(1)) [data](data:text/html,example) https://example.com\n"
      );
      expect(rendered).not.toMatch(/href="(?:javascript:|data:)/);
      expect(rendered).toContain('href="https://example.com"');
    }
  });

  it("retains the backslash before a link destination's space separator", () => {
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      const md = new Factory(docsOptions);
      const destination = "foo\\ bar";
      expect(
        md.helpers.parseLinkDestination(destination, 0, destination.length)
      ).toMatchObject({ ok: true, pos: 4, str: "foo\\" });
      expect(md.render('[x](foo\\ "title")\n')).toBe(
        '<p><a href="foo%5C" title="title">x</a></p>\n'
      );
      expect(md.render('[x](https://example.com "title")\n')).toBe(
        '<p><a href="https://example.com" title="title">x</a></p>\n'
      );
    }
  });

  it("recognizes lowercase declarations with HTML enabled and escapes them otherwise", () => {
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      const md = new Factory(docsOptions);
      expect(md.render("<!doctype html>\n\nnext\n")).toBe(
        "<!doctype html>\n<p>next</p>\n"
      );
      expect(md.render("<!DOCTYPE html>\n\nnext\n")).toBe(
        "<!DOCTYPE html>\n<p>next</p>\n"
      );
      expect(
        new Factory({ html: false, linkify: true }).render("<!doctype html>\n")
      ).toBe("<p>&lt;!doctype html&gt;</p>\n");
    }
  });

  it("preserves standard schemes, delimiters and escaped link text", () => {
    for (const Factory of [MarkdownEsm, MarkdownCjs]) {
      const md = new Factory(docsOptions);
      expect(
        md.render("http://example.com https://example.com ftp://example.com\n")
      ).toBe(
        '<p><a href="http://example.com">http://example.com</a> ' +
          '<a href="https://example.com">https://example.com</a> ' +
          '<a href="ftp://example.com">ftp://example.com</a></p>\n'
      );
      expect(md.render("(https://example.com),\n")).toBe(
        '<p>(<a href="https://example.com">https://example.com</a>),</p>\n'
      );
      expect(md.render("[a\\*b](https://example.com)\n")).toBe(
        '<p><a href="https://example.com">a*b</a></p>\n'
      );
    }
  });
});

type BraceExpand = (
  source: string,
  options?: {
    max?: number;
    maxLength?: number;
    maxDepth?: number;
    maxRewrites?: number;
  }
) => string[];
const braceCjs = dependencyRequire("brace-expansion") as {
  expand: BraceExpand;
};
const braceEsm = (await import(
  new URL(
    "./dist/esm/index.js",
    pathToFileURL(dependencyRequire.resolve("brace-expansion/package.json"))
  ).href
)) as { expand: BraceExpand };
const minimatchConsumer = dependencyRequire("minimatch") as {
  braceExpand: (pattern: string) => string[];
};

// Bound work by documented parser budgets and exact outputs, never elapsed time.
describe.each([
  ["CommonJS", braceCjs.expand],
  ["ESM", braceEsm.expand],
] as const)("Brace expansion limits (%s)", (_format, expand) => {
  it("returns a literal when the rewrite budget is exhausted", () => {
    for (const cap of [0, 2]) {
      const source = "{a}" + "}".repeat(cap + 1) + ",z}";
      expect(expand(source, { maxRewrites: cap })).toEqual([source]);
    }
  });

  it("retains the ordinary rewrite within its budget", () => {
    expect(expand("{a},b}", { maxRewrites: 1 })).toEqual(["a}", "b"]);
  });

  it("bounds default rewrites on a small one-kilobyte pattern", () => {
    const source = "{a}" + "}".repeat(1002) + ",z}";
    expect(source.length).toBeLessThan(1100);
    expect(expand(source)).toEqual([source]);
  });

  it("treats nesting beyond an explicit depth budget literally", () => {
    const source = "{{{{{a,b}}}}}";
    expect(expand(source, { maxDepth: 0 })).toEqual([source]);
    expect(expand(source, { maxDepth: 2 })).toEqual([source]);
    expect(expand("{a,b}", { maxDepth: 2 })).toEqual(["a", "b"]);
  });

  it("preserves normal nested, escaped, ranged and limited expansions", () => {
    expect(expand("{a,{b,c}}{1..2}")).toEqual([
      "a1",
      "a2",
      "b1",
      "b2",
      "c1",
      "c2",
    ]);
    expect(expand("\\{a,b\\}")).toEqual(["{a,b}"]);
    expect(expand("{a,b}{1,2}", { max: 1 })).toEqual(["a1"]);
    expect(expand("{aa,bb}", { maxLength: 2 })).toEqual(["aa"]);
  });
});

describe("Actual minimatch brace consumer", () => {
  it("uses the dependency default rewrite bound", () => {
    const source = "{a}" + "}".repeat(1002) + ",z}";
    expect(minimatchConsumer.braceExpand(source)).toEqual([source]);
  });
  it("preserves normal and escaped glob alternatives", () => {
    expect(minimatchConsumer.braceExpand("src/{a,b}{1..2}.ts")).toEqual([
      "src/a1.ts",
      "src/a2.ts",
      "src/b1.ts",
      "src/b2.ts",
    ]);
    expect(minimatchConsumer.braceExpand("src/\\{a,b\\}.ts")).toEqual([
      "src/{a,b}.ts",
    ]);
  });
});

type RetryOptions = {
  method: string;
  body?: import("node:stream").Readable;
  headers?: Record<string, string>;
  retryOptions: {
    maxRetries?: number;
    retry?: (
      error: Error,
      context: unknown,
      callback: (error?: Error) => void
    ) => void;
  };
};
type RetryFixture = {
  onConnect(abort: (error: Error) => void): void;
  onHeaders(
    status: number,
    headers: string[],
    resume: () => void,
    message: string
  ): boolean;
  onData(chunk: Buffer): boolean;
  onError(error: Error): void;
  onComplete(trailers: string[]): void;
};
type RetryHandlers = {
  dispatch(options: RetryOptions, handler: RetryFixture): void;
  handler: {
    onConnect(abort: (error: Error) => void): void;
    onHeaders(status: number): boolean;
    onData(chunk: Buffer): boolean;
    onError(error: Error): void;
    onComplete(): void;
  };
};
// Resolve from the actual Actions consumer without loading it or opening sockets.
const actionsRequire = createRequire(
  new URL("../node_modules/@actions/http-client/lib/index.js", import.meta.url)
);
const NestedRetryHandler = actionsRequire(
  "undici/lib/handler/retry-handler.js"
) as new (options: RetryOptions, handlers: RetryHandlers) => RetryFixture;

const { Readable: FixtureReadable } = dependencyRequire(
  "node:stream"
) as typeof import("node:stream");
const { RequestRetryError: NestedRequestRetryError } = actionsRequire(
  "undici/lib/core/errors.js"
) as { RequestRetryError: typeof Error };

function retryFixture(
  method = "GET",
  retries = true,
  body?: import("node:stream").Readable
) {
  const requests: RetryOptions[] = [];
  const statuses: number[] = [];
  const chunks: Buffer[] = [];
  const errors: Error[] = [];
  const aborts: Error[] = [];
  let cancel: (error: Error) => void = () => {};
  let complete = 0;
  const retry = new NestedRetryHandler(
    {
      method,
      body,
      retryOptions: retries
        ? { retry: (_error, _context, callback) => callback() }
        : { maxRetries: 0 },
    },
    {
      dispatch(options) {
        // A finite in-memory callback sink: no network, timer or recursion.
        if (requests.length >= 2) throw new Error("fixture dispatch budget");
        requests.push(options);
      },
      handler: {
        onConnect(abort) {
          cancel = abort;
        },
        onHeaders(status) {
          statuses.push(status);
          return true;
        },
        onData(chunk) {
          chunks.push(chunk);
          return true;
        },
        onError(error) {
          errors.push(error);
        },
        onComplete() {
          complete++;
        },
      },
    }
  );
  retry.onConnect((error) => aborts.push(error));
  return {
    retry,
    requests,
    statuses,
    errors,
    aborts,
    cancel: (error: Error) => cancel(error),
    body: () => Buffer.concat(chunks).toString(),
    completed: () => complete,
  };
}
const socketFailure = () =>
  Object.assign(new Error("fixture reset"), {
    code: "ECONNRESET",
  });
const resumeFixture = () => {};

describe("Nested Undici retry framing", () => {
  it.each([404, 302])(
    "bounds a resumed %s body to its forwarded length",
    (status) => {
      const f = retryFixture();
      f.retry.onHeaders(
        status,
        ["content-length", "2"],
        resumeFixture,
        "fixture"
      );
      f.retry.onData(Buffer.from("a"));
      f.retry.onError(socketFailure());
      expect(f.requests).toHaveLength(1);
      expect(f.requests[0]?.headers?.range).toBe("bytes=1-1");
      expect(f.statuses).toEqual([status]);
      expect(f.body()).toBe("a");
    }
  );

  it.each([404, 302])(
    "rejects an overlong resume after %s without new downstream headers",
    (status) => {
      const f = retryFixture();
      f.retry.onHeaders(
        status,
        ["content-length", "2"],
        resumeFixture,
        "fixture"
      );
      f.retry.onData(Buffer.from("a"));
      f.retry.onError(socketFailure());
      const accepted = f.retry.onHeaders(
        206,
        ["content-length", "3", "content-range", "bytes 1-3/4"],
        resumeFixture,
        "fixture"
      );
      if (accepted) f.retry.onData(Buffer.from("bcd"));
      expect(accepted).toBe(false);
      expect(f.aborts).toHaveLength(1);
      expect(f.aborts[0]?.message).toMatch(/Content-Range mismatch/);
      expect(f.aborts[0]).toBeInstanceOf(NestedRequestRetryError);
      expect(f.aborts[0]).toMatchObject({ code: "UND_ERR_REQ_RETRY" });
      expect(f.statuses).toEqual([status]);
      expect(f.body()).toBe("a");
    }
  );

  it.each(["GET", "HEAD"])(
    "does not retry a forwarded %s response without a resumable body",
    (method) => {
      const f = retryFixture(method);
      f.retry.onHeaders(
        404,
        method === "HEAD" ? ["content-length", "2"] : [],
        resumeFixture,
        "fixture"
      );
      const error = socketFailure();
      f.retry.onError(error);
      expect(f.requests).toEqual([]);
      expect(f.errors).toEqual([error]);
      expect(f.statuses).toEqual([404]);
    }
  );

  it.each([200, 206])(
    "preserves a valid partial %s response and completes once",
    (status) => {
      const f = retryFixture();
      const headers =
        status === 206
          ? ["content-length", "2", "content-range", "bytes 0-1/2"]
          : ["content-length", "2"];
      f.retry.onHeaders(status, headers, resumeFixture, "fixture");
      f.retry.onData(Buffer.from("a"));
      f.retry.onError(socketFailure());
      expect(f.requests[0]?.headers?.range).toBe("bytes=1-1");
      expect(
        f.retry.onHeaders(
          206,
          ["content-length", "1", "content-range", "bytes 1-1/2"],
          resumeFixture,
          "fixture"
        )
      ).toBe(true);
      f.retry.onData(Buffer.from("b"));
      f.retry.onComplete([]);
      expect(f.statuses).toEqual([status]);
      expect(f.body()).toBe("ab");
      expect(f.completed()).toBe(1);
      expect(f.aborts).toEqual([]);
    }
  );

  it.each(["bytes 0-0/2", "bytes 1-2/3"])(
    "reports %s as a controlled range error",
    (range) => {
      const f = retryFixture();
      f.retry.onHeaders(200, ["content-length", "2"], resumeFixture, "fixture");
      f.retry.onData(Buffer.from("a"));
      f.retry.onError(socketFailure());
      expect(() => {
        const accepted = f.retry.onHeaders(
          206,
          [
            "content-length",
            range === "bytes 0-0/2" ? "1" : "2",
            "content-range",
            range,
          ],
          resumeFixture,
          "fixture"
        );
        expect(accepted).toBe(false);
      }).not.toThrow();
      expect(f.aborts).toHaveLength(1);
      expect(f.aborts[0]?.message).toMatch(/Content-Range mismatch/);
      expect(f.aborts[0]).toBeInstanceOf(NestedRequestRetryError);
      expect(f.aborts[0]).toMatchObject({ code: "UND_ERR_REQ_RETRY" });
      expect(f.body()).toBe("a");
    }
  );

  it("does not replay an already consumed in-memory request body", () => {
    const body = FixtureReadable.from([Buffer.from("a")]);
    try {
      expect(body.read()?.toString()).toBe("a");
      expect(FixtureReadable.isDisturbed(body)).toBe(true);
      const f = retryFixture("POST", true, body);
      const error = socketFailure();
      f.retry.onError(error);
      expect(f.requests).toEqual([]);
      expect(f.errors).toEqual([error]);
    } finally {
      body.destroy();
    }
  });

  it("preserves cancellation and configured zero-retry controls", () => {
    const cancelled = retryFixture();
    const error = socketFailure();
    cancelled.cancel(error);
    cancelled.retry.onError(error);
    expect(cancelled.requests).toEqual([]);
    expect(cancelled.aborts).toEqual([error]);
    expect(cancelled.errors).toEqual([error]);

    const disabled = retryFixture("GET", false);
    disabled.retry.onError(error);
    expect(disabled.requests).toEqual([]);
    expect(disabled.errors).toEqual([error]);
  });
});

type StreamState = {
  origin: string;
  lastEventId: string;
  reconnectionTime: number;
};
type StreamEvent = {
  type: string;
  options: { data: string; lastEventId: string; origin: string };
};
const { EventSourceStream: NestedEventSourceStream } = actionsRequire(
  "undici/lib/web/eventsource/eventsource-stream.js"
) as {
  EventSourceStream: new (options: {
    eventSourceSettings: StreamState;
    push: (event: StreamEvent) => boolean;
  }) => {
    _transform(chunk: Buffer, encoding: string, done: () => void): void;
    destroy(): void;
  };
};

describe("Nested Undici event-stream compatibility", () => {
  it.each([1, 4])(
    "preserves BOM, CRLF and UTF-8 across %s-byte chunks",
    (width) => {
      const state = {
        origin: "https://fixture.invalid",
        lastEventId: "",
        reconnectionTime: 0,
      };
      const events: StreamEvent[] = [];
      const parser = new NestedEventSourceStream({
        eventSourceSettings: state,
        push(event) {
          events.push(event);
          return true;
        },
      });
      const bytes = Buffer.from(
        "\uFEFFid: safe\r\nretry: 12\r\nevent: note\r\ndata: café\r\ndata: two\r\n\r\n"
      );
      let callbacks = 0;
      try {
        for (let i = 0; i < bytes.length; i += width) {
          parser._transform(
            bytes.subarray(i, i + width),
            "buffer",
            () => callbacks++
          );
        }
        expect(callbacks).toBe(Math.ceil(bytes.length / width));
        expect(events).toEqual([
          {
            type: "note",
            options: {
              data: "café\ntwo",
              lastEventId: "safe",
              origin: state.origin,
            },
          },
        ]);
        expect(state.reconnectionTime).toBe(12);
      } finally {
        parser.destroy();
      }
    }
  );

  it("ignores invalid retry and null-containing ID fields", () => {
    const state = {
      origin: "https://fixture.invalid",
      lastEventId: "safe",
      reconnectionTime: 12,
    };
    const events: StreamEvent[] = [];
    const parser = new NestedEventSourceStream({
      eventSourceSettings: state,
      push(event) {
        events.push(event);
        return true;
      },
    });
    try {
      parser._transform(
        Buffer.from("id: bad\0id\nretry: 2x\ndata: ok\n\n"),
        "buffer",
        () => {}
      );
      expect(state).toEqual({
        origin: "https://fixture.invalid",
        lastEventId: "safe",
        reconnectionTime: 12,
      });
      expect(events[0]?.options.data).toBe("ok");
    } finally {
      parser.destroy();
    }
  });
});
