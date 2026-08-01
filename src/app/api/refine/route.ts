import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
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
      currentContent: body.currentContent,
      userQuery: body.userQuery,
      blueprint,
    });
    return NextResponse.json({
      ...result,
      updatedContent: stripDangerousMarkdown(result.updatedContent),
      versionId: createId("ver"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refine failed." },
      { status: 400 },
    );
  }
}
