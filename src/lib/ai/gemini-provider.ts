import { GoogleGenAI } from "@google/genai";
import { enrichBlueprint } from "@/lib/artifacts/render";
import { buildDemoBlueprint, buildDemoQuestions, buildDemoVisual } from "@/lib/demos/preset";
import {
  interviewQuestionSchema,
  projectBlueprintSchema,
  visualSpecSchema,
  type ProjectBlueprint,
  type VisualSpec,
} from "@/lib/schema";
import { assessScope } from "@/lib/scope/meter";
import { applyOriginalityTransformation, originalityWarnings } from "@/lib/visual/originality";
import { z } from "zod";
import type { AiProvider } from "./types";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");
  return new GoogleGenAI({ apiKey });
}

function modelName() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  image?: { data: string; mimeType: string },
): Promise<T> {
  const ai = getClient();
  const contents = image
    ? [
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data.replace(/^data:[^;]+;base64,/, ""),
          },
        },
        { text: prompt },
      ]
    : prompt;

  const response = await ai.models.generateContent({
    model: modelName(),
    contents,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  const parsed = JSON.parse(text);
  return schema.parse(parsed);
}

const questionsSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(1).max(5),
});

const blueprintLooseSchema = z.object({
  decisions: projectBlueprintSchema.shape.decisions,
  features: projectBlueprintSchema.shape.features,
  screens: projectBlueprintSchema.shape.screens,
  entities: projectBlueprintSchema.shape.entities,
  acceptanceCriteria: projectBlueprintSchema.shape.acceptanceCriteria,
});

export const geminiProvider: AiProvider = {
  name: "gemini",
  async generateInterview(idea, previousAnswers) {
    try {
      const result = await generateJson(
        `You are SpekDulu, an AI Product Architect for vibe coders.
Create up to 5 adaptive multiple-choice questions that force MVP decisions.
Idea: ${idea}
Previous answers: ${JSON.stringify(previousAnswers ?? {})}
Return JSON: {"questions":[{"id":"...","prompt":"...","helper":"...","allowCustom":true,"options":[{"value":"...","label":"...","recommended":true}]}]}
Keep questions decisive and anti-scope-creep.`,
        questionsSchema,
      );
      return { questions: result.questions, provider: "gemini" as const };
    } catch {
      return { questions: buildDemoQuestions(idea), provider: "demo" as const };
    }
  },

  async generateBlueprint(idea, answers, options) {
    try {
      const loose = await generateJson(
        `Create a locked MVP blueprint for a vibe-coder hackathon project.
Idea: ${idea}
Answers: ${JSON.stringify(answers)}
Rules:
- Prefer lean MVP
- Put payments/chat/admin analytics in do_not_build unless essential
- Max 3-4 build_now features
- Max 3 p0 screens
Return JSON with decisions, features, screens, entities, acceptanceCriteria matching the SpekDulu schema shapes.`,
        blueprintLooseSchema,
      );

      let visual: VisualSpec | undefined;
      if (options?.screenshotBase64 && options.screenshotMimeType) {
        visual = await geminiProvider.analyzeVisual({
          originalityMode: options.originalityMode ?? "Inspired",
          screenshotBase64: options.screenshotBase64,
          screenshotMimeType: options.screenshotMimeType,
          productContext: idea,
        });
      }

      const now = new Date().toISOString();
      const draft: ProjectBlueprint = {
        id: `project_${Date.now().toString(36)}`,
        createdAt: now,
        updatedAt: now,
        rawIdea: idea,
        answers,
        decisions: loose.decisions,
        features: loose.features,
        screens: loose.screens,
        entities: loose.entities,
        acceptanceCriteria: loose.acceptanceCriteria,
        scope: assessScope(loose.features, {
          mustHaveAuth: loose.decisions.mustHaveAuth,
          dataMode: loose.decisions.dataMode,
          screenCount: loose.screens.length,
        }),
        visual: visual ?? buildDemoVisual(options?.originalityMode ?? "Inspired"),
        documents: [],
        artifacts: [],
        chat: [],
        versions: [],
        provider: "gemini",
        referenceUrl: options?.referenceUrl || undefined,
        hasScreenshot: Boolean(options?.screenshotBase64),
      };
      return enrichBlueprint(draft);
    } catch {
      const fallback = buildDemoBlueprint(idea, answers);
      if (options?.originalityMode) {
        fallback.visual = buildDemoVisual(options.originalityMode);
      }
      if (options?.referenceUrl) {
        fallback.referenceUrl = options.referenceUrl;
      }
      if (options?.screenshotBase64) {
        fallback.hasScreenshot = true;
      }
      fallback.provider = "demo";
      return enrichBlueprint(fallback);
    }
  },

  async analyzeVisual(input) {
    try {
      const visual = await generateJson(
        `Analyze this UI screenshot for SpekDulu.
Return a VisualSpec JSON with summary, originalityMode="${input.originalityMode}", colors, typography, spacingScale, radii, components, sections, warnings.
Separate observed vs inferred tokens. Confidence 0-100.
Product context: ${input.productContext ?? "n/a"}
Never claim trademark safety. Do not copy logos.`,
        visualSpecSchema,
        { data: input.screenshotBase64, mimeType: input.screenshotMimeType },
      );

      return {
        ...visual,
        originalityMode: input.originalityMode,
        colors: visual.colors.map((color) => ({
          ...color,
          hex: applyOriginalityTransformation(color.hex, input.originalityMode),
        })),
        warnings: [...new Set([...visual.warnings, ...originalityWarnings(input.originalityMode)])],
      };
    } catch {
      return buildDemoVisual(input.originalityMode);
    }
  },

  async refineDocument(input) {
    try {
      const schema = z.object({
        updatedContent: z.string(),
        summaryOfChanges: z.string(),
      });
      return await generateJson(
        `Refine the specification document for ${input.blueprint.decisions.productName}.
File: ${input.fileName}
User request: ${input.userQuery}
Current content:
${input.currentContent}

Keep markdown. Preserve locked MVP scope. Return JSON {"updatedContent":"...","summaryOfChanges":"..."}.`,
        schema,
      );
    } catch {
      return {
        updatedContent: `${input.currentContent.trim()}\n\n## Refinement\n${input.userQuery}\n`,
        summaryOfChanges: "Appended refinement request because Gemini refine failed.",
      };
    }
  },
};

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}
