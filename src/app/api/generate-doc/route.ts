import { NextResponse } from "next/server";
import { renderDocument } from "@/lib/artifacts/documents";
import {
  documentKeySchema,
  generateDocRequestSchema,
  projectBlueprintSchema,
} from "@/lib/schema";
import { apiErrorStatus, readJsonBody } from "@/lib/security/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = generateDocRequestSchema.parse(await readJsonBody(request));
    const key = documentKeySchema.parse(body.documentKey);
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    return NextResponse.json(renderDocument(key, blueprint, true));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document generation failed." },
      { status: apiErrorStatus(error) },
    );
  }
}
