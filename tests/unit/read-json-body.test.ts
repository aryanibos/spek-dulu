import { describe, expect, it } from "vitest";
import {
  MAX_API_REQUEST_BODY_BYTES,
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/security/read-json-body";

function makeRequest(body: string | null, contentLength?: string): Request {
  const init: RequestInit = {
    method: "POST",
    headers: contentLength ? { "Content-Length": contentLength } : undefined,
  };
  if (body !== null) {
    init.body = body;
  }
  return new Request("http://localhost/api/test", init);
}

describe("readJsonBody", () => {
  it("parses valid JSON within the size limit", async () => {
    const payload = { idea: "A todo app for students" };
    const result = await readJsonBody(makeRequest(JSON.stringify(payload)));
    expect(result).toEqual(payload);
  });

  it("rejects bodies over the byte limit while streaming", async () => {
    const oversized = "x".repeat(MAX_API_REQUEST_BODY_BYTES + 1);
    await expect(readJsonBody(makeRequest(JSON.stringify({ data: oversized })))).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects when Content-Length exceeds the limit before reading", async () => {
    await expect(
      readJsonBody(makeRequest("{}", String(MAX_API_REQUEST_BODY_BYTES + 1))),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects missing bodies", async () => {
    await expect(readJsonBody(makeRequest(null))).rejects.toThrow("Request body is required.");
  });

  it("rejects invalid JSON", async () => {
    await expect(readJsonBody(makeRequest("{not json"))).rejects.toThrow(
      "Request body must be valid JSON.",
    );
  });
});
