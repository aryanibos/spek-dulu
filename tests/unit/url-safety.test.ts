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

  it("blocks IPv6 loopback and unique-local", async () => {
    await expect(assertSafePublicUrl("http://[::1]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[fc00::1]")).rejects.toThrow();
  });

  it("blocks IPv6 unspecified addresses", async () => {
    await expect(assertSafePublicUrl("http://[::]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[::0]")).rejects.toThrow();
  });

  it("blocks full IPv6 link-local range (fe80::/10)", async () => {
    await expect(assertSafePublicUrl("http://[fe80::1]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[fe81::1]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[febf::1]")).rejects.toThrow();
  });

  it("blocks alternate IPv4-mapped IPv6 loopback and metadata forms", async () => {
    await expect(assertSafePublicUrl("http://[::ffff:0:7f00:1]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[::ffff:0:a9fe:a9fe]")).rejects.toThrow();
    await expect(
      assertSafePublicUrl("http://[0:0:0:0:0:ffff:127.0.0.1]"),
    ).rejects.toThrow();
    await expect(
      assertSafePublicUrl("http://[::ffff:0:ffff:127.0.0.1]"),
    ).rejects.toThrow();
  });

  it("blocks compressed IPv6 link-local forms", async () => {
    await expect(assertSafePublicUrl("http://[::fe80:1]")).rejects.toThrow();
  });

  it("blocks 6to4 addresses that embed private IPv4", async () => {
    await expect(assertSafePublicUrl("http://[2002:7f00:0001::]")).rejects.toThrow();
    await expect(assertSafePublicUrl("http://[2002:ac10:0001::]")).rejects.toThrow();
  });
});
