import type { FeatureItem, ScopeAssessment } from "@/lib/schema";
import { clamp } from "@/lib/utils";

const COMPLEXITY_WEIGHT = {
  low: 6,
  medium: 12,
  high: 22,
} as const;

export function assessScope(features: FeatureItem[], extras?: {
  mustHaveAuth?: boolean;
  dataMode?: string;
  screenCount?: number;
}): ScopeAssessment {
  const now = features.filter((f) => f.bucket === "build_now");
  const later = features.filter((f) => f.bucket === "build_later");
  const cut = features.filter((f) => f.bucket === "do_not_build");

  let load = now.reduce((sum, f) => sum + COMPLEXITY_WEIGHT[f.complexity], 0);
  if (extras?.mustHaveAuth) load += 10;
  if (extras?.dataMode === "online_multiplayer") load += 18;
  if ((extras?.screenCount ?? 0) > 5) load += 12;

  const score = clamp(Math.round(100 - load), 0, 100);
  const label =
    score >= 70 ? "Lean MVP" : score >= 45 ? "Balanced MVP" : "Overloaded";

  const reasons: string[] = [];
  if (now.length > 5) reasons.push("Too many Build Now features for a one-day MVP.");
  if (now.some((f) => f.complexity === "high")) {
    reasons.push("At least one high-complexity feature is still in Build Now.");
  }
  if (extras?.mustHaveAuth) {
    reasons.push("Authentication adds setup and edge-case cost before core value.");
  }
  if (extras?.dataMode === "online_multiplayer") {
    reasons.push("Realtime/multiplayer storage is usually overkill for first demo.");
  }
  if (reasons.length === 0) {
    reasons.push("Scope is focused enough for a Cursor-assisted first build.");
  }

  const recommendedCuts = [
    ...now
      .filter((f) => f.complexity === "high")
      .slice(0, 2)
      .map((f) => `Move "${f.name}" to Build Later.`),
    ...cut.slice(0, 2).map((f) => `Keep "${f.name}" out of MVP.`),
  ];

  if (later.length === 0 && recommendedCuts.length === 0) {
    recommendedCuts.push("Keep Phase 1 under three screens and one primary journey.");
  }

  return {
    score,
    label,
    summary:
      label === "Lean MVP"
        ? "This MVP looks buildable. Lock decisions and start Phase 1."
        : label === "Balanced MVP"
          ? "This can work, but cut one more ambitious feature before coding."
          : "This scope is too large. Remove high-complexity work before opening Cursor.",
    reasons,
    recommendedCuts,
  };
}

export function autoBucketFeatures(
  names: Array<{ name: string; description: string; complexity: FeatureItem["complexity"] }>,
): FeatureItem[] {
  return names.map((item, index) => {
    let bucket: FeatureItem["bucket"] = "build_now";
    let reason = "Core to the first user journey.";

    if (index >= 4 || item.complexity === "high") {
      bucket = "build_later";
      reason = "Useful, but not required to prove the core loop.";
    }
    if (
      /payment|subscription|chat|realtime|admin dashboard|social login|analytics|notification/i.test(
        `${item.name} ${item.description}`,
      )
    ) {
      bucket = "do_not_build";
      reason = "Common scope trap. Defer until the MVP journey works.";
    }
    if (index < 3 && bucket !== "do_not_build") {
      bucket = "build_now";
      reason = "Essential for the first demoable flow.";
    }

    return {
      id: `feat_${index + 1}`,
      name: item.name,
      description: item.description,
      bucket,
      reason,
      complexity: item.complexity,
    };
  });
}
