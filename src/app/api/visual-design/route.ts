import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import {
  projectBlueprintSchema,
  visualDesignRequestSchema,
  type VisualSpec,
} from "@/lib/schema";
import { assertSafePublicUrl, fetchSafePublicHtml } from "@/lib/security/url";
import { originalityWarnings } from "@/lib/visual/originality";
import {
  listDesignSuggestions,
  reviseVisualSpec,
  suggestVisualForApp,
} from "@/lib/visual/suggest";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractCssHints(html: string) {
  return [...new Set(Array.from(html.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)).map((m) => m[0]))].slice(
    0,
    8,
  );
}

function blendHintsIntoVisual(visual: VisualSpec, hints: string[], hostname: string): VisualSpec {
  if (!hints.length) {
    return {
      ...visual,
      summary: `Public reference from ${hostname} applied. ${visual.summary}`,
      warnings: [
        ...visual.warnings,
        "No CSS color hints found. Kept suggested palette adapted to your product.",
      ],
    };
  }

  const nextColors = visual.colors.map((color) => {
    if (color.role !== "accent" && color.name !== "Primary") return color;
    return {
      ...color,
      hex: hints[0] ?? color.hex,
      source: "observed" as const,
      confidence: 78,
      explanation: `Adapted from public CSS hint on ${hostname}.`,
    };
  });

  if (hints[1]) {
    const softIndex = nextColors.findIndex((c) => c.name === "Soft Accent");
    if (softIndex >= 0) {
      nextColors[softIndex] = {
        ...nextColors[softIndex],
        hex: hints[1],
        source: "observed",
        confidence: 72,
        explanation: `Secondary surface hint adapted from ${hostname}.`,
      };
    }
  }

  return {
    ...visual,
    summary: `Visual adapted from public reference ${hostname}. Hue cues were remapped into your product system.`,
    colors: nextColors,
    warnings: [
      ...originalityWarnings(visual.originalityMode),
      `Reference host: ${hostname}. Do not copy logos, trademarks, or distinctive brand assets.`,
      "URL extraction used safe HTML fetch. Browserless can improve fidelity later.",
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = visualDesignRequestSchema.parse(await request.json());
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    const mode = body.originalityMode ?? blueprint.visual?.originalityMode ?? "Inspired";
    const suggestions = listDesignSuggestions(blueprint);

    if (body.action === "suggest") {
      return NextResponse.json({
        suggestions,
        visual: suggestVisualForApp(blueprint, mode),
      });
    }

    if (body.action === "apply-suggestion") {
      const visual = suggestVisualForApp(blueprint, mode, body.presetId);
      return NextResponse.json({ suggestions, visual });
    }

    if (body.action === "revise") {
      if (!body.instruction?.trim()) {
        throw new Error("Revision instruction is required.");
      }
      const visual = reviseVisualSpec(blueprint.visual, blueprint, body.instruction, mode);
      return NextResponse.json({ suggestions, visual });
    }

    if (body.action === "from-url") {
      if (!body.url) throw new Error("Reference URL is required.");
      const safeUrl = await assertSafePublicUrl(body.url);
      const html = await fetchSafePublicHtml(safeUrl.toString());
      const hints = extractCssHints(html);
      const provider = getAiProvider();

      let visual: VisualSpec;
      if (provider.name === "gemini") {
        visual = await provider.analyzeVisual({
          originalityMode: mode,
          screenshotBase64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          screenshotMimeType: "image/png",
          productContext: `Reference URL ${safeUrl.toString()}. Observed CSS color hints: ${hints.join(", ")}. Product: ${blueprint.decisions.productName}. ${blueprint.decisions.oneLiner}`,
        });
      } else {
        visual = blendHintsIntoVisual(
          suggestVisualForApp(blueprint, mode),
          hints,
          safeUrl.hostname,
        );
      }

      return NextResponse.json({
        suggestions,
        visual,
        url: safeUrl.toString(),
        colorHints: hints,
      });
    }

    throw new Error("Unsupported visual design action.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visual design update failed." },
      { status: 400 },
    );
  }
}
