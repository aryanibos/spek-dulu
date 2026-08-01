import type { CoherenceReport, ProjectBlueprint } from "@/lib/schema";
import { looksLikePlaceholder } from "@/lib/security/sanitize";
import { createId } from "@/lib/utils";

export function validateBlueprint(bp: ProjectBlueprint): CoherenceReport {
  const issues: CoherenceReport["issues"] = [];

  const buildNow = bp.features.filter((f) => f.bucket === "build_now");
  if (buildNow.length === 0) {
    issues.push({
      id: createId("issue"),
      severity: "error",
      source: "features",
      target: "scope",
      message: "No Build Now features found.",
    });
  }

  if (bp.screens.length === 0) {
    issues.push({
      id: createId("issue"),
      severity: "error",
      source: "screens",
      target: "ia",
      message: "No screens defined for the MVP.",
    });
  }

  for (const entity of bp.entities) {
    const mentioned = bp.documents.some((doc) =>
      doc.content.toLowerCase().includes(entity.name.toLowerCase()),
    );
    if (bp.documents.length && !mentioned) {
      issues.push({
        id: createId("issue"),
        severity: "warning",
        source: "entities",
        target: "documents",
        message: `Entity ${entity.name} is missing from generated documents.`,
      });
    }
  }

  for (const screen of bp.screens) {
    for (const component of screen.components) {
      const inLibrary = bp.documents
        .find((d) => d.key === "04_COMPONENT_LIBRARY")
        ?.content.includes(component);
      if (bp.documents.length && !inLibrary) {
        issues.push({
          id: createId("issue"),
          severity: "info",
          source: screen.name,
          target: "04_COMPONENT_LIBRARY",
          message: `Component ${component} is used in ${screen.name} but not listed in the component library.`,
        });
      }
    }
  }

  for (const doc of bp.documents) {
    if (!doc.content.trim()) {
      issues.push({
        id: createId("issue"),
        severity: "error",
        source: doc.fileName,
        target: "content",
        message: `${doc.fileName} is empty.`,
      });
    }
    if (looksLikePlaceholder(doc.content)) {
      issues.push({
        id: createId("issue"),
        severity: "warning",
        source: doc.fileName,
        target: "content",
        message: `${doc.fileName} still contains placeholder-like text.`,
      });
    }
  }

  if (bp.visual) {
    const accents = bp.visual.colors.filter((c) => c.role === "accent");
    if (accents.length === 0) {
      issues.push({
        id: createId("issue"),
        severity: "warning",
        source: "visual",
        target: "tokens",
        message: "No accent color token found.",
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 8);
  const status =
    errorCount > 0 ? "Action Required" : warningCount > 0 ? "Minor Warnings" : "Pristine";

  return {
    score,
    status,
    issues,
    checkedAt: new Date().toISOString(),
  };
}
