import type { DocumentKey, ProjectBlueprint, SpecDocument } from "@/lib/schema";
import {
  sanitizeExportHeading,
  stripDangerousMarkdown,
} from "@/lib/security/sanitize";
import {
  renderBackendArchitecture,
  renderComponentLibrary,
  renderDatabaseSchema,
  renderDesignAdaptationGuide,
  renderDesignSystem,
  renderFrontendArchitecture,
  renderImplementationRoadmap,
  renderInformationArchitecture,
  renderMasterBuildPrompt,
  renderSeoAccessibility,
} from "./full-docs";
import { renderFullPrd } from "./prd";

const DOC_META: Record<DocumentKey, { fileName: string; title: string }> = {
  "01_PRD": { fileName: "01_PRD.md", title: "Product Requirement Document" },
  "02_DESIGN_SYSTEM": { fileName: "02_DESIGN_SYSTEM.md", title: "Design System" },
  "03_INFORMATION_ARCHITECTURE": {
    fileName: "03_INFORMATION_ARCHITECTURE.md",
    title: "Information Architecture",
  },
  "04_COMPONENT_LIBRARY": {
    fileName: "04_COMPONENT_LIBRARY.md",
    title: "Component Library",
  },
  "05_FRONTEND_ARCHITECTURE": {
    fileName: "05_FRONTEND_ARCHITECTURE.md",
    title: "Frontend Architecture",
  },
  "06_BACKEND_ARCHITECTURE": {
    fileName: "06_BACKEND_ARCHITECTURE.md",
    title: "Backend Architecture",
  },
  "07_DATABASE_SCHEMA": { fileName: "07_DATABASE_SCHEMA.md", title: "Database Schema" },
  "08_SEO_ACCESSIBILITY": {
    fileName: "08_SEO_ACCESSIBILITY.md",
    title: "SEO & Accessibility",
  },
  "09_IMPLEMENTATION_ROADMAP": {
    fileName: "09_IMPLEMENTATION_ROADMAP.md",
    title: "Implementation Roadmap",
  },
  "10_DESIGN_ADAPTATION_GUIDE": {
    fileName: "10_DESIGN_ADAPTATION_GUIDE.md",
    title: "Design Adaptation Guide",
  },
  "11_MASTER_BUILD_PROMPT": {
    fileName: "11_MASTER_BUILD_PROMPT.md",
    title: "Master Build Prompt",
  },
};

function sanitizeBlueprintScalarsForDocs(bp: ProjectBlueprint): ProjectBlueprint {
  const s = (value: string | undefined | null) => sanitizeExportHeading(value ?? "");
  return {
    ...bp,
    rawIdea: s(bp.rawIdea),
    decisions: {
      ...bp.decisions,
      productName: s(bp.decisions.productName),
      oneLiner: s(bp.decisions.oneLiner),
      targetUser: s(bp.decisions.targetUser),
      coreProblem: s(bp.decisions.coreProblem),
      primaryJourney: s(bp.decisions.primaryJourney),
      recommendedStack: bp.decisions.recommendedStack.map(s),
      risks: bp.decisions.risks.map(s),
    },
    features: bp.features.map((feature) => ({
      ...feature,
      name: s(feature.name),
      description: s(feature.description),
      reason: s(feature.reason),
    })),
    screens: bp.screens.map((screen) => ({
      ...screen,
      name: s(screen.name),
      purpose: s(screen.purpose),
      components: screen.components.map(s),
    })),
    entities: bp.entities.map((entity) => ({
      ...entity,
      name: s(entity.name),
      fields: entity.fields.map(s),
      notes: entity.notes ? s(entity.notes) : entity.notes,
    })),
    acceptanceCriteria: bp.acceptanceCriteria.map((criterion) => ({
      ...criterion,
      text: s(criterion.text),
      phase: s(criterion.phase),
    })),
    scope: {
      ...bp.scope,
      summary: s(bp.scope.summary),
      reasons: bp.scope.reasons.map(s),
      recommendedCuts: bp.scope.recommendedCuts.map(s),
    },
    visual: bp.visual
      ? {
          ...bp.visual,
          summary: s(bp.visual.summary),
          spacingScale: bp.visual.spacingScale.map(s),
          components: bp.visual.components.map(s),
          sections: bp.visual.sections.map(s),
          warnings: bp.visual.warnings.map(s),
          colors: bp.visual.colors.map((color) => ({
            ...color,
            name: s(color.name),
            explanation: s(color.explanation),
          })),
          typography: bp.visual.typography.map((typo) => ({
            ...typo,
            family: s(typo.family),
            notes: s(typo.notes),
          })),
        }
      : bp.visual,
  };
}

export function renderDocument(
  key: DocumentKey,
  bp: ProjectBlueprint,
  detailed = true,
): SpecDocument {
  const safeBp = sanitizeBlueprintScalarsForDocs(bp);
  const meta = DOC_META[key];
  let content = "";

  switch (key) {
    case "01_PRD":
      content = renderFullPrd(safeBp);
      break;
    case "02_DESIGN_SYSTEM":
      content = renderDesignSystem(safeBp);
      break;
    case "03_INFORMATION_ARCHITECTURE":
      content = renderInformationArchitecture(safeBp);
      break;
    case "04_COMPONENT_LIBRARY":
      content = renderComponentLibrary(safeBp);
      break;
    case "05_FRONTEND_ARCHITECTURE":
      content = renderFrontendArchitecture(safeBp);
      break;
    case "06_BACKEND_ARCHITECTURE":
      content = renderBackendArchitecture(safeBp);
      break;
    case "07_DATABASE_SCHEMA":
      content = renderDatabaseSchema(safeBp);
      break;
    case "08_SEO_ACCESSIBILITY":
      content = renderSeoAccessibility(safeBp);
      break;
    case "09_IMPLEMENTATION_ROADMAP":
      content = renderImplementationRoadmap(safeBp);
      break;
    case "10_DESIGN_ADAPTATION_GUIDE":
      content = renderDesignAdaptationGuide(safeBp);
      break;
    case "11_MASTER_BUILD_PROMPT":
      content = renderMasterBuildPrompt(safeBp);
      break;
  }

  if (!detailed) {
    content =
      content.split("\n").slice(0, 40).join("\n") +
      "\n\n_Outline generated. Expand for full detail._";
  }

  return {
    key,
    fileName: meta.fileName,
    title: meta.title,
    content: stripDangerousMarkdown(content.trim()),
    // User refinement (chat/restore) sets isDetailed; generated docs stay regeneratable.
    isDetailed: false,
    updatedAt: new Date().toISOString(),
  };
}

export function renderAllDocuments(bp: ProjectBlueprint, detailed = true): SpecDocument[] {
  return (Object.keys(DOC_META) as DocumentKey[]).map((key) =>
    renderDocument(key, bp, detailed),
  );
}

export function resolveRefineSourceContent(
  blueprint: ProjectBlueprint,
  fileName: string,
): string {
  const doc = blueprint.documents.find((entry) => entry.fileName === fileName);
  if (!doc) {
    throw new Error(`Document not found: ${fileName}`);
  }
  return doc.content;
}

export { DOC_META };
