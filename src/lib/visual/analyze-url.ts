import { getAiProvider } from "@/lib/ai";
import { buildDemoVisual } from "@/lib/demos/preset";
import type { OriginalityMode, ProjectBlueprint, VisualSpec } from "@/lib/schema";
import { assertSafePublicUrl, fetchSafePublicHtml } from "@/lib/security/url";
import { originalityWarnings } from "@/lib/visual/originality";
import { suggestVisualForApp } from "@/lib/visual/suggest";

function extractCssHints(html: string) {
  const colors = Array.from(html.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)).map((m) => m[0]);
  return [...new Set(colors)].slice(0, 8);
}

export function blendHintsIntoVisual(
  visual: VisualSpec,
  hints: string[],
  hostname: string,
): VisualSpec {
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

export async function analyzeReferenceUrl(input: {
  url: string;
  originalityMode: OriginalityMode;
  productContext?: string;
  blueprint?: ProjectBlueprint;
}): Promise<{ url: string; colorHints: string[]; visual: VisualSpec }> {
  const safeUrl = await assertSafePublicUrl(input.url);
  const html = await fetchSafePublicHtml(safeUrl.toString());
  const hints = extractCssHints(html);
  const provider = getAiProvider();

  const visual =
    provider.name === "gemini"
      ? await provider.analyzeVisual({
          originalityMode: input.originalityMode,
          screenshotBase64:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          screenshotMimeType: "image/png",
          productContext: `Reference URL ${safeUrl.toString()}. Observed CSS color hints: ${hints.join(", ")}. Product: ${input.productContext ?? ""}`,
        })
      : blendHintsIntoVisual(
          input.blueprint
            ? suggestVisualForApp(input.blueprint, input.originalityMode)
            : buildDemoVisual(input.originalityMode),
          hints,
          safeUrl.hostname,
        );

  return {
    url: safeUrl.toString(),
    colorHints: hints,
    visual,
  };
}
