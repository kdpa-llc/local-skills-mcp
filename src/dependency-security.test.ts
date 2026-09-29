import { describe, expect, it } from "vitest";
import { parse } from "fast-uri";
import { Address6 } from "ip-address";

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
