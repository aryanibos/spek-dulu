import type {
  InterviewQuestion,
  OriginalityMode,
  ProjectBlueprint,
  VisualSpec,
} from "@/lib/schema";

export interface AiProvider {
  name: "demo" | "gemini";
  generateInterview(idea: string, previousAnswers?: Record<string, string>): Promise<InterviewQuestion[]>;
  generateBlueprint(
    idea: string,
    answers: Record<string, string>,
    options?: {
      originalityMode?: OriginalityMode;
      screenshotBase64?: string;
      screenshotMimeType?: string;
      referenceUrl?: string;
    },
  ): Promise<ProjectBlueprint>;
  analyzeVisual(input: {
    originalityMode: OriginalityMode;
    screenshotBase64: string;
    screenshotMimeType: string;
    productContext?: string;
  }): Promise<VisualSpec>;
  refineDocument(input: {
    fileName: string;
    currentContent: string;
    userQuery: string;
    blueprint: ProjectBlueprint;
  }): Promise<{ updatedContent: string; summaryOfChanges: string }>;
}
