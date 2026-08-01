import { describe, expect, it } from "vitest";
import {
  assertSafePublicUrl,
  assertSafeRedirectTarget,
  isPrivateIp,
  readResponseTextWithCap,
} from "@/lib/security/url";

describe("url safety", () => {
  it("blocks localhost", async () => {
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ipv4 loopback", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("blocks ipv4-mapped ipv6 loopback", async () => {
    await expect(assertSafePublicUrl("http://[::ffff:127.0.0.1]")).rejects.toThrow(
      /Private IP|private/i,
    );
  });

  it("blocks 0.0.0.0", async () => {
    await expect(assertSafePublicUrl("http://0.0.0.0")).rejects.toThrow(/Private IP|private/i);
  });

  it("blocks uppercase IPv6 ULA", async () => {
    await expect(assertSafePublicUrl("http://[FC00::1]")).rejects.toThrow(/Private IP|private/i);
  });

  it("blocks CGNAT 100.64/10", async () => {
    await expect(assertSafePublicUrl("http://100.64.1.1")).rejects.toThrow(/Private IP|private/i);
  });

  it("classifies private IP variants", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIp("[::ffff:7f00:1]")).toBe(true);
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true);
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("FC00::1")).toBe(true);
    expect(isPrivateIp("[fc00::1]")).toBe(true);
    expect(isPrivateIp("fd12::1")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("100.127.255.255")).toBe(true);
    expect(isPrivateIp("100.63.255.255")).toBe(false);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("rejects redirect targets that resolve to private hosts", async () => {
    await expect(
      assertSafeRedirectTarget(new URL("https://example.com/start"), "http://127.0.0.1/secret"),
    ).rejects.toThrow(/Private IP|private/i);

    await expect(
      assertSafeRedirectTarget(new URL("https://example.com/start"), "http://[::ffff:127.0.0.1]/"),
    ).rejects.toThrow(/Private IP|private/i);
  });

  it("caps downloaded response bodies", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(50)));
        controller.enqueue(new TextEncoder().encode("y".repeat(50)));
        controller.enqueue(new TextEncoder().encode("z".repeat(50)));
        controller.close();
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(readResponseTextWithCap(response, 100)).rejects.toThrow(/byte limit/i);
  });

  it("rejects oversized content-length before reading", async () => {
    const response = new Response("tiny", {
      status: 200,
      headers: { "Content-Length": "999999", "Content-Type": "text/plain" },
    });
    await expect(readResponseTextWithCap(response, 100)).rejects.toThrow(/byte limit/i);
  });
});
