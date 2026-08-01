import { describe, expect, it } from "vitest";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { buildDemoBlueprint } from "@/lib/demos/preset";

describe("url safety", () => {
  it("blocks localhost", async () => {
    const { assertSafePublicUrl } = await import("@/lib/security/url");
    await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("blocks private ips", async () => {
    const { assertSafePublicUrl } = await import("@/lib/security/url");
    await expect(assertSafePublicUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("blocks 0.0.0.0", async () => {
    const { assertSafePublicUrl } = await import("@/lib/security/url");
    await expect(assertSafePublicUrl("http://0.0.0.0")).rejects.toThrow();
  });

  it("blocks cgnat range", async () => {
    const { assertSafePublicUrl } = await import("@/lib/security/url");
    await expect(assertSafePublicUrl("http://100.64.0.1")).rejects.toThrow();
  });
});

describe("enrichBlueprint", () => {
  it("preserves user-edited documents by default", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Test app", {
        user: "Owner",
        job: "Track tasks",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Keep it small",
      }),
    );

    const editedContent = `${base.documents[0].content}\n\n## USER REFINEMENT\nAdded webhook assumptions.`;
    const edited = {
      ...base,
      documents: base.documents.map((doc, index) =>
        index === 0 ? { ...doc, content: editedContent } : doc,
      ),
    };

    const reEnriched = enrichBlueprint(edited);
    expect(reEnriched.documents[0].content).toContain("USER REFINEMENT");
    expect(reEnriched.coherence).toBeDefined();
  });

  it("regenerates documents when explicitly requested", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Test app", {
        user: "Owner",
        job: "Track tasks",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Keep it small",
      }),
    );

    const edited = {
      ...base,
      documents: base.documents.map((doc) => ({
        ...doc,
        content: "CUSTOM ONLY",
      })),
    };

    const reEnriched = enrichBlueprint(edited, { regenerateDocuments: true });
    expect(reEnriched.documents[0].content).not.toBe("CUSTOM ONLY");
    expect(reEnriched.documents[0].content.length).toBeGreaterThan(100);
  });
});
