import { describe, expect, it } from "vitest";
import { renderTokensCss } from "@/lib/artifacts/render";
import { buildDemoBlueprint, buildDemoVisual } from "@/lib/demos/preset";
import {
  analyzeVisualRequestSchema,
  blueprintRequestSchema,
  interviewRequestSchema,
  projectBlueprintSchema,
  refineRequestSchema,
  specDocumentSchema,
  visualDesignRequestSchema,
} from "@/lib/schema";
import { blendHintsIntoVisual } from "@/lib/visual/analyze-url";

describe("schema payload limits", () => {
  it("rejects unknown refine fileName values", () => {
    const result = refineRequestSchema.safeParse({
      projectId: "project_test",
      fileName: "../../../etc/passwd",
      currentContent: "content",
      userQuery: "Tighten scope",
      blueprintJson: "{}",
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized refine currentContent", () => {
    const result = refineRequestSchema.safeParse({
      projectId: "project_test",
      fileName: "01_PRD.md",
      currentContent: "x".repeat(120_001),
      userQuery: "Tighten scope",
      blueprintJson: "{}",
    });
    expect(result.success).toBe(false);
  });

  it("rejects answer maps with more than 20 keys", () => {
    const answers = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`key_${i}`, "value"]),
    );
    const result = blueprintRequestSchema.safeParse({
      idea: "A simple todo app for students",
      answers,
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized interview previousAnswers keys", () => {
    const result = interviewRequestSchema.safeParse({
      idea: "A simple todo app for students who need reminders",
      previousAnswers: { ["k".repeat(101)]: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("requires screenshot fields together on blueprint requests", () => {
    const result = blueprintRequestSchema.safeParse({
      idea: "A simple todo app for students",
      answers: { user: "Student" },
      screenshotBase64: "a".repeat(30),
    });
    expect(result.success).toBe(false);
  });

  it("requires url for visual design from-url action", () => {
    const result = visualDesignRequestSchema.safeParse({
      action: "from-url",
      blueprintJson: "{}",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported screenshot mime types", () => {
    const result = analyzeVisualRequestSchema.safeParse({
      screenshotBase64: "a".repeat(30),
      screenshotMimeType: "image/svg+xml",
    });
    expect(result.success).toBe(false);
  });

  it("rejects path traversal document fileName values", () => {
    const result = specDocumentSchema.safeParse({
      key: "01_PRD",
      fileName: "../../evil.md",
      title: "PRD",
      content: "content",
      isDetailed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for legacy projects missing chat and versions", () => {
    const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    const legacy = { ...blueprint } as Record<string, unknown>;
    delete legacy.chat;
    delete legacy.versions;

    const parsed = projectBlueprintSchema.parse(legacy);
    expect(parsed.chat).toEqual([]);
    expect(parsed.versions).toEqual([]);
  });
});

describe("URL hint blending", () => {
  it("applies extracted CSS hex hints into demo visual tokens", () => {
    const base = buildDemoVisual("Reference");
    const blended = blendHintsIntoVisual(base, ["#112233"], "example.com");

    expect(blended.colors.find((c) => c.name === "Primary")?.hex).toBe("#112233");
    expect(blended.summary).toContain("example.com");
  });

  it("shifts extracted hints for Inspired originality mode", () => {
    const base = buildDemoVisual("Inspired");
    const blended = blendHintsIntoVisual(base, ["#112233"], "example.com");

    expect(blended.colors.find((c) => c.name === "Primary")?.hex).not.toBe("#112233");
  });

  it("includes originality warnings when no CSS hints are found", () => {
    const base = buildDemoVisual("Inspired");
    const blended = blendHintsIntoVisual(base, [], "example.com");

    expect(blended.warnings.some((w) => w.includes("Inspired mode"))).toBe(true);
    expect(blended.warnings.some((w) => w.includes("No CSS color hints found"))).toBe(true);
  });
});

describe("tokens.css safety", () => {
  it("falls back when visual tokens contain CSS injection", () => {
    const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });

    blueprint.visual = {
      ...blueprint.visual!,
      colors: [
        {
          name: "Primary",
          hex: "#fff; } @import url('https://evil.example/track.css'); /*",
          role: "accent",
          source: "generated",
          confidence: 50,
          explanation: "malicious",
        },
      ],
      radii: {
        button: "12px; background: url(https://evil.example)",
        card: "18px",
        modal: "20px",
      },
    };

    const css = renderTokensCss(blueprint);
    expect(css).not.toContain("@import");
    expect(css).toContain("--accent: #2196F3;");
    expect(css).toContain("--radius-button: 12px;");
  });
});
