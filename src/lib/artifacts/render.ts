import type { DocumentKey, ProjectBlueprint } from "@/lib/schema";
import { validateBlueprint } from "@/lib/coherence/validate";
import { renderAllDocuments } from "./documents";
import { renderCursorSkill } from "./skill";

type Artifact = ProjectBlueprint["artifacts"][number];

const SAFE_HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const SAFE_RADIUS = /^\d+px$/;

function safeHex(value: string, fallback: string): string {
  return SAFE_HEX.test(value) ? value : fallback;
}

function safeRadius(value: string, fallback: string): string {
  return SAFE_RADIUS.test(value) ? value : fallback;
}

export function renderTokensCss(bp: ProjectBlueprint): string {
  const colors = bp.visual?.colors ?? [];
  const get = (name: string, fallback: string) =>
    safeHex(colors.find((c) => c.name.toLowerCase() === name.toLowerCase())?.hex ?? fallback, fallback);

  const radii = bp.visual?.radii;
  return `:root {
  --bg: ${get("Background", "#FFFFFF")};
  --surface: ${get("Background", "#FFFFFF")};
  --surface-soft: #E3F2FD;
  --text: ${get("Text", "#111827")};
  --text-secondary: #4B5563;
  --text-muted: #6B7280;
  --border: ${get("Border", "#E5E7EB")};
  --accent: ${get("Primary", "#2196F3")};
  --accent-soft: #90CAF9;
  --radius-button: ${safeRadius(radii?.button ?? "12px", "12px")};
  --radius-card: ${safeRadius(radii?.card ?? "18px", "18px")};
  --radius-modal: ${safeRadius(radii?.modal ?? "20px", "20px")};
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
}
`;
}

export function renderProductMd(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# ${d.productName}

## One-liner
${d.oneLiner}

## Problem
${d.coreProblem}

## Users
${d.targetUser}

## Primary journey
${d.primaryJourney}

## Build now
${bp.features
  .filter((f) => f.bucket === "build_now")
  .map((f) => `- ${f.name}: ${f.description}`)
  .join("\n")}

## Non-goals
${bp.features
  .filter((f) => f.bucket !== "build_now")
  .map((f) => `- ${f.name}: ${f.reason}`)
  .join("\n")}

## Acceptance criteria
${bp.acceptanceCriteria.map((a) => `- [ ] ${a.text}`).join("\n")}

## Constraints
- Auth in Phase 1: ${d.mustHaveAuth ? "yes" : "no"}
- Data mode: ${d.dataMode}
- Stack: ${d.recommendedStack.join(", ")}
- Scope: ${bp.scope.label} (${bp.scope.score}/100)

## Risks
${d.risks.map((r) => `- ${r}`).join("\n")}

> Full PRD details live in \`docs/01_PRD.md\`.
`;
}

export function renderDesignMd(bp: ProjectBlueprint): string {
  return bp.documents.find((d) => d.key === "02_DESIGN_SYSTEM")?.content ??
    `# Design\n\n${bp.visual?.summary ?? "Premium light workspace."}\n`;
}

export function renderImplementationMd(bp: ProjectBlueprint): string {
  return `# Implementation Plan

## Phase 1
${bp.acceptanceCriteria.map((a) => `1. ${a.text}`).join("\n")}

## Screens
${bp.screens.map((s) => `- ${s.name}: ${s.purpose}`).join("\n")}

## Entities
${bp.entities.map((e) => `- ${e.name}: ${e.fields.join(", ")}`).join("\n")}

## Constraints
- Auth required: ${bp.decisions.mustHaveAuth ? "yes" : "no"}
- Data mode: ${bp.decisions.dataMode}
- Scope label: ${bp.scope.label}
`;
}

export function renderTasksMd(bp: ProjectBlueprint): string {
  return `# Tasks

## Now
${bp.features
  .filter((f) => f.bucket === "build_now")
  .map((f, i) => `${i + 1}. [ ] ${f.name} - ${f.description}`)
  .join("\n")}

## Later
${bp.features
  .filter((f) => f.bucket === "build_later")
  .map((f) => `- [ ] ${f.name}`)
  .join("\n")}

## Do not build
${bp.features
  .filter((f) => f.bucket === "do_not_build")
  .map((f) => `- [ ] ${f.name} (${f.reason})`)
  .join("\n")}
`;
}

export function buildArtifacts(bp: ProjectBlueprint): Artifact[] {
  const documents = bp.documents.length ? bp.documents : renderAllDocuments(bp, true);
  return [
    { path: ".cursor/skills/spekdulu/SKILL.md", content: renderCursorSkill(bp) },
    { path: "PRODUCT.md", content: renderProductMd(bp) },
    { path: "DESIGN.md", content: renderDesignMd({ ...bp, documents }) },
    { path: "IMPLEMENTATION.md", content: renderImplementationMd(bp) },
    { path: "TASKS.md", content: renderTasksMd(bp) },
    { path: "tokens.css", content: renderTokensCss(bp) },
    ...documents.map((doc) => ({ path: `docs/${doc.fileName}`, content: doc.content })),
  ];
}

export function enrichBlueprint(
  bp: ProjectBlueprint,
  options?: { regenerateDocuments?: boolean; regenerateDocumentKeys?: DocumentKey[] },
): ProjectBlueprint {
  let documents = bp.documents;
  if (options?.regenerateDocuments || bp.documents.length === 0) {
    documents = renderAllDocuments(bp, true);
  } else if (options?.regenerateDocumentKeys?.length) {
    const keys = new Set(options.regenerateDocumentKeys);
    const fresh = Object.fromEntries(
      renderAllDocuments(bp, true).map((doc) => [doc.key, doc]),
    ) as Partial<Record<DocumentKey, (typeof bp.documents)[number]>>;
    documents = bp.documents.map((doc) =>
      keys.has(doc.key) && !doc.isDetailed ? (fresh[doc.key] ?? doc) : doc,
    );
    for (const key of options.regenerateDocumentKeys) {
      if (
        !documents.some((doc) => doc.key === key) &&
        fresh[key] &&
        !bp.documents.some((doc) => doc.key === key && doc.isDetailed)
      ) {
        documents.push(fresh[key]!);
      }
    }
  }
  const withDocs = { ...bp, documents, updatedAt: new Date().toISOString() };
  return {
    ...withDocs,
    coherence: validateBlueprint(withDocs),
    artifacts: buildArtifacts(withDocs),
  };
}
