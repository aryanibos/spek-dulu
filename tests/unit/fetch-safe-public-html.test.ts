import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLookup, mockUndiciFetch, mockAgentClose } = vi.hoisted(() => ({
  mockLookup: vi.fn(),
  mockUndiciFetch: vi.fn(),
  mockAgentClose: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: mockLookup,
}));

vi.mock("undici", () => ({
  Agent: class MockAgent {
    close = mockAgentClose;
  },
  fetch: mockUndiciFetch,
}));

import {
  fetchSafePublicHtml,
  MAX_HTML_BYTES,
  MAX_REDIRECTS,
} from "@/lib/security/url";

function makeBody(chunks: Uint8Array[]) {
  let index = 0;
  return {
    getReader() {
      return {
        async read() {
          if (index >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: chunks[index++] };
        },
        cancel: vi.fn(),
      };
    },
    cancel: vi.fn(),
  };
}

function makeResponse(
  status: number,
  init: { body?: ReturnType<typeof makeBody>; headers?: Record<string, string> } = {},
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name: string) {
        return init.headers?.[name.toLowerCase()] ?? null;
      },
    },
    body: init.body,
  };
}

describe("fetchSafePublicHtml", () => {
  beforeEach(() => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    mockUndiciFetch.mockReset();
    mockAgentClose.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("follows redirects and returns HTML", async () => {
    mockUndiciFetch
      .mockResolvedValueOnce(
        makeResponse(302, {
          headers: { location: "https://example.com/final" },
          body: makeBody([]),
        }),
      )
      .mockResolvedValueOnce(
        makeResponse(200, {
          body: makeBody([new TextEncoder().encode("<html>#112233</html>")]),
        }),
      );

    const html = await fetchSafePublicHtml("https://example.com/start");
    expect(html).toBe("<html>#112233</html>");
    expect(mockUndiciFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when redirect limit is exceeded", async () => {
    mockUndiciFetch.mockImplementation(() =>
      Promise.resolve(
        makeResponse(302, {
          headers: { location: "https://example.com/next" },
          body: makeBody([]),
        }),
      ),
    );

    await expect(
      fetchSafePublicHtml("https://example.com/start"),
    ).rejects.toThrow("Too many redirects.");
    expect(mockUndiciFetch).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it("throws when redirect is missing Location header", async () => {
    mockUndiciFetch.mockResolvedValueOnce(makeResponse(301, { body: makeBody([]) }));

    await expect(fetchSafePublicHtml("https://example.com")).rejects.toThrow(
      /Location header/i,
    );
  });

  it("throws on non-OK upstream responses and cancels the body", async () => {
    const body = makeBody([]);
    mockUndiciFetch.mockResolvedValueOnce(makeResponse(503, { body }));

    await expect(fetchSafePublicHtml("https://example.com")).rejects.toThrow(
      /503/,
    );
    expect(body.cancel).toHaveBeenCalled();
  });

  it("throws when the response body exceeds the byte limit", async () => {
    const chunk = new Uint8Array(MAX_HTML_BYTES);
    const readerCancel = vi.fn();
    const body = {
      getReader() {
        let index = 0;
        const chunks = [chunk, new Uint8Array([1])];
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
          cancel: readerCancel,
        };
      },
      cancel: vi.fn(),
    };
    mockUndiciFetch.mockResolvedValueOnce(makeResponse(200, { body }));

    await expect(fetchSafePublicHtml("https://example.com")).rejects.toThrow(
      /exceeds limit/i,
    );
    expect(readerCancel).toHaveBeenCalled();
  });

  it("blocks redirects to private addresses", async () => {
    mockUndiciFetch.mockResolvedValueOnce(
      makeResponse(302, {
        headers: { location: "http://127.0.0.1/private" },
        body: makeBody([]),
      }),
    );

    await expect(fetchSafePublicHtml("https://example.com")).rejects.toThrow();
    expect(mockUndiciFetch).toHaveBeenCalledTimes(1);
  });

  it("pins fetch to the resolved public address", async () => {
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    mockUndiciFetch.mockResolvedValueOnce(
      makeResponse(200, {
        body: makeBody([new TextEncoder().encode("ok")]),
      }),
    );

    await fetchSafePublicHtml("https://example.com");
    expect(mockUndiciFetch).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({
        dispatcher: expect.any(Object),
      }),
    );
    expect(mockAgentClose).toHaveBeenCalled();
  });
});
