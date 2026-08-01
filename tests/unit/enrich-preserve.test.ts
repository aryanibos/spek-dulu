import { describe, expect, it } from "vitest";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { buildDemoBlueprint } from "@/lib/demos/preset";

describe("enrichBlueprint document preservation", () => {
  it("preserves refined document content when rebuilding artifacts", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    const marker = "REFINED_MARKER_XYZ";
    const refinedDocs = base.documents.map((doc, index) =>
      index === 0
        ? { ...doc, content: `${doc.content}\n\n${marker}`, isDetailed: true }
        : doc,
    );

    const next = enrichBlueprint({
      ...base,
      documents: refinedDocs,
    });

    expect(next.documents[0]?.content).toContain(marker);
    const exported = next.artifacts.find((a) => a.path === `docs/${next.documents[0].fileName}`);
    expect(exported?.content).toContain(marker);
  });

  it("can regenerate documents when explicitly requested", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    const marker = "REFINED_MARKER_XYZ";
    const refinedDocs = base.documents.map((doc, index) =>
      index === 0 ? { ...doc, content: marker, isDetailed: true } : doc,
    );

    const next = enrichBlueprint(
      { ...base, documents: refinedDocs },
      { regenerateDocuments: true },
    );

    expect(next.documents[0]?.content).not.toContain(marker);
    expect(next.documents[0]?.content.length).toBeGreaterThan(800);
  });
});
