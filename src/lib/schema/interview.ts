import { z } from "zod";
import { originalityModeSchema } from "./blueprint";

export const interviewQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  helper: z.string(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      recommended: z.boolean().optional(),
    }),
  ),
  allowCustom: z.boolean().default(true),
});

export const interviewRequestSchema = z.object({
  idea: z.string().min(8).max(2000),
  previousAnswers: z.record(z.string(), z.string()).optional(),
});

export const interviewResponseSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(1).max(5),
  provider: z.enum(["demo", "gemini"]),
});

export const blueprintRequestSchema = z.object({
  idea: z.string().min(8).max(2000),
  answers: z.record(z.string(), z.string()),
  originalityMode: originalityModeSchema.default("Inspired"),
  referenceUrl: z.string().url().optional().or(z.literal("")),
  screenshotBase64: z.string().max(4_000_000).optional(),
  screenshotMimeType: z
    .string()
    .regex(/^image\//)
    .optional(),
});

export const refineRequestSchema = z.object({
  projectId: z.string(),
  fileName: z.string(),
  currentContent: z.string(),
  userQuery: z.string().min(3).max(2000),
  blueprintJson: z.string().max(500_000),
});

export const generateDocRequestSchema = z.object({
  documentKey: z.string(),
  blueprintJson: z.string().max(500_000),
});

export const validateRequestSchema = z.object({
  blueprintJson: z.string().max(500_000),
});

export const analyzeVisualRequestSchema = z.object({
  originalityMode: originalityModeSchema.default("Inspired"),
  screenshotBase64: z.string().min(20),
  screenshotMimeType: z.string(),
  productContext: z.string().optional(),
});

export const analyzeUrlRequestSchema = z.object({
  url: z.string().url(),
  originalityMode: originalityModeSchema.default("Inspired"),
  productContext: z.string().optional(),
});

export const visualDesignRequestSchema = z.object({
  action: z.enum(["suggest", "apply-suggestion", "revise", "from-url"]),
  blueprintJson: z.string().min(2).max(500_000),
  originalityMode: originalityModeSchema.optional(),
  presetId: z.string().optional(),
  instruction: z.string().min(3).max(2000).optional(),
  url: z.string().url().optional(),
});

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
