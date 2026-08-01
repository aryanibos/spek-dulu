import { describe, expect, it } from "vitest";
import { assertSafePublicUrl } from "@/lib/security/url";

describe("url safety", () => {
  it("blocks localhost", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ips", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("blocks 0.0.0.0", async () => {
    await expect(assertSafePublicUrl("http://0.0.0.0")).rejects.toThrow();
  });

  it("blocks ipv4-mapped loopback", async () => {
    await expect(assertSafePublicUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow();
  });

  it("blocks cgnat range", async () => {
    await expect(assertSafePublicUrl("http://100.64.0.1")).rejects.toThrow();
  });
});
