import { NextResponse } from "next/server";
import { renderDocument } from "@/lib/artifacts/documents";
import {
  documentKeySchema,
  generateDocRequestSchema,
  projectBlueprintSchema,
} from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = generateDocRequestSchema.parse(await request.json());
    const key = documentKeySchema.parse(body.documentKey);
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    return NextResponse.json(renderDocument(key, blueprint, true));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document generation failed." },
      { status: 400 },
    );
  }
}
