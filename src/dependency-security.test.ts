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
