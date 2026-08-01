import { NextResponse } from "next/server";
import { getAiProvider, getProviderName } from "@/lib/ai";
import { interviewRequestSchema, interviewResponseSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = interviewRequestSchema.parse(await request.json());
    const provider = getAiProvider();
    const questions = await provider.generateInterview(body.idea, body.previousAnswers);
    const payload = interviewResponseSchema.parse({
      questions,
      provider: getProviderName(),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate interview questions.",
      },
      { status: 400 },
    );
  }
}
