# RFC: SpekDulu Architecture & Product Decisions

**Title:** SpekDulu — AI Product Architect for vibe coders  
**Status:** Accepted for hackathon MVP  
**Author:** Arya Isnaidi  
**Date:** August 2026  
**Repo:** https://github.com/aryanibos/spek-dulu

---

## 1. Summary

SpekDulu helps vibe coders lock MVP scope before coding in Cursor.  
This RFC records the key product and technical decisions for the hackathon MVP.

Core promise:

> Jangan langsung coding. Spek dulu.

---

## 2. Problem framing

Builders often paste a vague idea into Cursor and ask the model to invent the product. That creates:

1. Scope creep
2. Invented features
3. Weak demos
4. Inconsistent UI direction

SpekDulu sits **before** Cursor. It decides what to build, what to cut, and exports a Cursor-executable package.

---

## 3. Decisions

### D1 — Decide before documenting

**Decision:** Scope cutting is more important than generating long docs.  
**Why:** A short locked MVP beats a 20-page PRD that still includes payments, chat, and admin.

**Implication:**
- Adaptive interview max 5 questions
- Features must land in Build now / Build later / Do not build
- Scope Meter is a first-class UI surface

---

### D2 — Cursor-native output, not in-app codegen

**Decision:** SpekDulu exports a Skill + docs ZIP. It does not generate the full app itself.  
**Why:** Cursor is the builder. SpekDulu is the architect.

**Export package includes:**
- `.cursor/skills/spekdulu/SKILL.md`
- `PRODUCT.md`, `DESIGN.md`, `IMPLEMENTATION.md`, `TASKS.md`
- `tokens.css`
- `docs/01`–`11` specification files

---

### D3 — Demo provider must work without API keys

**Decision:** Keep a deterministic demo provider when `GEMINI_API_KEY` is missing.  
**Why:** Hackathon demos cannot depend on credentials or quota.

**Implication:**
- UI discloses `demo` vs `gemini`
- End-to-end flow remains usable offline from Gemini

---

### D4 — Local-first project storage

**Decision:** Store projects in browser IndexedDB. No auth in MVP.  
**Why:** Fast to ship, no login friction, enough for solo demos.

**Tradeoff:**
- No multi-device sync
- Clearing browser storage loses projects

Accepted for hackathon scope.

---

### D5 — Stack choice

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js App Router | Fast deploy on Vercel, API routes |
| Language | TypeScript | Safer schemas and provider contracts |
| UI | Tailwind CSS + Plus Jakarta Sans | Premium light workspace look |
| Validation | Zod | Shared request/blueprint schemas |
| AI | Gemini optional + demo fallback | Live quality when available, demo resilience always |
| Export | JSZip + FileSaver | Client-side Skill package download |

---

### D6 — Visual references are inspired, not clones

**Decision:** Support screenshot / public URL analysis with originality modes:

- Reference
- Inspired
- Distinct

**Why:** Builders want visual direction, but exact cloning creates legal and quality risk.

**Rules:**
- Label confidence and source
- Never claim trademark safety from hue shifts
- Prefer adaptation into SpekDulu tokens

---

### D7 — URL fetching must be safe

**Decision:** Public URL analysis uses allowlisted safe fetch only.  
**Why:** Block SSRF / private network access.

**Implication:**
- Validate host before fetch
- Treat extracted CSS colors as hints, not ground truth
- Browserless remains optional for higher fidelity later

---

### D8 — Premium light product UI

**Decision:** Light workspace aesthetic inspired by Linear / Vercel / Notion AI.  
**Accent:** `#2196F3`  
**Avoid:** purple AI gradients, admin templates, neon cyberpunk.

**Why:** SpekDulu should feel like a calm product architect, not a flashy AI toy.

---

## 4. System flow

```text
Messy idea
  -> Adaptive interview (<=5 Qs)
  -> Locked decisions + feature buckets
  -> Scope Meter
  -> Workspace (overview / docs / visual / export)
  -> Cursor Skill ZIP
  -> Implement Phase 1 in Cursor
```

Optional branch:
```text
Screenshot or public URL
  -> Visual tokens + originality mode
  -> DESIGN.md + tokens.css
```

---

## 5. API surface (MVP)

| Route | Purpose |
| --- | --- |
| `/api/interview` | Generate adaptive questions |
| `/api/blueprint` | Build project blueprint |
| `/api/validate` | Coherence checks |
| `/api/refine` | Refine one document |
| `/api/generate-doc` | Render a specific doc |
| `/api/analyze-visual` | Screenshot visual analysis |
| `/api/analyze-url` | Public URL visual hints |
| `/api/visual-design` | Suggest / revise / apply visual system |

---

## 6. Non-goals (explicitly deferred)

1. Auth / accounts / team workspaces
2. Cloud project database
3. Exact 1:1 website cloning
4. Full app code generation inside SpekDulu
5. Payments / billing
6. Figma sync
7. Background Cursor agent orchestration from SpekDulu servers

---

## 7. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Looks like generic PRD generator | Lead with Scope Meter + Cursor Skill handoff |
| Demo fails without Gemini | Always-on demo provider |
| Scope too large for one day | P0 flow first; P1 only after e2e works |
| Visual reference misunderstood as clone | Originality modes + disclaimers |
| Unsafe URL fetch | Public URL guardrails |

---

## 8. Success criteria for this RFC

- [x] Product role is clear: architect before Cursor, not replacement for Cursor
- [x] Scope Meter and feature buckets are first-class
- [x] Demo works without API keys
- [x] Export package is Cursor-executable
- [x] Visual system supports revise / URL / app-fit suggestions
- [x] PRD, design system, and this RFC are documented for submission

---

## 9. Open questions (post-hackathon)

1. Should projects sync to cloud after auth?
2. Should SpekDulu open a starter repo and inject the Skill automatically?
3. How far should Browserless go for high-fidelity visual extraction?
4. Can Scope Meter learn from successful Cursor builds over time?

---

## 10. Recommendation

Accept this RFC for the hackathon MVP.

Ship the end-to-end path:

**idea → interview → scope cuts → workspace → Cursor Skill ZIP**

Optimize for demo reliability and clear product narrative over feature breadth.
