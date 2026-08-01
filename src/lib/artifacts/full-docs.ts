import type { ProjectBlueprint } from "@/lib/schema";

function disclaimer() {
  return `> Technical assumption notice: backend and database details below are inferred from the product decisions, not reverse-engineered from private systems.`;
}

function featureList(
  bp: ProjectBlueprint,
  bucket: "build_now" | "build_later" | "do_not_build",
) {
  return bp.features
    .filter((f) => f.bucket === bucket)
    .map((f) => `- **${f.name}**: ${f.description}\n  - Why: ${f.reason}\n  - Complexity: ${f.complexity}`)
    .join("\n");
}

export function renderDesignSystem(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  const v = bp.visual;
  return `# Design System

**Product:** ${d.productName}  
**Mode:** ${v?.originalityMode ?? "Inspired"}  
**Audience:** ${d.targetUser}

---

## 1. Visual direction

${v?.summary ?? "Clean premium light workspace with restrained accent color and clear hierarchy."}

Design principles for ${d.productName}:
- One primary accent only
- Generous whitespace and calm density
- Clear hierarchy over decoration
- Mobile-first readability
- Empty / loading / error states must feel intentional

---

## 2. Color system

| Token | Hex | Role | Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
${(v?.colors ?? [])
  .map(
    (c) =>
      `| ${c.name} | \`${c.hex}\` | ${c.role} | ${c.source} | ${c.confidence}% | ${c.explanation} |`,
  )
  .join("\n")}

### Usage rules
- Background stays mostly white / near-white
- Accent is reserved for primary actions and selected states
- Borders stay subtle; do not stack heavy shadows
- Never introduce a second competing accent family in Phase 1

---

## 3. Typography

${(v?.typography ?? [])
  .map(
    (t) => `### ${t.category}
- Family: ${t.family}
- Notes: ${t.notes}
- Confidence: ${t.confidence}%`,
  )
  .join("\n\n")}

### Type scale guidance
- Display / page title: bold, tight tracking
- Section title: semibold
- Body: readable 14-16px equivalent
- Helper / meta: muted secondary text
- Mono only for tokens, IDs, and code

---

## 4. Spacing and radius

### Spacing scale
${(v?.spacingScale ?? ["4", "8", "12", "16", "24", "32", "48"]).map((s) => `- ${s}px`).join("\n")}

### Radii
- Button: ${v?.radii.button ?? "12px"}
- Card: ${v?.radii.card ?? "18px"}
- Modal / drawer: ${v?.radii.modal ?? "20px"}

---

## 5. Components to style first

${(v?.components ?? bp.screens.flatMap((s) => s.components))
  .filter((x, i, arr) => arr.indexOf(x) === i)
  .map((c) => `- ${c}`)
  .join("\n")}

---

## 6. Sections and layout rhythm

${(v?.sections ?? bp.screens.map((s) => s.name))
  .map((s) => `- ${s}`)
  .join("\n")}

Layout rules:
- One primary action per screen
- Cards for interactive content only
- Avoid dashboard clutter in Phase 1

---

## 7. Originality and brand safety

${(v?.warnings ?? ["Do not copy logos, trademarks, or proprietary brand assets."])
  .map((w) => `- ${w}`)
  .join("\n")}

Hue shifts and inspired modes are adaptation aids, not legal clearance.
`;
}

export function renderInformationArchitecture(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# Information Architecture

**Product:** ${d.productName}  
**Primary journey:** ${d.primaryJourney}

---

## 1. Product map

\`\`\`text
${d.productName}
${bp.screens.map((s, i) => `${i === bp.screens.length - 1 ? "└─" : "├─"} ${s.name} (${s.priority})`).join("\n")}
\`\`\`

---

## 2. Screen inventory

${bp.screens
  .map(
    (s) => `### ${s.name}
- Priority: ${s.priority}
- Purpose: ${s.purpose}
- Entry point: part of primary journey
- Components: ${s.components.join(", ")}
- Empty state: explain what to do next
- Error state: keep recovery obvious`,
  )
  .join("\n\n")}

---

## 3. Navigation model

### Primary navigation
${bp.screens.map((s) => `- ${s.name}`).join("\n")}

### Rules
- Keep navigation shallow in Phase 1
- Prefer one create/action entry that is always visible
- Detail screens open from list/overview, not deep nested menus

---

## 4. User session flow

1. Land on the primary overview/home
2. Take the main action related to: ${d.coreProblem}
3. Review result on detail or confirmation state
4. Return to overview with updated status

Protected journey:
> ${d.primaryJourney}

---

## 5. Content priorities by screen

${bp.screens
  .map(
    (s) => `### ${s.name}
1. Primary content that proves the job
2. One clear CTA
3. Supporting metadata only if it helps the decision`,
  )
  .join("\n\n")}

---

## 6. Out of IA scope for Phase 1

${bp.features
  .filter((f) => f.bucket !== "build_now")
  .map((f) => `- ${f.name}`)
  .join("\n") || "- No major deferred IA branches"}
`;
}

export function renderComponentLibrary(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  const names = bp.screens
    .flatMap((s) => s.components)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return `# Component Library

**Product:** ${d.productName}  
**Stack target:** ${d.recommendedStack.join(", ")}

---

## 1. Component principles

- One reusable component per repeated UI pattern
- Explicit states: default, hover, focus, active, disabled, loading, error
- Keep props small and typed
- Prefer composition over giant config objects
- Copy must stay short and action-oriented

---

## 2. Shared primitives

### Button
- Variants: primary, secondary, ghost, danger
- Always one-line labels
- Disabled and loading states required

### Input / Textarea
- Label above field
- Helper text optional
- Inline error below field

### Badge / StatusChip
- Use for status only
- Do not decorate every row with badges

### Card
- Use only when interaction or grouping needs a surface
- Soft border + restrained shadow

---

## 3. Product components

${names
  .map((name) => {
    const usedIn = bp.screens.filter((s) => s.components.includes(name)).map((s) => s.name);
    return `### ${name}
- Purpose: Support ${d.productName} workflow for ${d.targetUser}
- Used in: ${usedIn.join(", ") || "Phase 1 screens"}
- Required states: default, hover, focus, disabled, loading, error
- Content rules: short labels, no placeholder lorem
- Accessibility: keyboard focus, readable contrast, semantic control where possible`;
  })
  .join("\n\n")}

---

## 4. Props guidance

For each component, define:
- visible content props
- status / variant props
- event handlers
- loading / disabled flags

Example pattern:
\`\`\`ts
type ExampleProps = {
  title: string;
  status?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
  onAction?: () => void;
};
\`\`\`

---

## 5. Do not build as custom components yet

${bp.features
  .filter((f) => f.bucket === "do_not_build")
  .map((f) => `- Anything required only by ${f.name}`)
  .join("\n") || "- No extra speculative component families"}
`;
}

export function renderFrontendArchitecture(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# Frontend Architecture

**Product:** ${d.productName}  
**Recommended stack:** ${d.recommendedStack.join(", ")}

---

## 1. Goals

- Ship the primary journey quickly
- Keep files easy for Cursor to edit
- Prefer boring, reversible structure
- Separate UI, domain helpers, and data access lightly

---

## 2. Suggested directory layout

\`\`\`text
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  components/
    ui/
    ${bp.screens.map((s) => s.name.replace(/\s+/g, "")).join("/\n    ")}/
  lib/
    types.ts
    data.ts
    format.ts
  hooks/
\`\`\`

---

## 3. State management

Phase 1 recommendation:
${
  d.dataMode === "local_demo"
    ? "- Use local React state + optional IndexedDB/localStorage persistence\n- No global store framework required"
    : d.dataMode === "online_simple"
      ? "- Use server fetch helpers + local UI state\n- Cache lightly on the client only when needed"
      : "- Keep sync boundaries explicit\n- Do not invent a full realtime architecture before the core loop works"
}

Rules:
- Screen-local state by default
- Lift state only when multiple screens share it
- Keep derived values computed, not duplicated

---

## 4. Screen-to-component mapping

${bp.screens
  .map(
    (s) => `### ${s.name}
- Route/view responsibility: ${s.purpose}
- Composition: ${s.components.join(", ")}
- Data needs: only fields required for this screen`,
  )
  .join("\n\n")}

---

## 5. Data access pattern

### Entities
${bp.entities.map((e) => `- ${e.name}: ${e.fields.join(", ")}`).join("\n")}

### Guidance
- Create typed helpers for create / list / update status
- Keep mock/demo adapters swappable
- Never leak Do Not Build domain concepts into Phase 1 models

---

## 6. Performance and UX constraints

- Optimize for first interaction, not premature micro-optimization
- Skeleton states for list/detail loading
- Images compressed before upload if used
- Respect reduced motion

---

## 7. Build order

1. Tokens + shell layout
2. Shared UI primitives
3. Primary overview screen
4. Create / action flow
5. Detail / status update flow
6. Empty-error polish
`;
}

export function renderBackendArchitecture(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  const resources = bp.entities.map((e) => e.name.toLowerCase());
  return `# Backend Architecture

${disclaimer()}

**Product:** ${d.productName}  
**Auth in Phase 1:** ${d.mustHaveAuth ? "yes" : "no"}  
**Data mode:** ${d.dataMode}

---

## 1. Phase 1 recommendation

${
  d.dataMode === "local_demo"
    ? `No dedicated backend is required for Phase 1.
Keep create/list/update operations in the client with demo persistence.
Add a backend only when online multi-device access becomes a real requirement.`
    : `Expose the smallest JSON API that supports Build Now features only.
Do not design a platform. Design endpoints for the primary journey.`
}

---

## 2. Service boundaries

- Product API for core entities
${d.mustHaveAuth ? "- Auth/session boundary" : "- No auth service in Phase 1"}
- No notification, billing, or analytics services in Phase 1

---

## 3. Suggested endpoints

${resources
  .map(
    (r) => `### ${r}
- \`GET /api/${r}\` — list records
- \`POST /api/${r}\` — create record
- \`GET /api/${r}/:id\` — get detail
- \`PATCH /api/${r}/:id\` — update status/fields`,
  )
  .join("\n\n")}

### Error contract
- \`400\` validation error
- \`401\` unauthorized${d.mustHaveAuth ? "" : " (unused in Phase 1)"}
- \`404\` missing resource
- \`500\` unexpected failure

---

## 4. Request / response shape guidance

Use explicit JSON objects, for example:

\`\`\`json
{
  "id": "string",
  "status": "open",
  "createdAt": "ISO-8601"
}
\`\`\`

Validation rules:
- Reject unknown required fields early
- Keep payloads minimal
- Prefer ISO dates and string IDs

---

## 5. Auth

${
  d.mustHaveAuth
    ? `- Include simple email/password or magic-link style auth after the core loop works
- Protect mutating endpoints
- Keep roles out of Phase 1 unless absolutely necessary`
    : `- Skip authentication in Phase 1
- Use a demo profile
- Add auth only after the primary journey is proven`
}

---

## 6. Explicitly deferred backend work

${featureList(bp, "do_not_build")}
`;
}

export function renderDatabaseSchema(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# Database Schema

${disclaimer()}

**Product:** ${d.productName}  
**Data mode:** ${d.dataMode}

---

## 1. Modeling principles

- Model only entities needed by Build Now
- Prefer simple relational tables / collections
- Avoid speculative polymorphic designs
- Keep nullable fields intentional

---

## 2. Entities

${bp.entities
  .map(
    (e) => `### ${e.name}
| Field | Notes |
| --- | --- |
${e.fields.map((f) => `| ${f} | core field |`).join("\n")}
${e.notes ? `\nNotes: ${e.notes}` : ""}`,
  )
  .join("\n\n")}

---

## 3. Relationships

${
  bp.entities.length > 1
    ? bp.entities
        .slice(1)
        .map((e) => `- ${e.name} likely references ${bp.entities[0]?.name}`)
        .join("\n")
    : "- Single primary entity in Phase 1"
}

---

## 4. Example pseudo-schema

\`\`\`ts
${bp.entities
  .map(
    (e) => `type ${e.name} = {
${e.fields.map((f) => `  ${f.replace("?", "")}${f.includes("?") ? "?" : ""}: string;`).join("\n")}
};`,
  )
  .join("\n\n")}
\`\`\`

---

## 5. Indexing / query needs

- Index fields used for list filters and lookups
- Optimize for the primary journey, not every future report

---

## 6. Migration mindset

- Start with the smallest schema that passes acceptance criteria
- Add columns only when a Build Now feature needs them
- Do not pre-build tables for Do Not Build features

Deferred:
${featureList(bp, "do_not_build")}
`;
}

export function renderSeoAccessibility(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# SEO & Accessibility

**Product:** ${d.productName}

---

## 1. SEO baseline

- Title: ${d.productName}
- Meta description: ${d.oneLiner}
- Open Graph title: ${d.productName}
- Open Graph description: ${d.oneLiner}
- Canonical: product root URL once deployed

### Content rules
- One H1 per page
- Meaningful link text
- No keyword stuffing
- Keep Phase 1 pages focused on the product job

---

## 2. Core Web Vitals targets

- LCP under 2.5s on a normal connection
- INP under 200ms for primary actions
- CLS under 0.1
- Reserve space for images and async content

---

## 3. Accessibility requirements

- WCAG AA contrast for text and controls
- Keyboard access for all primary actions
- Visible focus states
- Labels on every input
- Alt text for meaningful images
- Do not rely on color alone for status
- Support \`prefers-reduced-motion\`

---

## 4. Screen-level a11y checklist

${bp.screens
  .map(
    (s) => `### ${s.name}
- [ ] Heading hierarchy is valid
- [ ] Primary action is reachable by keyboard
- [ ] Empty and error states are announced clearly
- [ ] Status changes are understandable without color alone`,
  )
  .join("\n\n")}

---

## 5. Inclusive copy

- Write for ${d.targetUser}
- Prefer plain language
- Avoid jargon unless the audience already uses it
- Keep error messages actionable
`;
}

export function renderImplementationRoadmap(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# Implementation Roadmap

**Product:** ${d.productName}  
**Scope label:** ${bp.scope.label} (${bp.scope.score}/100)

---

## Phase 0 — Setup
- [ ] Initialize project with recommended stack
- [ ] Apply tokens.css / design tokens
- [ ] Create base layout and routing shell
- [ ] Add empty-state primitives

## Phase 1 — Build now MVP
${bp.acceptanceCriteria.map((a) => `- [ ] ${a.text}`).join("\n")}

### Feature breakdown
${bp.features
  .filter((f) => f.bucket === "build_now")
  .map((f, i) => `${i + 1}. ${f.name} — ${f.description}`)
  .join("\n")}

### Screen breakdown
${bp.screens.map((s, i) => `${i + 1}. ${s.name} — ${s.purpose}`).join("\n")}

## Phase 2 — Build later
${featureList(bp, "build_later") || "- None queued"}

## Phase 3 — Explicitly deferred
${featureList(bp, "do_not_build") || "- None deferred"}

---

## Milestone checks

### Milestone A
- Shell + tokens + first screen render

### Milestone B
- Primary create/action path works with demo data

### Milestone C
- Detail/status update path works
- Acceptance criteria pass
- Demo script rehearsed

---

## Stop rules

Stop coding Phase 1 when:
- All Build now acceptance criteria pass
- Non-goals remain unimplemented
- The primary journey is demoable live
`;
}

export function renderDesignAdaptationGuide(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  const v = bp.visual;
  return `# Design Adaptation Guide

**Product:** ${d.productName}  
**Originality mode:** ${v?.originalityMode ?? "Inspired"}

---

## 1. What to preserve

- Clear visual hierarchy
- Calm spacing rhythm
- High-contrast readable text
- Soft elevation and restrained borders
- One dominant accent strategy
- Component composition that supports: ${d.primaryJourney}

---

## 2. What must change

- Brand name and product copy
- Logos and trademarked marks
- Proprietary illustrations/icons
- Exact marketing slogans from references
- Any distinctive brand mascot or locked visual trademark

---

## 3. Adaptation strategy by mode

### Reference
Use for learning structure and hierarchy. Still replace brand identity.

### Inspired
Keep rhythm and component logic, shift accent identity and content to ${d.productName}.

### Distinct
Increase divergence in accent, type personality, and surface treatment while preserving usability patterns.

---

## 4. Product-fit guidance

${d.productName} should feel right for **${d.targetUser}**.
Visual tone should support this job: **${d.coreProblem}**.

Recommended emphasis:
- Clarity over spectacle
- Trustworthy product surfaces
- Fast scanning of status and actions

---

## 5. Warnings

${(v?.warnings ?? ["Do not claim legal originality from color shifts alone."])
  .map((w) => `- ${w}`)
  .join("\n")}

---

## 6. Practical do / don't

### Do
- Reuse layout principles
- Keep accessibility intact
- Rewrite all content for ${d.productName}

### Don't
- Copy logos
- Clone trademarked illustrations
- Ship a near-identical brand replica
`;
}

export function renderMasterBuildPrompt(bp: ProjectBlueprint): string {
  const d = bp.decisions;
  return `# Master Build Prompt

You are an elite product engineer implementing **${d.productName}**.

## Product context
- One-liner: ${d.oneLiner}
- Target user: ${d.targetUser}
- Core problem: ${d.coreProblem}
- Primary journey: ${d.primaryJourney}
- Auth in Phase 1: ${d.mustHaveAuth ? "yes" : "no"}
- Data mode: ${d.dataMode}
- Stack: ${d.recommendedStack.join(", ")}

## Source of truth order
1. \`docs/01_PRD.md\`
2. \`.cursor/skills/spekdulu/SKILL.md\`
3. \`DESIGN.md\` + \`tokens.css\`
4. \`IMPLEMENTATION.md\` + \`TASKS.md\`
5. Remaining docs in \`docs/\`

## Hard rules
1. Implement Build Now features only.
2. Do not implement Non-goals / Do Not Build features.
3. Follow the design tokens exactly.
4. Keep architecture simple and reversible.
5. Stop when Phase 1 acceptance criteria pass.
6. Prefer demo/local data unless online storage is required.

## Build now
${featureList(bp, "build_now")}

## Screens
${bp.screens.map((s) => `- ${s.name}: ${s.purpose}`).join("\n")}

## Acceptance criteria
${bp.acceptanceCriteria.map((a) => `- ${a.text}`).join("\n")}

## Implementation order
1. Project setup + tokens
2. App shell
3. Shared UI primitives
4. Primary screens in journey order
5. Demo data + status updates
6. Empty/loading/error states
7. Final acceptance pass

## Definition of done
- Build succeeds
- Primary journey is demoable
- No deferred features sneaked in
- UI matches SpekDulu tokens and PRD constraints
`;
}
