import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { interviewRequestSchema, interviewResponseSchema } from "@/lib/schema";
import { apiErrorStatus, readJsonBody } from "@/lib/security/read-json-body";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = interviewRequestSchema.parse(await readJsonBody(request));
    const provider = getAiProvider();
    const result = await provider.generateInterview(body.idea, body.previousAnswers);
    const payload = interviewResponseSchema.parse(result);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate interview questions.",
      },
      { status: apiErrorStatus(error) },
    );
  }
}
