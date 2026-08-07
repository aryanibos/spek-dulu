import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { resolveRefineSourceContent } from "@/lib/artifacts/documents";
import { MAX_DOC_CONTENT } from "@/lib/schema/limits";
import { projectBlueprintSchema, refineRequestSchema } from "@/lib/schema";
import { stripDangerousMarkdown } from "@/lib/security/sanitize";
import { createId } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = refineRequestSchema.parse(await request.json());
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    const provider = getAiProvider();
    const result = await provider.refineDocument({
      fileName: body.fileName,
      currentContent: resolveRefineSourceContent(blueprint, body.fileName),
      userQuery: body.userQuery,
      blueprint,
    });
    const updatedContent = stripDangerousMarkdown(result.updatedContent);
    if (updatedContent.length > MAX_DOC_CONTENT) {
      throw new Error(`Refined content exceeds ${MAX_DOC_CONTENT} characters.`);
    }
    return NextResponse.json({
      ...result,
      updatedContent,
      versionId: createId("ver"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refine failed." },
      { status: 400 },
    );
  }
}
