import { describe, expect, it } from "vitest";
import { buildArtifacts, renderDesignMd, renderProductMd, renderTokensCss } from "@/lib/artifacts/render";
import { resolveRefineSourceContent } from "@/lib/artifacts/documents";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { renderCursorSkill } from "@/lib/artifacts/skill";
import { buildDemoBlueprint, buildDemoVisual } from "@/lib/demos/preset";
import {
  analyzeVisualRequestSchema,
  artifactPathSchema,
  blueprintRequestSchema,
  colorTokenSchema,
  generateDocRequestSchema,
  interviewRequestSchema,
  projectBlueprintSchema,
  refineRequestSchema,
  specDocumentSchema,
  visualDesignRequestSchema,
} from "@/lib/schema";
import { sanitizeYamlScalar, stripDangerousMarkdown } from "@/lib/security/sanitize";
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

  it("rejects oversized document content", () => {
    const result = specDocumentSchema.safeParse({
      key: "01_PRD",
      fileName: "01_PRD.md",
      title: "PRD",
      content: "x".repeat(120_001),
      isDetailed: false,
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid generate-doc documentKey values", () => {
    const result = generateDocRequestSchema.safeParse({
      documentKey: "../../../etc/passwd",
      blueprintJson: "{}",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed visual color hex values", () => {
    const result = colorTokenSchema.safeParse({
      name: "Primary",
      hex: "#fff; } @import url('evil.css'); /*",
      role: "accent",
      source: "generated",
      confidence: 50,
      explanation: "malicious",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zip-slip artifact paths", () => {
    expect(artifactPathSchema.safeParse("docs/../../etc/passwd").success).toBe(false);
    expect(artifactPathSchema.safeParse(".cursor/skills/spekdulu/SKILL.md").success).toBe(true);
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

  it("rejects oversized chat and version history arrays", () => {
    const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });

    const tooManyChat = {
      ...blueprint,
      chat: Array.from({ length: 501 }, (_, i) => ({
        id: `chat_${i}`,
        role: "user" as const,
        text: "hello",
        createdAt: new Date().toISOString(),
      })),
    };
    expect(projectBlueprintSchema.safeParse(tooManyChat).success).toBe(false);

    const tooManyVersions = {
      ...blueprint,
      versions: Array.from({ length: 101 }, (_, i) => ({
        id: `ver_${i}`,
        documentKey: "01_PRD" as const,
        content: "content",
        summary: "summary",
        createdAt: new Date().toISOString(),
      })),
    };
    expect(projectBlueprintSchema.safeParse(tooManyVersions).success).toBe(false);
  });
});

describe("refine source content", () => {
  it("reads document content from the parsed blueprint instead of trusting the client", () => {
    const blueprint = enrichBlueprint(
      buildDemoBlueprint("Safe product", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );

    expect(resolveRefineSourceContent(blueprint, "01_PRD.md")).toContain(
      "Product Requirements Document",
    );
    expect(() => resolveRefineSourceContent(blueprint, "99_EVIL.md")).toThrow(
      "Document not found",
    );
  });
});

describe("markdown sanitization", () => {
  it("removes unquoted event handlers and dangerous tags", () => {
    const input = '<svg onload=alert(1)><script>x</script><meta http-equiv="refresh" content="0;url=evil">';
    expect(stripDangerousMarkdown(input)).not.toContain("onload");
    expect(stripDangerousMarkdown(input)).not.toContain("<script");
    expect(stripDangerousMarkdown(input)).not.toContain("<meta");
  });

  it("strips slash-prefixed event handlers on self-closing tags", () => {
    const input = "<svg/onload=alert(1)><img/src=x/onerror=alert(1)>";
    expect(stripDangerousMarkdown(input)).not.toContain("onload");
    expect(stripDangerousMarkdown(input)).not.toContain("onerror");
    expect(stripDangerousMarkdown(input)).not.toContain("<svg");
    expect(stripDangerousMarkdown(input)).not.toContain("<img");
  });

  it("strips unclosed script and style opening tags", () => {
    expect(stripDangerousMarkdown("<script>alert(1)")).not.toContain("<script");
    expect(stripDangerousMarkdown('<script src="https://evil.test/x">')).not.toContain("<script");
    expect(stripDangerousMarkdown("<style>body{color:red}")).not.toContain("<style");
  });

  it("quotes YAML scalars with embedded newlines", () => {
    expect(sanitizeYamlScalar('Evil\nname: attacker')).toBe('"Evil name: attacker"');
  });

  it("neutralizes dangerous URL schemes in markdown links", () => {
    const input = "![x](data:text/html;base64,abc) [y](javascript:alert(1)) [ok](https://example.com)";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("data:text/html");
    expect(output).not.toContain("javascript:alert");
    expect(output).toContain("[ok](https://example.com)");
    expect(output).toContain("#blocked-scheme");
  });

  it("neutralizes dangerous href and src attributes in raw HTML", () => {
    const input = '<a href="data:text/html,test">x</a><img src="data:image/png;base64,abc">';
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("data:text/html");
    expect(output).not.toContain("data:image/png");
    expect(output).toContain('href="#blocked-scheme"');
    expect(output).not.toContain("<img");
  });
});

describe("Cursor skill export safety", () => {
  it("does not allow YAML front-matter injection via productName", () => {
    const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    blueprint.decisions.productName = 'Evil\nname: attacker-skill\ndescription: pwned';

    const skill = renderCursorSkill(blueprint);
    const frontMatter = skill.split("---")[1] ?? "";
    expect(frontMatter).toContain(
      'description: Build the locked MVP for "Evil name: attacker-skill description: pwned"',
    );
    expect(frontMatter.trim().split("\n").filter((line) => line.startsWith("name:"))).toEqual([
      "name: spekdulu",
    ]);
  });

  it("sanitizes exported PRODUCT.md content", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    blueprint.decisions.coreProblem = '<img src=x onerror=alert(1)>';

    const product = renderProductMd(blueprint);
    expect(product).not.toContain("onerror");
  });

  it("sanitizes exported DESIGN.md and docs/*.md content", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    blueprint.documents = blueprint.documents.map((doc) =>
      doc.key === "02_DESIGN_SYSTEM"
        ? { ...doc, content: "<svg/onload=alert(1)>" }
        : { ...doc, content: "<img/src=x/onerror=alert(1)>" },
    );

    const design = renderDesignMd(blueprint);
    expect(design).not.toContain("onload");
    expect(design).not.toContain("<svg");

    const artifacts = buildArtifacts(blueprint);
    for (const artifact of artifacts.filter((a) => a.path.startsWith("docs/"))) {
      expect(artifact.content).not.toContain("onerror");
      expect(artifact.content).not.toContain("<img");
    }
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
