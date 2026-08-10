import type { ProjectBlueprint } from "@/lib/schema";
import {
  sanitizeExportHeading,
  sanitizeYamlScalar,
  stripDangerousMarkdown,
} from "@/lib/security/sanitize";

export function renderCursorSkill(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  const productName = sanitizeYamlScalar(d.productName);
  const content = `---
name: spekdulu
description: Build the locked MVP for ${productName} using SpekDulu decisions, tokens, and Phase 1 acceptance criteria. Use when implementing this product or asking what to build next.
---

# SpekDulu Skill for ${sanitizeExportHeading(d.productName)}

## When to use
Use this skill whenever implementing ${sanitizeExportHeading(d.productName)}, refining UI, or deciding whether a feature belongs in Phase 1.

## Product context
- One-liner: ${d.oneLiner}
- Target user: ${d.targetUser}
- Core problem: ${d.coreProblem}
- Primary journey: ${d.primaryJourney}
- Auth in Phase 1: ${d.mustHaveAuth ? "yes" : "no"}
- Data mode: ${d.dataMode}

## Design principles
- Calm premium light workspace
- One primary action per screen
- Clear empty/loading/error states
- No trademarked assets from references
- Prefer reusable components over one-off layouts

## Token rules
- Follow \`tokens.css\` and \`DESIGN.md\`
- Keep accent usage restrained
- Do not invent a second accent family

## Build Now only
${bp.features
  .filter((f) => f.bucket === "build_now")
  .map((f) => `- ${f.name}: ${f.description}`)
  .join("\n")}

## Do not build yet
${bp.features
  .filter((f) => f.bucket !== "build_now")
  .map((f) => `- ${f.name}: ${f.reason}`)
  .join("\n")}

## Implementation order
1. Set up tokens and base layout
2. Implement primary screens
3. Wire the core journey with demo data
4. Add empty/loading/error states
5. Verify acceptance criteria
6. Stop and summarize what remains

## Acceptance criteria
${bp.acceptanceCriteria.map((a) => `- ${a.text}`).join("\n")}

## Definition of done
- Phase 1 criteria pass
- Build succeeds
- No Do Not Build features sneaked in
- UI remains coherent with SpekDulu tokens
`;

  return stripDangerousMarkdown(content.trim()) + "\n";
}
