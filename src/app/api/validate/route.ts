import { NextResponse } from "next/server";
import { validateBlueprint } from "@/lib/coherence/validate";
import { projectBlueprintSchema, validateRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = validateRequestSchema.parse(await request.json());
    const blueprint = projectBlueprintSchema.parse(JSON.parse(body.blueprintJson));
    return NextResponse.json(validateBlueprint(blueprint));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed." },
      { status: 400 },
    );
  }
}
