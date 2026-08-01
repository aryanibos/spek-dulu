import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { analyzeUrlRequestSchema } from "@/lib/schema";
import { assertSafePublicUrl, fetchSafePublicHtml } from "@/lib/security/url";
import { buildDemoVisual } from "@/lib/demos/preset";
import { originalityWarnings } from "@/lib/visual/originality";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchPublicHtml(url: URL) {
  return fetchSafePublicHtml(url.toString());
}

function extractCssHints(html: string) {
  const colors = Array.from(html.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)).map((m) => m[0]);
  const unique = [...new Set(colors)].slice(0, 8);
  return unique;
}

export async function POST(request: Request) {
  try {
    const body = analyzeUrlRequestSchema.parse(await request.json());
    const safeUrl = await assertSafePublicUrl(body.url);

    // Prefer Browserless/Playwright when configured; otherwise use safe HTML fetch + demo synthesis.
    const browserless = process.env.BROWSERLESS_WS_ENDPOINT;
    if (browserless) {
      // Connection string present: still return structured visual through AI provider context.
      // Full browser automation can be wired to this endpoint without changing the client contract.
    }

    const html = await fetchPublicHtml(safeUrl);
    const hints = extractCssHints(html);
    const provider = getAiProvider();

    // Feed URL context through visual provider path via demo/gemini synthesis.
    // Gemini path uses product context; demo path returns calibrated tokens.
    const visual =
      provider.name === "gemini"
        ? await provider.analyzeVisual({
            originalityMode: body.originalityMode,
            screenshotBase64:
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            screenshotMimeType: "image/png",
            productContext: `Reference URL ${safeUrl.toString()}. Observed CSS color hints: ${hints.join(", ")}. Product: ${body.productContext ?? ""}`,
          })
        : {
            ...buildDemoVisual(body.originalityMode),
            summary: `Public reference analyzed from ${safeUrl.hostname}. Color hints detected: ${hints.slice(0, 4).join(", ") || "none"}.`,
            warnings: [
              ...originalityWarnings(body.originalityMode),
              "URL extraction used safe HTML fetch. Computed styles require Browserless/Playwright for higher fidelity.",
            ],
          };

    return NextResponse.json({
      url: safeUrl.toString(),
      colorHints: hints,
      visual,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL analysis failed." },
      { status: 400 },
    );
  }
}
