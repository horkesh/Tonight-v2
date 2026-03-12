# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Startup Protocol
1. **[2026-03-12] Every Tonight session should begin with context alignment**
   Do instead: read `CLAUDE.md` first, `.claude/napkin.md` second, and `docs/planning.md` third before substantial work so architecture, recurring rules, and outstanding tasks stay aligned.
2. **[2026-03-12] Use docs/state-of-app.md for architecture questions**
   Do instead: read `docs/state-of-app.md` before proposing architectural changes so you understand the refactoring history and current patterns.

## Execution & Validation
1. **[2026-03-12] Type-check before committing**
   Do instead: run `npx tsc --noEmit` after meaningful changes to catch type errors early.
2. **[2026-03-12] Keep docs and code in sync**
   Do instead: when adding new hooks, stores, components, or changing architecture, update `docs/state-of-app.md` and `docs/planning.md` in the same session.
3. **[2026-03-12] Test in browser after UI changes**
   Do instead: run `npm run dev` and verify visually when making component or styling changes — Tailwind and Framer Motion behavior can differ from expectations.

## Frontend Patterns
1. **[2026-03-12] State updates that need P2P sync must go through the broadcast pattern**
   Do instead: when adding new synced state, add a `MessageType` in `types.ts`, handle send in `useSessionState.ts`, and handle receive in `useNetworkSync.ts`.
2. **[2026-03-12] New AI features need prompt builders**
   Do instead: add prompt templates in `services/prompts/` and call them from `geminiService.ts` rather than inlining prompts.
3. **[2026-03-12] Views are selected by state, not by URL routing**
   Do instead: remember this is a single-page app with view-based routing via `App.tsx` conditional rendering, not file-based routing. Add new views to the view switch in `App.tsx`.
4. **[2026-03-12] Keep the cinematic aesthetic consistent**
   Do instead: use the existing design tokens (CSS vars, glass effects, blur, grain overlay) when adding new UI. The app has a deliberate dark, premium, late-night look.
5. **[2026-03-12] Animation constants belong in constants.ts**
   Do instead: use `PAGE_VARIANTS` from `constants.ts` for page transitions and define new shared animation configs there rather than inline.

## Shell & Environment
1. **[2026-03-12] This is a Windows machine with bash shell**
   Do instead: use Unix shell syntax (forward slashes, /dev/null) but be aware that some tools may behave differently on Windows.
2. **[2026-03-12] Vite dev server runs on port 3000**
   Do instead: check `vite.config.ts` for server configuration before assuming defaults.

## Working Style
1. **[2026-03-12] Keep changes grounded in the real codebase**
   Do instead: inspect entrypoints, configs, and active implementation files before proposing structure or documenting behavior.
2. **[2026-03-12] Favor concise, actionable guidance**
   Do instead: record short rules with clear next actions rather than long explanations.
3. **[2026-03-12] Napkin updates are part of the work, not an afterthought**
   Do instead: read `.claude/napkin.md` at session start and update it during the same slice whenever a reusable rule becomes clearer.
