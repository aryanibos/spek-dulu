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
import { sanitizeYamlScalar, sanitizeExportFilename, sanitizeExportHeading, stripDangerousMarkdown } from "@/lib/security/sanitize";
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

  it("rejects oversized persisted blueprint answer maps", () => {
    const answers = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`key_${i}`, "value"]),
    );
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    const result = projectBlueprintSchema.safeParse({ ...blueprint, answers });
    expect(result.success).toBe(false);
  });

  it("rejects oversized persisted rawIdea values", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    const result = projectBlueprintSchema.safeParse({
      ...blueprint,
      rawIdea: "x".repeat(2_001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized nested blueprint decision and feature strings", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    expect(
      projectBlueprintSchema.safeParse({
        ...blueprint,
        decisions: { ...blueprint.decisions, oneLiner: "x".repeat(2_001) },
      }).success,
    ).toBe(false);
    expect(
      projectBlueprintSchema.safeParse({
        ...blueprint,
        features: [
          {
            ...blueprint.features[0]!,
            description: "x".repeat(2_001),
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects oversized feature arrays on persisted blueprints", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    const result = projectBlueprintSchema.safeParse({
      ...blueprint,
      features: Array.from({ length: 51 }, (_, i) => ({
        ...blueprint.features[0]!,
        id: `feature_${i}`,
        name: `Feature ${i}`,
      })),
    });
    expect(result.success).toBe(false);
  });

  it("keeps enriched demo blueprints within nested schema caps", () => {
    const blueprint = enrichBlueprint(
      buildDemoBlueprint("Aplikasi pencatat utang warung", {
        user: "Solo shop owner",
        job: "Record debt and mark it paid",
        auth: "demo_profile",
        data: "local_demo",
        constraint: "Three screens max in Phase 1",
      }),
    );
    expect(projectBlueprintSchema.safeParse(blueprint).success).toBe(true);
  });

  it("rejects oversized document version summaries", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    const result = projectBlueprintSchema.safeParse({
      ...blueprint,
      versions: [
        {
          id: "ver_test",
          documentKey: "01_PRD",
          content: "content",
          summary: "x".repeat(2_001),
          createdAt: new Date().toISOString(),
        },
      ],
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
    expect(output).not.toContain("(alert(1))");
    expect(output).toContain("[ok](https://example.com)");
    expect(output).toContain("#blocked-scheme");
  });

  it("neutralizes javascript links with nested parentheses and extra whitespace", () => {
    const input = "[x](  javascript:alert(1)  ) [ok](https://example.com)";
    const output = stripDangerousMarkdown(input);
    expect(output).toBe("[x](#blocked-scheme) [ok](https://example.com)");
  });

  it("neutralizes entity-encoded dangerous URL schemes in markdown links", () => {
    const input =
      "[x](javascript&#58;alert(1)) [y](javascript&#x3a;alert(1)) [z](javascript&Colon;alert(1))";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("javascript");
    expect(output).not.toContain("alert(1)");
    expect(output).toContain("#blocked-scheme");
  });

  it("neutralizes percent-encoded and zero-width obfuscated URL schemes", () => {
    const input =
      "[x](%6aavascript:alert(1)) [y](java\u200bscript:alert(1)) [ok](https://example.com)";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("alert(1)");
    expect(output).toContain("[ok](https://example.com)");
    expect(output).toContain("#blocked-scheme");
  });

  it("neutralizes null-byte, double-encoded, and CR-split URL schemes", () => {
    const input =
      "[x](java%00script:alert(1)) [y](java%2500script:alert(1)) [z](java\rscript:alert(1))";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("alert(1)");
    expect(output).toContain("#blocked-scheme");
  });

  it("neutralizes autolink and encoded href dangerous schemes", () => {
    const input =
      "<javascript:alert(1)> <a href=\"%6aavascript:alert(1)\">x</a> [ok](https://example.com)";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("alert(1)");
    expect(output).not.toContain("javascript");
    expect(output).toContain("#blocked-scheme");
    expect(output).toContain("[ok](https://example.com)");
  });

  it("neutralizes reference-style link definitions with dangerous schemes", () => {
    const input = "[evil][1]\n\n[1]: javascript:alert(1)\n[ok]: https://example.com";
    const output = stripDangerousMarkdown(input);
    expect(output).toContain("[1]: #blocked-scheme");
    expect(output).not.toContain("javascript:alert");
    expect(output).toContain("[ok]: https://example.com");
  });

  it("strips unicode line separators from export headings and YAML scalars", () => {
    expect(sanitizeExportHeading("Evil\u2028# injected")).toBe("Evil # injected");
    expect(sanitizeYamlScalar("Evil\u2029name: attacker")).toBe('"Evil name: attacker"');
    expect(sanitizeYamlScalar("Evil\u0000name: attacker")).toBe('"Evil name: attacker"');
  });

  it("neutralizes dangerous href and src attributes in raw HTML", () => {
    const input = '<a href="data:text/html,test">x</a><img src="data:image/png;base64,abc">';
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("data:text/html");
    expect(output).not.toContain("data:image/png");
    expect(output).toContain('href="#blocked-scheme"');
    expect(output).not.toContain("<img");
  });

  it("neutralizes file and blob URL schemes in markdown links", () => {
    const input =
      "[local](file:///etc/passwd) [blob](blob:https://example.com/uuid) [ok](https://example.com)";
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("file:///etc/passwd");
    expect(output).not.toContain("blob:https://");
    expect(output).toContain("[ok](https://example.com)");
    expect(output).toContain("#blocked-scheme");
  });

  it("strips base, body, and video tags from exported markdown", () => {
    const input =
      '<base href="https://evil.com"><body onload=alert(1)><video src=x onerror=alert(1)></video>';
    const output = stripDangerousMarkdown(input);
    expect(output).not.toContain("<base");
    expect(output).not.toContain("<body");
    expect(output).not.toContain("<video");
    expect(output).not.toContain("onload");
    expect(output).not.toContain("onerror");
  });

  it("sanitizes export headings and filenames", () => {
    expect(sanitizeExportHeading("Evil\n# injected")).toBe("Evil # injected");
    expect(sanitizeExportFilename("../../Evil Product")).toBe("evil-product");
  });

  it("blocks markdown heading injection in generated docs", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max",
    });
    blueprint.decisions.productName = "Evil\n# Injected heading";

    const enriched = enrichBlueprint(blueprint);
    const prd = enriched.documents.find((d) => d.key === "01_PRD");
    expect(prd?.content).toContain("Evil # Injected heading");
    expect(prd?.content).not.toMatch(/\n# Injected heading/);
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

  it("prevents markdown structure injection via newlines in productName", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    blueprint.decisions.productName = "Evil\n# injected heading";

    const product = renderProductMd(blueprint);
    expect(product.startsWith("# Evil # injected heading\n")).toBe(true);
    expect(product).not.toMatch(/^# Evil\n# injected/m);
  });

  it("prevents markdown structure injection via newlines in oneLiner", () => {
    const blueprint = buildDemoBlueprint("Safe product", {
      user: "Solo shop owner",
      job: "Record debt and mark it paid",
      auth: "demo_profile",
      data: "local_demo",
      constraint: "Three screens max in Phase 1",
    });
    blueprint.decisions.oneLiner = "Evil\n## injected heading";

    const product = renderProductMd(blueprint);
    expect(product).toContain("## One-liner\nEvil ## injected heading");
    expect(product).not.toMatch(/## One-liner\nEvil\n## injected/m);
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
