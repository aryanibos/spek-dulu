import type { DocumentKey, ProjectBlueprint, SpecDocument } from "@/lib/schema";
import { stripDangerousMarkdown } from "@/lib/security/sanitize";
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

export function renderDocument(
  key: DocumentKey,
  bp: ProjectBlueprint,
  detailed = true,
): SpecDocument {
  const meta = DOC_META[key];
  let content = "";

  switch (key) {
    case "01_PRD":
      content = renderFullPrd(bp);
      break;
    case "02_DESIGN_SYSTEM":
      content = renderDesignSystem(bp);
      break;
    case "03_INFORMATION_ARCHITECTURE":
      content = renderInformationArchitecture(bp);
      break;
    case "04_COMPONENT_LIBRARY":
      content = renderComponentLibrary(bp);
      break;
    case "05_FRONTEND_ARCHITECTURE":
      content = renderFrontendArchitecture(bp);
      break;
    case "06_BACKEND_ARCHITECTURE":
      content = renderBackendArchitecture(bp);
      break;
    case "07_DATABASE_SCHEMA":
      content = renderDatabaseSchema(bp);
      break;
    case "08_SEO_ACCESSIBILITY":
      content = renderSeoAccessibility(bp);
      break;
    case "09_IMPLEMENTATION_ROADMAP":
      content = renderImplementationRoadmap(bp);
      break;
    case "10_DESIGN_ADAPTATION_GUIDE":
      content = renderDesignAdaptationGuide(bp);
      break;
    case "11_MASTER_BUILD_PROMPT":
      content = renderMasterBuildPrompt(bp);
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
