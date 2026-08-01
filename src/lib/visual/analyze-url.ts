import { getAiProvider } from "@/lib/ai";
import { buildDemoVisual } from "@/lib/demos/preset";
import type { OriginalityMode, VisualSpec } from "@/lib/schema";
import { assertSafePublicUrl, fetchSafePublicHtml } from "@/lib/security/url";
import { originalityWarnings } from "@/lib/visual/originality";

function extractCssHints(html: string) {
  const colors = Array.from(html.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)).map((m) => m[0]);
  return [...new Set(colors)].slice(0, 8);
}

export async function analyzeReferenceUrl(input: {
  url: string;
  originalityMode: OriginalityMode;
  productContext?: string;
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
      : {
          ...buildDemoVisual(input.originalityMode),
          summary: `Public reference analyzed from ${safeUrl.hostname}. Color hints detected: ${hints.slice(0, 4).join(", ") || "none"}.`,
          warnings: [
            ...originalityWarnings(input.originalityMode),
            "URL extraction used safe HTML fetch. Computed styles require Browserless/Playwright for higher fidelity.",
          ],
        };

  return {
    url: safeUrl.toString(),
    colorHints: hints,
    visual,
  };
}
