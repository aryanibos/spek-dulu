# SpekDulu

**Jangan langsung coding. Spek dulu.**

SpekDulu is an AI Product Architect for vibe coders. It turns a vague idea into a locked MVP blueprint, Scope Meter decisions, and a Cursor-ready Skill package.

## Features

- Adaptive interview (max 5 questions)
- Decision board with Build now / Build later / Do not build
- Scope Meter (AI-assisted assessment)
- Cursor Skill + PRODUCT/DESIGN/IMPLEMENTATION/TASKS + tokens.css
- 11-document specification workspace
- Screenshot reference analysis
- Safe public URL analysis
- Originality modes: Reference / Inspired / Distinct
- Refinement drawer with local version history
- Coherence validation
- Demo provider when `GEMINI_API_KEY` is missing

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Zod
- Motion
- `@google/genai`
- IndexedDB project store
- Vitest + Playwright

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Gemini (optional)

Add to `.env.local`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Without a key, SpekDulu uses a disclosed deterministic demo provider so the full flow still works.

### Optional URL rendering

```env
BROWSERLESS_WS_ENDPOINT=wss://your-browserless-endpoint
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

## Demo script (3-4 minutes)

1. Click **Use demo idea**.
2. Answer the five critical questions (prefer recommended options).
3. Review Scope Meter and feature buckets.
4. Open workspace.
5. Inspect documents, visual tokens, and coherence.
6. Download ZIP / copy Cursor instruction.
7. Extract into a starter repo and ask Cursor to implement Phase 1 only.

## Docs

Project documentation lives in [`doc/`](./doc):

- [`doc/PRODUCT.md`](./doc/PRODUCT.md) — product purpose and principles
- [`doc/DESIGN.md`](./doc/DESIGN.md) — design system
- [`doc/PRD.md`](./doc/PRD.md) — product requirements

## Deploy

Deploy this repository to Vercel. Set `GEMINI_API_KEY` in project environment variables for live generation. Core screens remain usable in demo mode without it.

## Notes

- Hue shifts are adaptation aids, not legal clearance.
- Coherence score measures internal consistency, not factual truth.
- Backend/database docs include inferred-model disclaimers.
- Project history is stored locally in the browser (IndexedDB).
