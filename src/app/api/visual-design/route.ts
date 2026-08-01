import { NextResponse } from "next/server";
import { projectBlueprintSchema, visualDesignRequestSchema } from "@/lib/schema";
import { analyzeReferenceUrl } from "@/lib/visual/analyze-url";
import {
  listDesignSuggestions,
  reviseVisualSpec,
  suggestVisualForApp,
} from "@/lib/visual/suggest";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      const result = await analyzeReferenceUrl({
        url: body.url,
        originalityMode: mode,
        productContext: `${blueprint.decisions.productName}. ${blueprint.decisions.oneLiner}`,
        blueprint,
      });

      return NextResponse.json({
        suggestions,
        visual: result.visual,
        url: result.url,
        colorHints: result.colorHints,
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
