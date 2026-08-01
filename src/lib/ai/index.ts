import { demoProvider } from "./demo-provider";
import { geminiProvider, hasGeminiKey } from "./gemini-provider";
import type { AiProvider } from "./types";

export function getAiProvider(): AiProvider {
  return hasGeminiKey() ? geminiProvider : demoProvider;
}

export function getProviderName(): "demo" | "gemini" {
  return hasGeminiKey() ? "gemini" : "demo";
}

export { demoProvider, geminiProvider, hasGeminiKey };
export type { AiProvider };
