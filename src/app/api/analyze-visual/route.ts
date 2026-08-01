import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { analyzeVisualRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = analyzeVisualRequestSchema.parse(await request.json());
    if (!body.screenshotMimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid image MIME type." }, { status: 400 });
    }
    const provider = getAiProvider();
    const visual = await provider.analyzeVisual(body);
    return NextResponse.json(visual);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visual analysis failed." },
      { status: 400 },
    );
  }
}
