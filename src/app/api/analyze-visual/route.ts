import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { analyzeVisualRequestSchema } from "@/lib/schema";
import { apiErrorStatus, readJsonBody } from "@/lib/security/read-json-body";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = analyzeVisualRequestSchema.parse(await readJsonBody(request));
    const provider = getAiProvider();
    const visual = await provider.analyzeVisual(body);
    return NextResponse.json(visual);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visual analysis failed." },
      { status: apiErrorStatus(error) },
    );
  }
}
