import { NextResponse } from "next/server";
import { analyzeUrlRequestSchema } from "@/lib/schema";
import { analyzeReferenceUrl } from "@/lib/visual/analyze-url";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = analyzeUrlRequestSchema.parse(await request.json());
    const result = await analyzeReferenceUrl(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL analysis failed." },
      { status: 400 },
    );
  }
}
