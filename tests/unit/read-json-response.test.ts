import { describe, expect, it } from "vitest";
import { readJsonResponse } from "@/lib/utils";

function mockResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("readJsonResponse", () => {
  it("returns parsed JSON on success", async () => {
    const data = await readJsonResponse<{ ok: boolean }>(
      mockResponse('{"ok":true}', { status: 200 }),
      "Request failed.",
    );
    expect(data.ok).toBe(true);
  });

  it("uses API error message when response is not ok", async () => {
    await expect(
      readJsonResponse(
        mockResponse('{"error":"Bad input"}', { status: 400 }),
        "Request failed.",
      ),
    ).rejects.toThrow("Bad input");
  });

  it("falls back when error response is not JSON", async () => {
    await expect(
      readJsonResponse(mockResponse("upstream timeout", { status: 502 }), "Request failed."),
    ).rejects.toThrow("Request failed.");
  });
});
