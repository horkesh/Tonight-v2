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

---

## 2026-03-12 — Fix Session 3: Resilience & Edge Cases

### Persona Avatar Retry (hooks/usePersonaLogic.ts)
1. **Auto-retry on failure** — `updatePersonaImage` now retries up to 2 more times with exponential backoff (3s, 6s) if generation fails or returns null. Previously failed silently with no retry.

### Activity Flow (components/views/ActivityView.tsx)
2. **Partner choice timeout** — if partner doesn't choose within 30s (connected) or 2s (disconnected), their choice is auto-simulated. Previously would wait forever if connected.

### Arrival Overlay (components/ArrivalOverlay.tsx)
3. **Stable dismiss timer** — `onDismiss` callback is now ref-stabilized so parent re-renders don't reset the 5.5s auto-dismiss timer.

### SharedDraft (components/SharedDraft.tsx)
4. **Canvas init delay** — added 100ms delay before initial sizing to let modal animation populate layout dimensions. Prevents 0x0 canvas.
5. **Remote drawing state reset** — `remoteLastPoint` is cleared when draft reopens, preventing stale strokes from old sessions.

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (2.64s)

---

## 2026-03-12 — Fix Session 4: Code Splitting, Two Truths Fix

### Two Truths Lie Validation (services/geminiService.ts)
1. **Randomized lie position** — when AI returns invalid lie count, the fallback now places the lie at a random index instead of always position 1 (middle). Prevents trivial guessing.

### Code Splitting (vite.config.ts)
2. **Vendor chunking** — split heavy dependencies into separate cached chunks:
   - `vendor-react` (4KB) — React/ReactDOM
   - `vendor-motion` (133KB) — Framer Motion
   - `vendor-peer` (94KB) — PeerJS
   - `vendor-genai` (267KB) — Google GenAI SDK
   - `vendor-charts` (0.04KB) — Recharts (tree-shaken, barely used)
   - App code: 1,067KB → 569KB (47% reduction)
   - Vendor chunks cache independently across deploys

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (4.1s)

### What's Next
- Consolidate flash message system (3 overlapping patterns)
- Clean up dead code (simulateActivityPartner)
- Consider lazy-loading IntelligenceBriefing and view components

---

## 2026-03-12 — Fix Session 5: Activity Sync Bug, Cleanup

### Flash Message System Review
Reviewed the 3 flash message patterns. They serve genuinely different communication purposes — **not redundant**:
1. `triggerFlash` — local-only notification (rose pill banner), for status feedback to self
2. `sendFlash` — partner-only notification (via reaction display), tells partner what you did
3. `triggerReaction` — bilateral (shows on both sides), for shared reactions/images/emojis
No consolidation needed.

### broadcastActivityData Call Signature Bug (useSessionState.ts)
1. **Critical**: `broadcastActivityData(type, data)` accepted two separate args, but both call sites passed a single object `{ type, data }`. This meant `type` received the whole object, `data` was undefined, and the receiving side's `payload.type === 'twoTruths'` comparison always failed. **Two Truths and Finish Sentence data never synced to the partner.** Fixed by changing the function signature to accept a single `{ type, data }` object.

### simulateActivityPartner Fix (useAiActions.ts)
2. **Not dead code** — used in TwoTruthsView and FinishSentenceView for auto-simulating partner choice when disconnected. Fixed hardcoded `Math.random() * 3` to use actual option count from `twoTruthsData.statements.length` or `finishSentenceData.options.length`.

### Lazy Loading Assessment
3. Evaluated lazy loading views. All views render inside `<AnimatePresence mode="wait">` — adding React.lazy + Suspense would conflict with animations and add complexity. App code is already 569KB after vendor splitting. **Not worth the tradeoff** for a personal fun app.

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (3.55s)

---

## 2026-03-12 — Fix Session 6: /simplify Code Review

Ran three-agent parallel review (code reuse, quality, efficiency) across all 19 changed files.

### Fixes Applied

1. **Extracted `applyVibeDeltas` utility** (`utils/helpers.ts`) — the 4-line `Math.min(100, ...)` vibe clamping pattern was duplicated 4 times across `useAiActions.ts` (3x) and `useQuestionFlow.ts` (1x). All replaced with single utility call.

2. **`syncFinishedProcessed` reset on disconnect** (`useNetworkSync.ts`) — the guard ref was never reset, so if a guest reconnected after disconnect, `SYNC_FINISHED` would be permanently blocked, leaving them stuck on loading. Now resets in `onDisconnect`.

3. **Soundscape audio node memory leak** (`Soundscape.tsx`) — heartbeat oscillators created every beat were never `disconnect()`ed from the audio graph. Over a long session, hundreds of dead nodes accumulated. Added `osc.onended` handler to disconnect both oscillator and gain nodes.

4. **Avatar retry timeout cleanup** (`usePersonaLogic.ts`) — retry `setTimeout` handles were not tracked, causing stale state updates on unmounted components. Added `retryTimers` ref with cleanup on unmount.

5. **Heartbeat congestion mask** (`p2p.ts`) — when buffer was congested, `lastPongTime` was reset to `Date.now()`, masking genuinely dead connections. Changed to simply skip the ping cycle without resetting the timeout clock.

6. **Removed duplicate `sendFullState` on connect** (`useNetworkSync.ts`) — host was sending full state on both raw connect AND on `SYNC_HELLO`, causing ~24 messages in the first 500ms. Removed the onConnect send since `SYNC_HELLO` always follows.

7. **Moved `missedPongs` field** (`p2p.ts`) — from between methods to with other class fields for consistency.

### Reviewed but Not Changed (False Positives / Not Worth It)
- Timeout button CSS duplication (3 views) — three similar lines is simpler than premature abstraction
- Activity setup boilerplate (2 branches) — abstracting adds indirection for little gain
- `createSyncHandlers` typed as `any` — big refactor, not blocking
- RatingView derivable state — minor extra renders
- Magic strings for activities/status — revisit when scope grows

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (3.37s, 568.78KB app chunk)

---

## 2026-03-12 — Session 7: Hardening Plan (All 6 Phases)

Implemented the full Tonight v2 Hardening & Polish Plan in dependency order.

### Phase 1: Gemini API Proxy (Security)
- Created Vercel serverless API routes (`api/gemini/text.ts`, `api/gemini/image.ts`) proxying all Gemini calls
- Rewrote `services/geminiService.ts`: replaced `GoogleGenAI` SDK with `fetch('/api/gemini/...')` calls via `callProxy` helper
- All 14 exported functions keep identical signatures — zero caller changes
- Removed `define` block from `vite.config.ts` (no more client-side API key)
- Removed `vendor-genai` chunk (SDK no longer in client bundle)
- Client bundle reduced by ~267KB

### Phase 2: Type Safety Hardening
- Added `NetworkSyncState`, `NetworkSyncActions`, `SyncHandlerInput`, `SyncHandlerMap` interfaces to `useNetworkSync.ts`
- Added `ActivityPayload` discriminated union and `ActivityId` type to `types.ts`
- Typed `SYNC_FULL_STATE` payload fully (was `any`)
- `handlersRef` typed as `useRef<SyncHandlerMap>({})`
- Exported `GameState` and `PresenceState` interfaces from Zustand stores

### Phase 3: useSessionState Refactor
- Split 582-line monolith into focused hooks:
  - `hooks/useBroadcastingState.ts` (~220 lines) — all P2P broadcasting wrappers + local UI state
  - `hooks/useSessionLifecycle.ts` (~185 lines) — session persistence, restore, startApp, clearSession
  - `hooks/usePersonaEffects.ts` (~58 lines) — haze CSS, avatar sync, chemistry milestones
- `useSessionState.ts` reduced to ~200-line composition root with no business logic
- Solved circular dep between network sync and lifecycle by lifting `sessionInfo` to composition root

### Phase 4: Testing Foundation
- Installed vitest + jsdom + @testing-library/react
- Added vitest config to `vite.config.ts`
- 4 test files, 35 tests — all pass:
  - `tests/helpers.test.ts` (7) — `applyVibeDeltas` clamping
  - `tests/geminiParsing.test.ts` (10) — `cleanAndParseJSON` robustness
  - `tests/p2p.test.ts` (8) — message buffering, listeners, teardown
  - `tests/syncHandlers.test.ts` (10) — handler behavior for each message type

### Phase 5: UX Improvements
- **5A: PWA Support** — `vite-plugin-pwa` with manifest, workbox caching, app icons, meta tags
- **5B: QR Code** — `qrcode.react` in SetupView step 4, encodes magic link URL
- **5C: sendFullState Batching** — replaced 12+ individual P2P sends with single `SYNC_FULL_STATE` message + `SYNC_FULL_STATE` handler that unpacks

### Phase 6: Polish
- **6A: Image Compression** — confirmed all paths already use `compressImage()`, no changes needed
- **6B: Date History** — `utils/dateHistory.ts` with ring buffer (max 10), saved after `finalizeReport`, "Past Dates" collapsible UI on setup screen

### /simplify Code Review Fixes
- Extracted `DEFAULT_AVATAR` constant to `constants.ts` (was duplicated in 3 hooks)
- Consolidated `api/gemini/analyze.ts` into `api/gemini/text.ts` (were identical)
- Extracted `mergeUsers()` and `mergeDateContext()` helpers in `useNetworkSync.ts` (deduplicated between `SYNC_USER` and `SYNC_FULL_STATE` handlers)
- Extracted `getDominantVibe()` to `utils/helpers.ts` (was computed inline in 3 places)
- Fixed PastDates localStorage read on every render → `useMemo`
- Merged double `setUserPersona` call in guest join path → single call
- Added chemistry no-op guard (skip if unchanged)
- `takeSip` now reuses `setSipLevel` broadcasting wrapper
- Fixed `syncActions` useMemo deps (was using entire store objects → stable empty deps since Zustand setters are stable)
- Typed `SYNC_FULL_STATE` handler payload (was `any`)

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success (2.81s, 590KB app chunk — no GenAI SDK)
- `npm test`: 35/35 pass

---

## 2026-03-13 — Performance Overhaul

### Problem
App was running at ~5 FPS on initial screen. Even hover effects had 5-second lag. Reported on both Vercel deployment and local dev server.

### Root Cause Analysis
Three compounding GPU/CPU killers running on every frame, even before any session started:

1. **Animated blur blobs** — Two `position: fixed` divs (70vw and 80vw) with `filter: blur(80–120px)` animating continuously via `@keyframes float`. On every frame, the GPU had to re-blur massive viewport-sized textures. The worst single offender.

2. **`feTurbulence` SVG noise** — Full-viewport div with an inline SVG `feTurbulence` filter. Unlike a raster image, `feTurbulence` is computed by the CPU on every paint — not cached. This was introduced when replacing the original external `grainy-gradients.vercel.app/noise.svg` fetch (which was at least a pre-rasterized image).

3. **`body` filter transition** — `transition: background-color 1.5s ease, filter 1s ease` on `<body>`. Any `filter` change on the root element forces the GPU to recomposite the entire page. The haze/drunk effect toggled `.haze-active` (which applied `filter: blur() hue-rotate()` to `<body>`) every 15 seconds during decay — causing a full-page GPU recomposite on a timer.

4. **Blocking asset preloader** — App rendered nothing (spinner only) until 6 Unsplash images downloaded. On slow connections this blocked the initial render for several seconds.

5. **External noise SVG** — `grainy-gradients.vercel.app/noise.svg` was a network dependency on every load. Also referenced in `LocationWindow` and `VibeMatrix`.

6. **Dead import map** — `<script type="importmap">` in `index.html` listed 7 esm.sh CDN URLs (React, framer-motion, PeerJS, etc.). Vite handles all imports at build time — the browser was parsing and attempting to resolve these unused entries on every load.

7. **Eager view imports** — All 8 views (HubView, QuestionView, ActivityView, etc.) loaded upfront even though only SetupView is shown initially.

### Fixes Applied

**GPU / Rendering**
- Replaced animated blur blobs with static CSS `radial-gradient()` on `.mesh-bg`. Same ambient color glow, zero per-frame GPU cost. Colors still update dynamically via `--color-blob-1`/`--color-blob-2` CSS variables driven by `useAtmosphere`.
- Replaced `feTurbulence` SVG noise with a tiny repeating 48×48 static PNG (base64 inline). Raster textures are cached by the GPU; SVG filters are not.
- Added `mix-blend-mode: overlay` to noise layer (was lost in the feTurbulence replacement).
- Removed `box-shadow: inset 0 0 100px` from `.cinematic-overlay` — expensive on a full-viewport fixed element. The radial gradient vignette already handles the effect.
- Removed `filter 1s ease` from `body` transition — was causing full-page recomposite on any filter change.
- Moved haze/drunk effect from `document.body.classList` (`.haze-active`) to a dedicated `#haze-overlay` div using `backdrop-filter`. Applying filter to body composites the entire page; a fixed overlay composites only that layer.

**Load Time**
- Removed blocking `useAssetLoader` gate — app now renders immediately. Location images preload in background via `requestIdleCallback` (graceful `setTimeout` fallback with proper cleanup on unmount).
- Removed `<script type="importmap">` from `index.html` — dead code, Vite resolves all imports at build time.
- Lazy-loaded 8 views with `React.lazy()`: `OnboardingView`, `HubView`, `QuestionView`, `RatingView`, `ActivityView`, `TwoTruthsView`, `FinishSentenceView`, `LoadingView`. Only `SetupView` and `SyncWaitScreen` load eagerly. Consolidated to a single `<Suspense>` wrapping the `<AnimatePresence>` (views are mutually exclusive — one boundary is sufficient).

**External Dependencies Eliminated**
- Noise texture extracted to `NOISE_TEXTURE_URI` constant in `constants.ts`. Replaced all 3 references: `index.html`, `LocationWindow.tsx`, `VibeMatrix.tsx`.

**Bundle**
- Replaced unused `recharts` manual chunk with `@google/genai` and `qrcode.react` chunks for better splitting.
- Removed unused `speed` variable and all `--bg-speed` assignments from `useAtmosphere` (was driving blob animation speed — no longer relevant).

### Files Changed
- `index.html` — blob → gradient, noise texture, removed importmap, removed float keyframe, haze-overlay div, body transition
- `hooks/useAssetLoader.ts` → renamed to `hooks/useAssetPreloader.ts` — non-blocking with requestIdleCallback + cleanup
- `hooks/useAtmosphere.ts` — removed speed variable
- `hooks/usePersonaEffects.ts` — haze moved to #haze-overlay
- `App.tsx` — lazy views, single Suspense boundary, removed asset loader gate
- `components/LocationWindow.tsx` — noise from constant, mix-blend-mode restored
- `components/VibeMatrix.tsx` — noise from constant, external URL removed
- `constants.ts` — added `NOISE_TEXTURE_URI`
- `vite.config.ts` — updated manual chunks

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success
- Result: smooth rendering on both Vercel and local production serve (`npx serve dist -s`)
