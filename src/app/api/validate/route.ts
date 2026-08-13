import { NextResponse } from "next/server";
import { validateBlueprint } from "@/lib/coherence/validate";
import { projectBlueprintSchema, validateRequestSchema } from "@/lib/schema";
import { apiErrorStatus, readJsonBody } from "@/lib/security/read-json-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = validateRequestSchema.parse(await readJsonBody(request));
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    return NextResponse.json(validateBlueprint(blueprint));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed." },
      { status: apiErrorStatus(error) },
    );
  }
}
