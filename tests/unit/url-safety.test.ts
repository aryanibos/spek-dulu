import { describe, expect, it } from "vitest";
import { assertSafePublicUrl } from "@/lib/security/url";

describe("url safety", () => {
  it("blocks localhost", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ips", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("blocks full loopback range", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.2")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://127.255.255.254")).rejects.toThrow();
  });

  it("blocks 0.0.0.0", async () => {
    await expect(assertSafePublicUrl("http://0.0.0.0")).rejects.toThrow();
  });

  it("blocks CGNAT range", async () => {
    await expect(assertSafePublicUrl("http://100.64.0.1")).rejects.toThrow();
  });

  it("blocks non-http protocols", async () => {
    await expect(assertSafePublicUrl("file:///etc/passwd")).rejects.toThrow(/http and https/i);
  });

  it("blocks credentials in URL", async () => {
    await expect(assertSafePublicUrl("http://user:pass@example.com")).rejects.toThrow(
      /credentials/i,
    );
  });
});
