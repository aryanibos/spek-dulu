import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { hasGeminiKey, resolveGeminiApiKey } from "@/lib/ai/gemini-provider";
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
    expect(hasGeminiKey()).toBe(false);
    expect(resolveGeminiApiKey()).toBeUndefined();

    vi.stubEnv("GEMINI_API_KEY", "   ");
    expect(shouldGuardApiRoutes()).toBe(false);
    expect(hasGeminiKey()).toBe(false);
    expect(resolveGeminiApiKey()).toBeUndefined();

    vi.stubEnv("GEMINI_API_KEY", "  test-key  ");
    expect(shouldGuardApiRoutes()).toBe(true);
    expect(hasGeminiKey()).toBe(true);
    expect(resolveGeminiApiKey()).toBe("test-key");
  });

  it("marks URL-fetch API paths for always-on same-origin guard", () => {
    expect(shouldAlwaysGuardApiPath("/api/analyze-url")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/analyze-url/")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/blueprint")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/blueprint/")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/visual-design")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/visual-design/")).toBe(true);
    expect(shouldAlwaysGuardApiPath("/api/interview")).toBe(false);
  });

  it("rejects unauthenticated demo-mode POSTs without Sec-Fetch-Site", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const interview = makeRequest("https://spekdulu.example/api/interview", {
      host: "spekdulu.example",
    });
    const refine = makeRequest("https://spekdulu.example/api/refine", {
      host: "spekdulu.example",
    });

    expect(isSameOriginApiRequest(interview)).toBe(false);
    expect(isSameOriginApiRequest(refine)).toBe(false);
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
