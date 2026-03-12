# Project Ledger

Chronological record of decisions, changes, and session notes.

---

## 2026-03-12 — Session 1: Setup & Audit

### Context
Adopted project discipline from the Hype repo. Set up CLAUDE.md, napkin runbook, project ledger, Vercel deployment.

### Decisions
- **Deployment**: Moved from Google Cloud to Vercel (free tier, push-to-deploy). `vercel.json` added.
- **Agent setup**: Created `CLAUDE.md` (project conventions), `.claude/napkin.md` (runbook), this ledger.
- **Dropped from Hype**: Machine identity system, multi-machine workflow, heavy docs structure — Tonight is simpler.

### Audit Findings (Full Codebase)
Conducted three-agent parallel audit covering P2P networking, state management, UI components, and Gemini service.

**Critical**
1. Gemini model names (`gemini-3.1-pro-preview`, `gemini-2.5-flash-image`) may be invalid — would break all AI features
2. Zombie P2P connections receive messages after replacement → state corruption
3. Event listener memory leak in useNetworkSync — handlers accumulate on reconnect
4. Messages silently dropped when buffer hits 100, no recovery
5. No error recovery on any "waiting" screen (question, rating, activity, loading)

**High**
6. Heartbeat too aggressive (15s timeout, no backoff) → false disconnections
7. Host sends full state before guest is ready (race condition)
8. Persona avatar broadcast has host/guest role flip — may invert images
9. Scene choices cleared by retransmitted SYNC_SCENE messages
10. Camera flip causes permission errors (old stream not stopped)
11. Toast fill interval leaks on unmount
12. Two Truths lie validation hardcodes middle position as lie

**Medium**
13. SYNC_HELLO throttled via `window` global (fragile)
14. SYNC_FINISHED can fire twice → duplicate arrival events
15. SharedDraft canvas initializes before modal is sized
16. Soundscape creates multiple audio contexts on remount
17. No message validation — malformed messages crash handlers
18. Bot partner simulation for activities is dead code

### Fix Plan (Priority Order)
1. Verify/fix Gemini model names
2. Add timeouts + error UI to all waiting screens
3. Harden p2p.ts — zombie check, cleanup, heartbeat backoff
4. Fix useNetworkSync listener accumulation
5. Add error/retry UI for AI failures

---

## 2026-03-12 — Fix Session 1: Critical Stability Fixes

### Gemini Model Names
Verified via Google AI docs: `gemini-3.1-pro-preview` and `gemini-2.5-flash-image` are valid current model IDs. No changes needed.

### P2P Fixes (services/p2p.ts)
1. **Zombie connection data handler** — added `this.conn !== conn` check in `conn.on('data')`, not just `conn.on('open')`. Malformed messages now rejected with validation.
2. **Heartbeat relaxed** — changed from 15s hard timeout to 30s with 3 missed-cycle tolerance. Ping interval 3s→5s. Buffer congestion no longer counts against timeout.
3. **Init timeout cleanup** — peer is now destroyed when init times out, instead of left running in background.
4. **Connection retry guard** — retry loop no longer schedules new attempts after `isDestroyed` or max attempts reached.

### Network Sync Fixes (hooks/useNetworkSync.ts)
5. **SYNC_HELLO throttle** — replaced `window._lastHelloTime` global with a React ref. No more namespace pollution.
6. **Duplicate sendFullState** — SYNC_HELLO handler was calling `sendFullState()` twice (at 200ms and 1500ms). Consolidated to single call at 300ms.
7. **SYNC_FINISHED double-fire** — added `syncFinishedProcessed` ref guard so duplicate messages don't trigger duplicate arrival events.
8. **Removed duplicate handler creation** — two `useEffect`s were both calling `createSyncHandlers`. Consolidated to one.

### Type Fixes (types.ts)
9. **TRIGGER_FLASH payload** — widened from `string` to `string | { content: string; duration: number }` to match actual usage.
10. **Missing message types** — added `SYNC_LAST_CHOICE` and `REQUEST_SYNC` to NetworkMessage union. Project now has **zero TypeScript errors**.

### UI Timeout Fixes
11. **QuestionView** — added 45s timeout with "Skip & Continue" button when partner doesn't answer.
12. **RatingView** — added 45s timeout with "Continue Without Partner" button when partner doesn't rate.
13. **ToastOverlay** — added interval cleanup on unmount to prevent background leak.
14. **CameraModal** — fixed camera flip race condition: now properly stops old stream and waits 100ms before requesting new one. Also handles unmount during async getUserMedia.
15. **Soundscape** — cleanup now nulls all refs, removes click listener, and wraps AudioContext.close() in catch to prevent errors on already-closed context.

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (2.3s)

---

## 2026-03-12 — Fix Session 2: AI Error Recovery & Stuck-State Prevention

### AI Error Recovery (hooks/useAiActions.ts)
1. **handleActivitySelect** — wrapped entire function in try/catch. On failure, flashes error message and returns to hub instead of leaving view stuck on 'loading'.
2. **finalizeReport** — wrapped in try/catch. On failure, generates a minimal fallback report so IntelligenceBriefing can still open instead of the user being stuck on the rating sync screen.
3. **handleSilentChoice** — wrapped in try/catch. On failure, flashes "Signal interference..." instead of silent crash.

### LoadingView Timeout (components/views/LoadingView.tsx)
4. Added 30s timeout with "Return to Hub" button. Previously the loading screen had no escape hatch — if scene generation failed silently, the user was stuck forever.

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (2.35s)

### What's Next
- Fix persona avatar retry on generation failure
- Consolidate flash message system
- Consider code-splitting (bundle is 1MB, Vite warns about chunk size)
