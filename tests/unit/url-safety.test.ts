import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (hostname: string) => {
    if (hostname === "safe.example") return [{ address: "93.184.216.34", family: 4 }];
    if (hostname === "127.0.0.1") return [{ address: "127.0.0.1", family: 4 }];
    throw new Error("ENOTFOUND");
  }),
}));

import { assertSafePublicUrl, fetchSafePublicHtml } from "@/lib/security/url";

describe("url safety", () => {
  it("blocks localhost", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ips", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("blocks ipv4-mapped loopback", async () => {
    await expect(assertSafePublicUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow();
  });

  it("blocks cgnat range", async () => {
    await expect(assertSafePublicUrl("http://100.64.0.1")).rejects.toThrow();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("re-validates redirect targets before following", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url === "https://safe.example/start") {
          return new Response("", {
            status: 302,
            headers: { Location: "http://127.0.0.1/internal" },
          });
        }
        throw new Error(`Unexpected fetch to ${url}`);
      }),
    );

    await expect(fetchSafePublicHtml("https://safe.example/start")).rejects.toThrow(
      /private|blocked|Unable to resolve/i,
    );
  });

  it("follows safe redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url === "https://safe.example/start") {
          return new Response("", {
            status: 302,
            headers: { Location: "https://safe.example/final" },
          });
        }
        if (url === "https://safe.example/final") {
          return new Response("<html>#336699</html>", { status: 200 });
        }
        throw new Error(`Unexpected fetch to ${url}`);
      }),
    );

    const html = await fetchSafePublicHtml("https://safe.example/start");
    expect(html).toContain("#336699");
  });
});
