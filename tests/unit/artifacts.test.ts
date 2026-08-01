import { describe, expect, it } from "vitest";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { renderFullPrd } from "@/lib/artifacts/prd";
import { renderCursorSkill } from "@/lib/artifacts/skill";
import { validateBlueprint } from "@/lib/coherence/validate";
import { buildDemoBlueprint } from "@/lib/demos/preset";

describe("artifact generation", () => {
  it("creates a valid Cursor skill and package paths", () => {
    const blueprint = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    const skill = renderCursorSkill(blueprint);
    expect(skill).toContain("name: spekdulu");
    expect(skill).toContain("Build Now only");
    expect(blueprint.artifacts.some((a) => a.path === ".cursor/skills/spekdulu/SKILL.md")).toBe(
      true,
    );
    expect(blueprint.documents).toHaveLength(11);

    const coherence = validateBlueprint(blueprint);
    expect(coherence.score).toBeGreaterThan(50);
  });

  it("generates a complete PRD with slide-aligned sections", () => {
    const blueprint = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    const prd = renderFullPrd(blueprint);
    expect(prd).toContain("## 2. Problem");
    expect(prd).toContain("## 5. User stories");
    expect(prd).toContain("**As a**");
    expect(prd).toContain("## 6. Non-goals");
    expect(prd).toContain("## 7. Acceptance criteria");
    expect(prd).toContain("## 8. Constraints");
    expect(prd).toContain("### Time");
    expect(prd).toContain("### Cost");
    expect(prd).toContain("### People");

    const exported = blueprint.documents.find((d) => d.key === "01_PRD");
    expect(exported?.content).toContain("User stories");
    expect(exported?.content).toContain("Non-goals");
  });

  it("generates full impressive docs for all 11 package files", () => {
    const blueprint = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    const byKey = Object.fromEntries(blueprint.documents.map((d) => [d.key, d.content]));
    expect(byKey["02_DESIGN_SYSTEM"]).toContain("## 1. Visual direction");
    expect(byKey["02_DESIGN_SYSTEM"]).toContain("Color system");
    expect(byKey["03_INFORMATION_ARCHITECTURE"]).toContain("Information Architecture");
    expect(byKey["04_COMPONENT_LIBRARY"]).toContain("Component");
    expect(byKey["05_FRONTEND_ARCHITECTURE"]).toContain("Frontend");
    expect(byKey["06_BACKEND_ARCHITECTURE"]).toContain("Backend");
    expect(byKey["07_DATABASE_SCHEMA"]).toContain("Database");
    expect(byKey["08_SEO_ACCESSIBILITY"]).toContain("Accessibility");
    expect(byKey["09_IMPLEMENTATION_ROADMAP"]).toContain("Roadmap");
    expect(byKey["10_DESIGN_ADAPTATION_GUIDE"]).toContain("Adaptation");
    expect(byKey["11_MASTER_BUILD_PROMPT"]).toContain("Master Build");

    for (const doc of blueprint.documents) {
      expect(doc.content.length).toBeGreaterThan(800);
      expect(doc.isDetailed).toBe(true);
    }
  });

  it("preserves existing documents when enriching without regenerate flag", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );
    const editedPrd = base.documents.find((d) => d.key === "01_PRD");
    expect(editedPrd).toBeDefined();
    const customContent = `${editedPrd!.content}\n\n## User refinement\nKeep webhook assumptions.\n`;
    const withEdit = {
      ...base,
      documents: base.documents.map((doc) =>
        doc.key === "01_PRD" ? { ...doc, content: customContent } : doc,
      ),
    };

    const enriched = enrichBlueprint(withEdit);
    const prd = enriched.documents.find((d) => d.key === "01_PRD");
    expect(prd?.content).toContain("User refinement");
    expect(prd?.content).toContain("Keep webhook assumptions.");
  });

  it("regenerates documents when regenerateDocuments is true", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );
    const withEdit = {
      ...base,
      documents: base.documents.map((doc) =>
        doc.key === "01_PRD" ? { ...doc, content: "CUSTOM ONLY CONTENT" } : doc,
      ),
    };

    const enriched = enrichBlueprint(withEdit, { regenerateDocuments: true });
    const prd = enriched.documents.find((d) => d.key === "01_PRD");
    expect(prd?.content).not.toBe("CUSTOM ONLY CONTENT");
    expect(prd?.content).toContain("User stories");
  });

  it("regenerates only selected document keys", () => {
    const base = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );
    const withEdits = {
      ...base,
      documents: base.documents.map((doc) => {
        if (doc.key === "01_PRD") {
          return { ...doc, content: "CUSTOM PRD CONTENT" };
        }
        if (doc.key === "02_DESIGN_SYSTEM") {
          return { ...doc, content: "STALE DESIGN CONTENT" };
        }
        return doc;
      }),
    };

    const enriched = enrichBlueprint(withEdits, {
      regenerateDocumentKeys: ["02_DESIGN_SYSTEM", "10_DESIGN_ADAPTATION_GUIDE"],
    });

    expect(enriched.documents.find((d) => d.key === "01_PRD")?.content).toBe("CUSTOM PRD CONTENT");
    expect(enriched.documents.find((d) => d.key === "02_DESIGN_SYSTEM")?.content).not.toBe(
      "STALE DESIGN CONTENT",
    );
    expect(enriched.documents.find((d) => d.key === "02_DESIGN_SYSTEM")?.content).toContain(
      "Visual direction",
    );
    expect(enriched.documents.find((d) => d.key === "10_DESIGN_ADAPTATION_GUIDE")?.content).toContain(
      "Adaptation",
    );
  });
});
