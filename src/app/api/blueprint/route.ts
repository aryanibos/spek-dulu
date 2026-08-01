import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { validateBlueprint } from "@/lib/coherence/validate";
import { blueprintRequestSchema, projectBlueprintSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = blueprintRequestSchema.parse(await request.json());
    const provider = getAiProvider();
    let blueprint = await provider.generateBlueprint(body.idea, body.answers, {
      originalityMode: body.originalityMode,
      screenshotBase64: body.screenshotBase64,
      screenshotMimeType: body.screenshotMimeType,
      referenceUrl: body.referenceUrl || undefined,
    });

    if (body.referenceUrl && !body.screenshotBase64) {
      try {
        const origin = new URL(request.url).origin;
        const urlRes = await fetch(`${origin}/api/analyze-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: body.referenceUrl,
            originalityMode: body.originalityMode,
            productContext: body.idea,
          }),
        });
        if (urlRes.ok) {
          const urlData = await urlRes.json();
          blueprint = enrichBlueprint(
            {
              ...blueprint,
              visual: urlData.visual,
              referenceUrl: body.referenceUrl,
            },
            { regenerateDocuments: true },
          );
        }
      } catch {
        // Keep blueprint even if URL enrichment fails.
      }
    }

    const coherence = validateBlueprint(blueprint);
    const payload = projectBlueprintSchema.parse({
      ...blueprint,
      coherence,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate blueprint.",
      },
      { status: 400 },
    );
  }
}
