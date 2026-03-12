# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Startup Protocol
1. **[2026-03-12] Every Tonight session should begin with context alignment**
   Do instead: read `CLAUDE.md` first, `.claude/napkin.md` second, `docs/project_ledger.md` third, and `docs/planning.md` fourth before substantial work.
2. **[2026-03-12] Use docs/state-of-app.md for architecture questions**
   Do instead: read `docs/state-of-app.md` before proposing architectural changes so you understand the refactoring history and current patterns.
3. **[2026-03-12] Update the ledger after every meaningful change**
   Do instead: append a dated entry to `docs/project_ledger.md` after landing fixes, features, or decisions so the next session has continuity.

## Execution & Validation
1. **[2026-03-12] Type-check before committing**
   Do instead: run `npx tsc --noEmit` after meaningful changes to catch type errors early.
2. **[2026-03-12] Keep docs and code in sync**
   Do instead: when adding new hooks, stores, components, or changing architecture, update `docs/state-of-app.md`, `docs/planning.md`, and `docs/project_ledger.md` in the same session.
3. **[2026-03-12] Test in browser after UI changes**
   Do instead: run `npm run dev` and verify visually when making component or styling changes.
4. **[2026-03-12] Verify Gemini model names against the actual API before using them**
   Do instead: check `@google/genai` SDK docs or the Google AI Studio model list for valid model IDs. Never guess model names.
5. **[2026-03-12] Every "waiting for partner" screen needs a timeout and escape hatch**
   Do instead: add a 30-60s timeout with a "continue anyway" or "retry" button to any screen that blocks on partner input (questions, ratings, activity choices, sync).

## Frontend Patterns
1. **[2026-03-12] State updates that need P2P sync must go through the broadcast pattern**
   Do instead: add a `MessageType` in `types.ts`, handle send in `useSessionState.ts`, and handle receive in `useNetworkSync.ts`.
2. **[2026-03-12] New AI features need prompt builders**
   Do instead: add prompt templates in `services/prompts/` and call them from `geminiService.ts` rather than inlining prompts.
3. **[2026-03-12] Views are selected by state, not by URL routing**
   Do instead: this is a SPA with view-based routing via `App.tsx` conditional rendering. Add new views to the view switch in `App.tsx`.
4. **[2026-03-12] Keep the cinematic aesthetic consistent**
   Do instead: use existing design tokens (CSS vars, glass effects, blur, grain overlay). Dark, premium, late-night look.
5. **[2026-03-12] Animation constants belong in constants.ts**
   Do instead: use `PAGE_VARIANTS` from `constants.ts` for page transitions.
6. **[2026-03-12] AI failures must show error UI, not silent fallbacks**
   Do instead: when a Gemini call fails, show a retry button or error message instead of returning fake data that looks real.
7. **[2026-03-12] P2P event listeners must be cleaned up properly**
   Do instead: always call the unsubscribe function returned by `p2p.onData()`, `p2p.onConnect()`, etc. in the useEffect cleanup. Never let handlers accumulate.
8. **[2026-03-12] Zombie connection check must be in ALL connection event handlers**
   Do instead: check `this.conn === conn` in both `open` and `data` handlers inside `handleConnection()`, not just `open`.
9. **[2026-03-12] Use React refs for throttle/debounce state, never window globals**
   Do instead: when throttling message processing (e.g. SYNC_HELLO), use a `useRef` passed into the handler factory — never `(window as any)._something`.
10. **[2026-03-12] Fix pre-existing type errors before adding new code**
    Do instead: if `tsc --noEmit` reports errors, fix them as part of the current session to keep the project at zero errors.

## Shell & Environment
1. **[2026-03-12] This is a Windows machine with bash shell**
   Do instead: use Unix shell syntax (forward slashes, /dev/null) but be aware that some tools may behave differently on Windows.
2. **[2026-03-12] Vite dev server runs on port 3000**
   Do instead: check `vite.config.ts` for server configuration before assuming defaults.
3. **[2026-03-12] Deployed on Vercel (free tier)**
   Do instead: push to `main` to deploy. Environment variables (GEMINI_API_KEY) are set in Vercel dashboard, not committed.

## Working Style
1. **[2026-03-12] Keep changes grounded in the real codebase**
   Do instead: inspect entrypoints, configs, and active implementation files before proposing structure or documenting behavior.
2. **[2026-03-12] Favor concise, actionable guidance**
   Do instead: record short rules with clear next actions rather than long explanations.
3. **[2026-03-12] Napkin updates are part of the work, not an afterthought**
   Do instead: read `.claude/napkin.md` at session start and update it during the same slice whenever a reusable rule becomes clearer.
4. **[2026-03-12] Ledger updates are part of every fix session**
   Do instead: after landing fixes or making decisions, append a dated entry to `docs/project_ledger.md` before ending the session.
