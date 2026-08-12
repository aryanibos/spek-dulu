import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  isSameOriginApiRequest,
  shouldAlwaysGuardApiPath,
  shouldGuardApiRoutes,
} from "@/lib/security/api-guard";

function makeRequest(
  url: string,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return new NextRequest(new URL(url), {
    method,
    headers,
  });
}

describe("api guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables guarding only when GEMINI_API_KEY is configured", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(shouldGuardApiRoutes()).toBe(false);

    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(shouldGuardApiRoutes()).toBe(true);
  });

  it("always guards URL-fetch API paths even without GEMINI_API_KEY", () => {
    expect(shouldAlwaysGuardApiPath("/api/analyze-url")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/visual-design")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/interview")).toBe(false);
  });

  it("accepts same-origin requests via Sec-Fetch-Site", () => {
    const request = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
      "sec-fetch-site": "same-origin",
    });

    expect(isSameOriginApiRequest(request)).toBe(true);
  });

  it("rejects Origin-only requests without Sec-Fetch-Site", () => {
    const request = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
      origin: "https://spekdulu.example",
    });

    expect(isSameOriginApiRequest(request)).toBe(false);
  });

  it("rejects Referer-only requests without Sec-Fetch-Site", () => {
    const request = makeRequest("https://spekdulu.example/api/blueprint", {
      host: "spekdulu.example",
      referer: "https://spekdulu.example/workspace/project_1",
    });

    expect(isSameOriginApiRequest(request)).toBe(false);
  });

  it("rejects cross-origin requests", () => {
    const request = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    });

    expect(isSameOriginApiRequest(request)).toBe(false);
  });

  it("rejects spoofed Origin when Sec-Fetch-Site is cross-site", () => {
    const request = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
      origin: "https://spekdulu.example",
      "sec-fetch-site": "cross-site",
    });

    expect(isSameOriginApiRequest(request)).toBe(false);
  });

  it("rejects requests without origin signals", () => {
    const request = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
    });

    expect(isSameOriginApiRequest(request)).toBe(false);
  });
});
