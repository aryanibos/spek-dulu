import { z } from "zod";
import {
  boundedRecordSchema,
  MAX_ACCEPTANCE_CRITERIA,
  MAX_ARTIFACT_CONTENT,
  MAX_ARTIFACTS,
  MAX_CHAT_MESSAGE_TEXT,
  MAX_CHAT_MESSAGES,
  MAX_COHERENCE_ISSUES,
  MAX_DOC_CONTENT,
  MAX_DOCUMENT_VERSIONS,
  MAX_ENTITIES,
  MAX_FEATURES,
  MAX_ID,
  MAX_LABEL,
  MAX_LIST_ITEMS,
  MAX_RAW_IDEA,
  MAX_SCREENS,
  MAX_SUMMARY,
  MAX_TEXT,
  MAX_VERSION_SUMMARY,
  MAX_VISUAL_COLORS,
  MAX_VISUAL_TYPOGRAPHY,
} from "./limits";

export const originalityModeSchema = z.enum(["Reference", "Inspired", "Distinct"]);
export type OriginalityMode = z.infer<typeof originalityModeSchema>;

export const featureBucketSchema = z.enum(["build_now", "build_later", "do_not_build"]);
export type FeatureBucket = z.infer<typeof featureBucketSchema>;

export const featureItemSchema = z.object({
  id: z.string().max(MAX_ID),
  name: z.string().max(MAX_LABEL),
  description: z.string().max(MAX_TEXT),
  bucket: featureBucketSchema,
  reason: z.string().max(MAX_TEXT),
  complexity: z.enum(["low", "medium", "high"]),
});

export const productDecisionSchema = z.object({
  productName: z.string().max(MAX_LABEL),
  oneLiner: z.string().max(MAX_TEXT),
  targetUser: z.string().max(MAX_LABEL),
  coreProblem: z.string().max(MAX_TEXT),
  primaryJourney: z.string().max(MAX_TEXT),
  mustHaveAuth: z.boolean(),
  dataMode: z.enum(["local_demo", "online_simple", "online_multiplayer"]),
  recommendedStack: z.array(z.string().max(MAX_LABEL)).max(MAX_LIST_ITEMS),
  risks: z.array(z.string().max(MAX_TEXT)).max(MAX_LIST_ITEMS),
});

export const screenSchema = z.object({
  id: z.string().max(MAX_ID),
  name: z.string().max(MAX_LABEL),
  purpose: z.string().max(MAX_TEXT),
  priority: z.enum(["p0", "p1", "p2"]),
  components: z.array(z.string().max(MAX_LABEL)).max(MAX_LIST_ITEMS),
});

export const entitySchema = z.object({
  name: z.string().max(MAX_LABEL),
  fields: z.array(z.string().max(MAX_LABEL)).max(MAX_LIST_ITEMS),
  notes: z.string().max(MAX_TEXT).optional(),
});

export const acceptanceCriterionSchema = z.object({
  id: z.string().max(MAX_ID),
  text: z.string().max(MAX_TEXT),
  phase: z.string().max(MAX_LABEL),
});

export const scopeAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(["Lean MVP", "Balanced MVP", "Overloaded"]),
  summary: z.string().max(MAX_SUMMARY),
  reasons: z.array(z.string().max(MAX_TEXT)).max(MAX_LIST_ITEMS),
  recommendedCuts: z.array(z.string().max(MAX_TEXT)).max(MAX_LIST_ITEMS),
});

export const colorTokenSchema = z.object({
  name: z.string().max(MAX_LABEL),
  hex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "hex must be #RGB or #RRGGBB"),
  role: z.enum(["surface", "accent", "text", "border", "alert"]),
  source: z.enum(["observed", "inferred", "generated"]),
  confidence: z.number().min(0).max(100),
  explanation: z.string().max(MAX_TEXT),
});

export const typographyTokenSchema = z.object({
  family: z.string().max(MAX_LABEL),
  category: z.enum(["heading", "body", "mono"]),
  notes: z.string().max(MAX_TEXT),
  confidence: z.number().min(0).max(100),
});

export const visualSpecSchema = z.object({
  summary: z.string().max(MAX_SUMMARY),
  originalityMode: originalityModeSchema,
  colors: z.array(colorTokenSchema).max(MAX_VISUAL_COLORS),
  typography: z.array(typographyTokenSchema).max(MAX_VISUAL_TYPOGRAPHY),
  spacingScale: z.array(z.string().max(MAX_LABEL)).max(MAX_LIST_ITEMS),
  radii: z.object({
    button: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
    card: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
    modal: z.string().regex(/^\d+px$/, "radius must be a pixel value like 12px"),
  }),
  components: z.array(z.string().max(MAX_LABEL)).max(MAX_LIST_ITEMS),
  sections: z.array(z.string().max(MAX_LABEL)).max(MAX_SCREENS),
  warnings: z.array(z.string().max(MAX_TEXT)).max(MAX_LIST_ITEMS),
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
  title: z.string().max(MAX_LABEL),
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
  id: z.string().max(MAX_ID),
  severity: z.enum(["error", "warning", "info"]),
  source: z.string().max(MAX_LABEL),
  target: z.string().max(MAX_LABEL),
  message: z.string().max(MAX_TEXT),
});

export const coherenceReportSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["Pristine", "Minor Warnings", "Action Required"]),
  issues: z.array(coherenceIssueSchema).max(MAX_COHERENCE_ISSUES),
  checkedAt: z.string(),
});

export const chatMessageSchema = z.object({
  id: z.string().max(MAX_ID),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(MAX_CHAT_MESSAGE_TEXT),
  targetFile: z.string().max(MAX_LABEL).optional(),
  createdAt: z.string(),
});

export const documentVersionSchema = z.object({
  id: z.string().max(MAX_ID),
  documentKey: documentKeySchema,
  content: z.string().max(MAX_DOC_CONTENT),
  summary: z.string().max(MAX_VERSION_SUMMARY),
  createdAt: z.string(),
});

export const projectBlueprintSchema = z.object({
  id: z.string().max(MAX_ID),
  createdAt: z.string(),
  updatedAt: z.string(),
  rawIdea: z.string().max(MAX_RAW_IDEA),
  answers: boundedRecordSchema,
  decisions: productDecisionSchema,
  features: z.array(featureItemSchema).max(MAX_FEATURES),
  screens: z.array(screenSchema).max(MAX_SCREENS),
  entities: z.array(entitySchema).max(MAX_ENTITIES),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).max(MAX_ACCEPTANCE_CRITERIA),
  scope: scopeAssessmentSchema,
  visual: visualSpecSchema.optional(),
  documents: z.array(specDocumentSchema),
  artifacts: z.array(artifactSchema).max(MAX_ARTIFACTS),
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
