import { z } from "zod";
import {
  boundedRecordSchema,
  MAX_ARTIFACT_CONTENT,
  MAX_CHAT_MESSAGE_TEXT,
  MAX_CHAT_MESSAGES,
  MAX_DOC_CONTENT,
  MAX_DOCUMENT_VERSIONS,
  MAX_RAW_IDEA,
  MAX_VERSION_SUMMARY,
} from "./limits";

export const originalityModeSchema = z.enum(["Reference", "Inspired", "Distinct"]);
export type OriginalityMode = z.infer<typeof originalityModeSchema>;

export const featureBucketSchema = z.enum(["build_now", "build_later", "do_not_build"]);
export type FeatureBucket = z.infer<typeof featureBucketSchema>;

export const featureItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bucket: featureBucketSchema,
  reason: z.string(),
  complexity: z.enum(["low", "medium", "high"]),
});

export const productDecisionSchema = z.object({
  productName: z.string(),
  oneLiner: z.string(),
  targetUser: z.string(),
  coreProblem: z.string(),
  primaryJourney: z.string(),
  mustHaveAuth: z.boolean(),
  dataMode: z.enum(["local_demo", "online_simple", "online_multiplayer"]),
  recommendedStack: z.array(z.string()),
  risks: z.array(z.string()),
});

export const screenSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  priority: z.enum(["p0", "p1", "p2"]),
  components: z.array(z.string()),
});

export const entitySchema = z.object({
  name: z.string(),
  fields: z.array(z.string()),
  notes: z.string().optional(),
});

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  phase: z.string(),
});

export const scopeAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(["Lean MVP", "Balanced MVP", "Overloaded"]),
  summary: z.string(),
  reasons: z.array(z.string()),
  recommendedCuts: z.array(z.string()),
});

export const colorTokenSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "hex must be #RGB or #RRGGBB"),
  role: z.enum(["surface", "accent", "text", "border", "alert"]),
  source: z.enum(["observed", "inferred", "generated"]),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
});

export const typographyTokenSchema = z.object({
  family: z.string(),
  category: z.enum(["heading", "body", "mono"]),
  notes: z.string(),
  confidence: z.number().min(0).max(100),
});

export const visualSpecSchema = z.object({
  summary: z.string(),
  originalityMode: originalityModeSchema,
  colors: z.array(colorTokenSchema),
  typography: z.array(typographyTokenSchema),
  spacingScale: z.array(z.string()),
  radii: z.object({
    button: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
    card: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
    modal: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
  }),
  components: z.array(z.string()),
  sections: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const documentKeySchema = z.enum([
  "01_PRD",
  "02_DESIGN_SYSTEM",
  "03_INFORMATION_ARCHITECTURE",
  "04_COMPONENT_LIBRARY",
  "05_FRONTEND_ARCHITECTURE",
  "06_BACKEND_ARCHITECTURE",
  "07_DATABASE_SCHEMA",
  "08_SEO_ACCESSIBILITY",
  "09_IMPLEMENTATION_ROADMAP",
  "10_DESIGN_ADAPTATION_GUIDE",
  "11_MASTER_BUILD_PROMPT",
]);

export type DocumentKey = z.infer<typeof documentKeySchema>;

export const documentFileNameSchema = z.enum([
  "01_PRD.md",
  "02_DESIGN_SYSTEM.md",
  "03_INFORMATION_ARCHITECTURE.md",
  "04_COMPONENT_LIBRARY.md",
  "05_FRONTEND_ARCHITECTURE.md",
  "06_BACKEND_ARCHITECTURE.md",
  "07_DATABASE_SCHEMA.md",
  "08_SEO_ACCESSIBILITY.md",
  "09_IMPLEMENTATION_ROADMAP.md",
  "10_DESIGN_ADAPTATION_GUIDE.md",
  "11_MASTER_BUILD_PROMPT.md",
]);

export const specDocumentSchema = z.object({
  key: documentKeySchema,
  fileName: documentFileNameSchema,
  title: z.string(),
  content: z.string().max(MAX_DOC_CONTENT),
  isDetailed: z.boolean(),
  updatedAt: z.string(),
});

export const artifactPathSchema = z
  .string()
  .min(1)
  .refine(
    (path) => !path.includes("..") && !path.startsWith("/") && !path.includes("\\"),
    "artifact path must be relative and must not traverse directories",
  );

export const artifactSchema = z.object({
  path: artifactPathSchema,
  content: z.string().max(MAX_ARTIFACT_CONTENT),
});

export const coherenceIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  source: z.string(),
  target: z.string(),
  message: z.string(),
});

export const coherenceReportSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["Pristine", "Minor Warnings", "Action Required"]),
  issues: z.array(coherenceIssueSchema),
  checkedAt: z.string(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(MAX_CHAT_MESSAGE_TEXT),
  targetFile: z.string().optional(),
  createdAt: z.string(),
});

export const documentVersionSchema = z.object({
  id: z.string(),
  documentKey: documentKeySchema,
  content: z.string().max(MAX_DOC_CONTENT),
  summary: z.string().max(MAX_VERSION_SUMMARY),
  createdAt: z.string(),
});

export const projectBlueprintSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rawIdea: z.string().max(MAX_RAW_IDEA),
  answers: boundedRecordSchema,
  decisions: productDecisionSchema,
  features: z.array(featureItemSchema),
  screens: z.array(screenSchema),
  entities: z.array(entitySchema),
  acceptanceCriteria: z.array(acceptanceCriterionSchema),
  scope: scopeAssessmentSchema,
  visual: visualSpecSchema.optional(),
  documents: z.array(specDocumentSchema),
  artifacts: z.array(artifactSchema),
  coherence: coherenceReportSchema.optional(),
  chat: z.array(chatMessageSchema).max(MAX_CHAT_MESSAGES).default([]),
  versions: z.array(documentVersionSchema).max(MAX_DOCUMENT_VERSIONS).default([]),
  provider: z.enum(["demo", "gemini"]),
  referenceUrl: z.string().url().optional().or(z.literal("")),
  hasScreenshot: z.boolean().default(false),
});

export type ProjectBlueprint = z.infer<typeof projectBlueprintSchema>;
export type ProductDecision = z.infer<typeof productDecisionSchema>;
export type FeatureItem = z.infer<typeof featureItemSchema>;
export type ScopeAssessment = z.infer<typeof scopeAssessmentSchema>;
export type VisualSpec = z.infer<typeof visualSpecSchema>;
export type SpecDocument = z.infer<typeof specDocumentSchema>;
export type CoherenceReport = z.infer<typeof coherenceReportSchema>;
