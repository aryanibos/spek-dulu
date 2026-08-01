import { describe, expect, it } from "vitest";
import { assertSafePublicUrl } from "@/lib/security/url";

describe("url safety", () => {
  it("blocks localhost", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ips", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });
});
