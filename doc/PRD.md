# SpekDulu — Product Requirements Document

**Product:** SpekDulu  
**Tagline:** Jangan langsung coding. Spek dulu.  
**Version:** 1.0 Hackathon MVP  
**Date:** August 2026  
**Owner:** SpekDulu team  
**Status:** Ready for build and demo

---

## 1. What is a PRD here?

This document defines **what we are building and why**, written down before any code changes to the product direction.

SpekDulu is an AI Product Architect for vibe coders. It turns a vague app idea into a locked MVP blueprint and a Cursor-ready Skill package.

---

## 2. Problem

Vibe coders start building in Cursor before they lock the MVP, so scope expands, AI invents extra features, and demos fail.

---

## 3. Goal

Help a vibe coder go from a messy idea to a focused, Cursor-executable MVP specification in under 10 minutes, without needing to write a PRD manually.

---

## 4. Target users

### Primary persona: Aya — Vibe Coder

- Can use Cursor, but struggles to decide features and MVP scope
- Often pastes a vague prompt and hopes the AI “figures it out”
- Needs a clear first version that can be demoed the same day

### Secondary persona: Raka — Solo Founder / Hackathon Builder

- Has a product idea and limited time
- Does not want a 20-page document
- Wants decisions, cuts, and a package Cursor can follow

---

## 5. User stories

### US-01 — Describe a messy idea
**As a** vibe coder,  
**I want** to paste a rough product idea in plain language,  
**so that** I can start scoping without writing a formal PRD.

### US-02 — Answer critical product questions
**As a** vibe coder,  
**I want** SpekDulu to ask only a few adaptive questions,  
**so that** I lock the important decisions before coding.

### US-03 — See recommended MVP cuts
**As a** hackathon builder,  
**I want** features split into Build now / Build later / Do not build,  
**so that** I do not waste time on scope that will break the demo.

### US-04 — Understand scope risk
**As a** solo founder,  
**I want** a Scope Meter with reasons and recommended cuts,  
**so that** I know whether my MVP is still too big.

### US-05 — Open a clear workspace
**As a** vibe coder,  
**I want** a workspace that shows decisions, screens, entities, and docs,  
**so that** I can review the plan before asking Cursor to build.

### US-06 — Export a Cursor Skill package
**As a** vibe coder,  
**I want** to download a ZIP with Skill, design tokens, tasks, and docs,  
**so that** Cursor can implement Phase 1 with consistent context.

### US-07 — Use a visual reference safely
**As a** builder with a screenshot or public URL,  
**I want** SpekDulu to extract visual direction with confidence labels,  
**so that** my UI stays inspired without pretending to be an exact clone.

### US-08 — Refine one document
**As a** product-minded builder,  
**I want** to refine a generated document in chat and restore older versions,  
**so that** I can adjust the plan without regenerating everything.

### US-09 — Demo without API keys
**As a** hackathon participant,  
**I want** SpekDulu to work in demo mode when Gemini is unavailable,  
**so that** my presentation does not fail because of credentials.

---

## 6. Non-goals

What we will **not** build in this hackathon MVP:

1. User accounts, login, or multi-user collaboration
2. Cloud project database / team workspace
3. Exact 1:1 website cloning
4. Legal trademark certification or brand-safety guarantees
5. Automatic full-app code generation inside SpekDulu itself
6. Payment, billing, or subscription systems
7. Realtime multiplayer editing
8. Figma plugin or design-tool sync
9. Mobile native apps
10. Background Cursor agent orchestration from SpekDulu servers

SpekDulu prepares context for Cursor. It does **not** replace Cursor.

---

## 7. Acceptance criteria

### AC for US-01
- [ ] User can enter a product idea of at least a short paragraph
- [ ] Demo idea button fills a ready-to-use example
- [ ] Empty or tiny ideas cannot start the interview

### AC for US-02
- [ ] SpekDulu generates up to 5 adaptive questions
- [ ] Each question has recommended options when useful
- [ ] User can choose an option or type a custom answer when allowed
- [ ] Answers are carried into the blueprint

### AC for US-03
- [ ] Blueprint shows Build now, Build later, and Do not build
- [ ] Common scope traps like payments, chat, and admin analytics are pushed out of Build now unless essential
- [ ] Every feature has a short reason

### AC for US-04
- [ ] Scope Meter shows a score, label, summary, reasons, and recommended cuts
- [ ] UI clearly labels it as AI-assisted assessment, not an objective grade

### AC for US-05
- [ ] Workspace opens from a saved local project
- [ ] Overview shows product decisions, screens, entities, and coherence status
- [ ] Works on mobile, tablet, and desktop widths

### AC for US-06
- [ ] ZIP contains `.cursor/skills/spekdulu/SKILL.md`
- [ ] ZIP also contains `PRODUCT.md`, `DESIGN.md`, `IMPLEMENTATION.md`, `TASKS.md`, `tokens.css`, and docs
- [ ] User can copy a Cursor build instruction in one click

### AC for US-07
- [ ] User can upload PNG/JPEG/WebP screenshot
- [ ] User can optionally paste a public URL
- [ ] Visual tokens show source and confidence
- [ ] Originality modes are Reference / Inspired / Distinct
- [ ] Product never claims legal originality from hue shifts

### AC for US-08
- [ ] User can refine the active document with a short request
- [ ] Previous version is stored locally
- [ ] User can restore a previous version

### AC for US-09
- [ ] App runs end-to-end with no `GEMINI_API_KEY`
- [ ] UI discloses Demo provider vs Gemini live
- [ ] When key exists, Gemini is used for generation

### Demo acceptance
- [ ] Full path works: idea → interview → scope → workspace → ZIP
- [ ] Demo can be completed in under 4 minutes
- [ ] Production build succeeds
- [ ] Core unit and e2e smoke tests pass

---

## 8. Constraints

### Time
- Built for a one-day Cursor Meetup Jakarta hackathon
- Live build window is short, so demo reliability beats feature count
- Prefer staged delivery: core flow first, advanced extraction second

### Cost
- Must work without paid API calls via demo provider
- Gemini usage is optional and should stay cheap for demo volume
- No paid browser infra required for MVP; Browserless is optional

### People
- Solo / small-team build
- One main product narrative for judging
- No dedicated design, legal, or DevOps specialist assumed

### Technical constraints
- Stack: Next.js, TypeScript, Tailwind, Zod
- Project history stored in browser IndexedDB only
- Public URL fetching must block private/internal addresses
- Vercel request body limits apply to screenshot uploads
- Coherence score measures internal consistency only, not factual truth

---

## 9. Functional scope

### P0 — Must ship for demo
- Idea input wizard
- Adaptive interview
- Decision board
- Scope Meter
- Blueprint workspace
- Cursor Skill + core artifact export
- ZIP download
- Demo provider fallback
- Responsive premium light UI

### P1 — Strong if stable
- Screenshot analysis
- Public URL analysis
- Originality modes
- 11-document suite
- Document refinement + local version history
- Coherence validation

### P2 — Later
- Cloud sync
- Auth and shared workspaces
- Figma import
- Higher-fidelity browser rendering pipeline
- Automated Cursor install into a starter repo

---

## 10. Success metrics

### Hackathon success
- Judges understand the value in under 30 seconds
- Live demo completes without API-key dependency
- Cursor Skill package is shown as the real handoff
- Scope cutting is visibly more valuable than “more documents”

### Product success signals after hackathon
- Time from idea to first usable Cursor package
- Number of Build now features after SpekDulu vs before
- Whether Cursor can implement Phase 1 with fewer correction prompts
- Download / copy-instruction usage

---

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Looks like a generic PRD generator | High | Lead with Scope Meter and Cursor Skill handoff |
| Demo fails without Gemini | High | Keep disclosed demo provider always available |
| Scope too large for one day | High | Lock P0 first; P1 only after end-to-end works |
| URL scraping treated as ground truth | Medium | Use safe fetch + confidence labels + disclaimers |
| Legal misunderstanding around originality | Medium | Never claim trademark safety from color shifts |

---

## 12. Demo script

1. Show a messy idea.
2. Run adaptive interview.
3. Show SpekDulu cutting unnecessary features.
4. Open Scope Meter.
5. Open workspace and documents.
6. Download Cursor Skill ZIP.
7. Paste Cursor instruction and explain Phase 1 build.
8. Close with: “SpekDulu does not replace Cursor. It makes visual and product intent executable by Cursor.”

---

## 13. Definition of done

This PRD is done when:

- Problem is one clear sentence
- User stories cover the full demo journey
- Non-goals are explicit
- Acceptance criteria are testable
- Constraints for time, cost, and people are written down
- P0 scope is small enough to demo reliably in one day
