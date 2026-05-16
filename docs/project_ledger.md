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

---

## 2026-03-18 — Pre-Date Setup UX Fix

### Problem
Profile save button silently did nothing when validation failed (empty name). No error feedback shown to user. Also, "Married" was missing from relationship status options — a gap for couples using Tonight as a date tool.

### Fixes Applied

**Validation Feedback (ProfileEditorView, VenueEditorView)**
- `handleSave()` now shows inline error banner when name is empty ("Name is required")
- Storage functions (`saveProfile`, `saveVenue`) now return `boolean` — callers detect quota failures and show "Storage full" error
- Same pattern applied to both profile and venue editors

**Missing Relationship Status (types/profiles.ts, ProfileEditorView)**
- Added `married` and `in_relationship` to `RelationshipHistory` union type
- Added corresponding UI options in profile editor radio group

### Files Changed
- `types/profiles.ts` — added `married`, `in_relationship` to RelationshipHistory
- `utils/profileStorage.ts` — `saveProfile()` and `saveVenue()` return boolean
- `components/views/ProfileEditorView.tsx` — error state, validation messages, new relationship options
- `components/views/VenueEditorView.tsx` — error state, validation messages

---

## 2026-03-18 — General Polish & Efficiency Pass

Three-agent parallel review of all components, hooks/stores, and services/utils. Focused on real-impact fixes.

### Fixes Applied

**Memory/Cleanup**
1. **useInnerMonologue timer leak** — `setTimeout(() => setMonologue(null), 6000)` was never cleaned up on unmount. Now tracked via ref and cleared in effect cleanup.

**Performance**
2. **Gemini retry backoff cap** — exponential backoff was unbounded (could reach 60s+ after several retries). Capped at 30s max via `MAX_RETRY_DELAY`.
3. **DateHUD sip animation** — was animating `height` (triggers layout recalc). Changed to `scaleY` with `origin-bottom` (GPU-composited transform).
4. **LoadingView animation** — `animate-[width_2s_infinite]` referenced a non-existent keyframe. Replaced with `animate-pulse`.
5. **useLongPress handlers** — returned `handlers` object was recreated every render. Wrapped in `useMemo`.

**Code Deduplication**
6. **INITIAL_PERSONA** — identical object defined in both `store/presenceState.ts` and `hooks/usePersonaLogic.ts`. Exported from store as single source of truth; hook now imports it.
7. **getPromptContext()** — same 3-line helper was inlined in both `useAiActions` and `useQuestionFlow`. Extracted to `services/prompts/promptContext.ts` as shared utility.
8. **CSS variables** — `:root` block with 4 color vars was duplicated in both `index.html` and `index.css`. Removed the `index.css` copy (index.html is the source of truth since it also defines atmosphere vars).

**Accessibility**
9. **ActionDock aria-labels** — all 7 emoji-only buttons now have `aria-label` attributes for screen readers.

**Cleanup**
10. Removed 10-line dead comment block and unused `useSession` import from ActionDock.

### Files Changed (12)
- `hooks/useInnerMonologue.ts` — timer ref + cleanup
- `services/geminiService.ts` — MAX_RETRY_DELAY cap
- `components/DateHUD.tsx` — height → scaleY animation
- `components/views/LoadingView.tsx` — pulse animation
- `hooks/useLongPress.ts` — useMemo for handlers
- `store/presenceState.ts` — export INITIAL_PERSONA
- `hooks/usePersonaLogic.ts` — import from store
- `services/prompts/promptContext.ts` — added getPromptContext()
- `hooks/useAiActions.ts` — use shared getPromptContext
- `hooks/useQuestionFlow.ts` — use shared getPromptContext
- `index.css` — removed duplicate :root vars
- `components/ActionDock.tsx` — aria-labels, dead code removal

### Verification
- `npx tsc --noEmit`: 0 errors (only pre-existing env type defs)

---

## 2026-05-16 — Branch sync, React types, onboarding removal

Local main was 29 commits behind `origin/main` with substantial uncommitted WIP (mode-driven personality system, chemistry engine, session arcs, memory/wrap types). Synced main, isolated WIP onto `feature/personality-modes`, fixed a latent React typing gap, and removed the dead onboarding flow.

### Sync recovery
- Stashed 11 modified-tracked + 11 untracked files. OneDrive held a handle on `config/`, so `git stash -u` saved the entry but left the tracked working tree dirty. Recovered with `git checkout -- .` → `git pull --ff-only` → `git stash pop`. `App.tsx` auto-merged cleanly with no conflict markers.

### React typing (latent bug)
- `@types/react` and `@types/react-dom` were never installed. Functional components and the JSX runtime worked because `@vitejs/plugin-react` handles JSX transformation without types, but class components like `LazyChunkErrorBoundary` had implicit `any` for `this.props`.
- Installed `@types/react@^19` + `@types/react-dom@^19` as devDependencies. 3 `LazyChunkErrorBoundary` `this.props` errors fixed. Surfaced 5 latent WIP errors in `App.tsx`:
  - `a.handleDrinkAction()` — referenced by `useDeviceSensors.onPour` and `handleToastComplete`, no implementation.
  - `a.clearToastRequest()` — referenced after `s.incomingToastRequest`, no implementation.
  - `a.completeOnboarding` — referenced as `OnboardingView.onComplete`, no implementation.
  - `s.clinkActive` — used to render the clink overlay; managed in `useBroadcastingState` but not surfaced through `useSessionState`'s state object.

### WIP isolation
- Created `feature/personality-modes` carrying the mode-driven personality system: `ModeSelectView`, `PERSONALITY_CONFIGS`, `SESSION_ARCS`, `modeThemes`, `modeSounds`, `personaStyles`, `chemistryEngine`, `questionSelector`, and new types (`personality`, `chemistry`, `memory`, `sessionArc`, `questions`, `wrap`).
- Checkpoint commit `8908bf9` (29 files, +1315/-80). Main returned to clean at `f64513d`.

### Session actions added (`hooks/useSessionState.ts`)
- `handleDrinkAction(): boolean` — sets `clinkActive` true for 1s, increments sip via `setSipLevel`, broadcasts `TRIGGER_CLINK`, vibrates `[100, 30, 100]`. Returns `isSynced` so the device-sensor "pour" gesture only flashes "Sip Detected" when actually connected.
- `clearToastRequest()` — flips `incomingToastRequest` off after the host accepts a toast invite.
- Exposed `clinkActive` on the `state` object (it already lived in `useBroadcastingState`, just unsurfaced).

### Onboarding flow removed
- `OnboardingView` was a 3-step age/height/style form that was never reachable: `startApp` routes `setup → hub` directly and nothing ever set `view === 'onboarding'`.
- The "style" free-text field was superseded by mode-selection via `PERSONALITY_CONFIGS`.
- Removed: lazy import + render block in `App.tsx`, `'onboarding'` literal from `AppView` in `types.ts`, `completeOnboarding` action stub in `useSessionState.ts`, and the `components/views/OnboardingView.tsx` file itself.

### Files Changed (feature branch)
**Modified**
- `App.tsx` — `handleModeSelect`, onboarding render-block + lazy-import removed
- `components/IntelligenceBriefing.tsx`, `constants.ts`, `services/geminiService.ts`
- `services/prompts/{gamePrompts, narrativePrompts, promptContext}.ts`
- `hooks/useBroadcastingState.ts`
- `hooks/useSessionState.ts` — new actions, `clinkActive` exposed
- `store/{gameState, presenceState}.ts`
- `package.json`, `package-lock.json` — `@types/react@^19`, `@types/react-dom@^19`
- `types.ts` — `AppView` dropped `'onboarding'`

**Added (mode system, WIP infra)**
- `components/views/ModeSelectView.tsx`
- `config/{modeSounds, modeThemes, personaStyles, personalityConfigs, sessionArcs}.ts`
- `services/{chemistryEngine, questionSelector}.ts`
- `services/prompts/personalityPrompt.ts`
- `types/{chemistry, memory, personality, questions, sessionArc, wrap}.ts`

**Deleted**
- `components/views/OnboardingView.tsx`

### Verification
- `npx tsc --noEmit`: 0 errors
- `npm test`: 35/35 passing
- `npm run dev`: not yet verified in browser

### Open items
- `npm audit` reports 21 vulnerabilities (1 critical) — not yet investigated.
- New `modeSelect → setup → hub` flow not yet exercised end-to-end in a real session.
- Mode-driven personality + chemistry engine + question selector ship as WIP infrastructure — not yet wired into `useAiActions` / `useQuestionFlow`.

---

## 2026-05-16 — Audit fix + personality threaded into AI prompts

Follow-up to the morning session: cleared most of the npm audit findings, then took the smallest high-leverage slice of the personality-modes integration — threading the active mode's personality overlay into every relevant Gemini call.

### `npm audit fix` (non-breaking)
- Ran `npm audit fix` without `--force`. Lockfile-only change (`package-lock.json` —437/+495 lines). No `package.json` changes.
- Cleared 12 of 21 vulnerabilities including the critical `protobufjs <= 7.5.5`. Bumped transitives: `vite`, `rollup`, `picomatch`, `serialize-javascript`, `workbox-build`, `lodash`, `@babel/plugin-transform-modules-systemjs`, `@rollup/plugin-terser`.
- Remaining 9 high-severity vulns are all `@vercel/node` transitives (`undici`, `minimatch`, `path-to-regexp`, `@vercel/build-utils`, `@vercel/python-analysis`). They require `@vercel/node 2.x → 3.0.1` semver-major bump; `api/turn-credentials.ts` and `api/gemini/*.ts` use `@vercel/node` types so the surface may have shifted. Deferred until a dedicated session that can verify the deploy.
- Verification: `npx tsc --noEmit` clean, `npm test` 35/35, `npm run build` succeeds (5.5s).

### Personality threading
- The personality-modes scaffold (committed earlier today at `8908bf9`) wrote `personalityConfig` to the game store on mode selection but no AI call consumed it — so mode selection was a no-op in the user-facing experience. This change makes the mode actually shape AI output.
- Added `getSystemInstruction()` to `services/prompts/personalityPrompt.ts`: reads `useGameStore.getState().personalityConfig`. Returns `SYSTEM_INSTRUCTION` alone when no mode is active (preserves prior behavior for sessions without mode select); returns `SYSTEM_INSTRUCTION + "\n\n--- MODE OVERLAY (mode) ---\n" + buildPersonalitySystemInstruction(config)` when a mode is set. The brand voice anchors first, the mode overlay's tighter constraints (word limits, vulnerability ceiling, archetype) anchor second.
- Replaced 5 occurrences of `systemInstruction: SYSTEM_INSTRUCTION` in `services/geminiService.ts` (`generateIntelligenceReport`, `generateTwoTruthsOneLie`, `generateFinishSentence`, `generateScene`, `generateNarrativeSuggestion`).
- Added `systemInstruction: getSystemInstruction()` to `generateDynamicQuestions` (which previously had no system instruction at all — critical since it's the primary question generator).
- Removed the now-unused `SYSTEM_INSTRUCTION` direct import from `geminiService.ts` (still re-imported by `personalityPrompt.ts`).

### What this means in practice
- Picking `date_night` mode in `ModeSelectView` → store gets `PERSONALITY_CONFIGS.date_night` (archetype: instigator, max question words: 30, vulnerability ceiling: 80%, etc.) → every subsequent AI call inherits those constraints. Picking no mode → baseline behavior unchanged.
- Old `vibe`/`chemistry` system continues to drive the inline prompt-side guidance; mode overlay layers on top via the system instruction.

### Files Changed
- `services/prompts/personalityPrompt.ts` — added `getSystemInstruction()` resolver
- `services/geminiService.ts` — 5 replacements + 1 addition; dropped direct `SYSTEM_INSTRUCTION` import
- `package-lock.json` — audit fix transitive bumps

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35 passing
- `npm run build`: succeeds (6.0s, 1010 KiB PWA precache)
- Browser test: not run this session

### Open items
- `@vercel/node 3.0.1` major bump still pending (covers remaining 9 high-severity vulns).
- New flow still not exercised end-to-end in a real session.
- Chemistry engine, question selector, session arc phase advancement, and wrap_type rendering remain unwired — these are still scaffolding waiting on either a real `BankQuestion[]` bank or a deliberate decision to integrate without one.

---

## 2026-05-16 — Reconcile question prompt with mode word limits + dev smoke

Follow-up: the system-instruction overlay was telling the model "Max N words per question" via the personality config, but the inline prompt in `generateDynamicQuestions` still hardcoded `Each question MUST be 6-14 words`. Inline guidance tends to win over earlier system instructions, so the mode overlay was being diluted. This makes the inline rules pull the same direction as the overlay.

### Change
- `services/geminiService.ts` — `generateDynamicQuestions` now reads `personalityConfig` from the game store and derives `maxQuestionWords` and `maxOptionWords`. The inline prompt's hardcoded "6-14 words" and "2-6 words" are now `at most ${maxQuestionWords}` and `at most ${maxOptionWords}`. Falls back to the legacy 14/6 defaults when no mode is active — preserves prior behavior for sessions that skip mode selection.
- New direct import of `useGameStore` in `geminiService.ts` (matches the `getPromptContext`/`getSystemInstruction` pattern of services reading from store at call time).
- Scene generator (`buildScenePrompt`) not touched — its hardcoded "max 6 words" choice text is universally short across modes and the system overlay already steers tone there.

### Dev smoke
- `npm run dev` boots Vite in 680ms with no errors.
- HMR routes for `App.tsx`, `ModeSelectView.tsx`, `services/geminiService.ts`, `services/prompts/personalityPrompt.ts`, `store/gameState.ts` all transform and serve cleanly.
- Full browser-side interaction not verified (no partner session) — boot-level confirmation only.

### Files Changed
- `services/geminiService.ts` — store import + length-rule reconciliation

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35 passing
- `npm run build`: succeeds
- `npm run dev`: boots clean

### Open items unchanged
- `@vercel/node 3.0.1` major bump still pending.
- Follow-up probability conflict not yet fixed — inline prompt always asks for Q1 as a follow-up, but `vibe_check` has `follow_up_probability: 0`. Bigger restructure to address.
- `BankQuestion[]` bank still empty; `selectNextQuestion` still uncalled.

---

## 2026-05-16 — Mode reaches every surface + chemistry computes on answers

Push session: closed every gap between mode selection and the user-facing experience. Mode now shapes Q1 vs. opener choice, escalation ceiling, scene choice length, every relevant Gemini call's system instruction, and a 6-dim ChemistryProfile that updates on every answer.

### Q1 follow-up gating
- `generateDynamicQuestions` previously forced Q1 to be a follow-up whenever `conversationLog.length > 0`. That conflicted with `vibe_check` (`follow_up_probability: 0`) and `first_date` (0.3) — modes where follow-ups should be rare or absent.
- Gate added: Q1 is a follow-up only when `conversationLog.length > 0 && followUpProbability >= 0.2`. Otherwise it's a fresh opener with an explicit "Do NOT reference prior answers" rule.

### Vulnerability ceiling cap on escalation
- The chemistry-based escalation block (`< 25 indirect`, `25-50 gentle`, `50-75 personal`, `>= 75 gloves off`) used raw `chemistry` so a 100%-chemistry `first_date` session would still hit the "gloves off, ask what nobody else would dare" branch — a clear vulnerability_ceiling violation.
- Added `effectiveIntensity = min(chemistry, ceilingPct)`. Escalation now reads `effectiveIntensity`. An explicit "Mode vulnerability ceiling: N% — NEVER escalate beyond this" line is injected when ceiling < 100. Now `first_date` (ceiling 45%) stops at the "Building chemistry" branch even at 100% raw chemistry; `vibe_check` (ceiling 15%) stays at "Low intensity" always.

### Mode-aware scene choice text
- `buildScenePrompt` gained an optional `maxChoiceWords` parameter (defaults to 6, preserving prior behavior). `generateScene` reads `personalityConfig?.max_option_words` from the store and threads it through. `vibe_check` (max 3) gets tighter choices; `ldr` (max 10) gets richer ones.
- Builder stays pure — caller does the store read. Different from the `getSystemInstruction()` pattern but appropriate when the builder is a reusable test target.

### Chemistry profile updates on every answer
- New `applyCategoryToChemistry(current, category, optionsMatched)` in `services/chemistryEngine.ts`. Heuristic 6-dim deltas keyed by the existing 6 categories (Style/Escape/Preferences/Deep/Intimate/Desire) until a real `BankQuestion[]` bank exists. Each category nudges the dimensions its content actually shapes (e.g., `Desire` → spark+8 / depth+3 / growth+3; `Deep` → depth+8 / trust+5 / growth+3). All values clamped 0-100.
- Wired into `useQuestionFlow.handleAnswerSelect`. After the legacy vibe delta, the new chemistry profile is updated via `useGameStore.getState().setChemistry(...)`. Both host and guest run this independently against the same Q+A so they converge without P2P sync.

### Mode personality reaches every relevant Gemini call
- Added `systemInstruction: getSystemInstruction()` to 6 more Gemini calls that previously had no system instruction at all: `generateSilentReaction`, `generatePartnerInsight`, `generateLocationTransition`, `generatePlaylistSongs`, `generateEndOfNightLetter`, `generateFollowUpText`. Mode tone/archetype now color silent reactions, post-round insights, location transitions, the shared playlist, the end-of-night letter, and the follow-up text suggestion.
- Skipped intentionally: `generateInnerMonologue` (runs every few seconds with 50-token output — the 500-token system instruction overhead per call doesn't pay off), and the image-analysis calls (`analyzeImageAction`, `analyzeUserPhotoForAvatar`, `extractTraitFromInteraction` — these are analysis, not generation, so mode tone doesn't apply).

### Files Changed
- `services/geminiService.ts` — Q1 gating, vulnerability ceiling cap, scene maxChoiceWords plumbing, 6 systemInstruction additions
- `services/prompts/gamePrompts.ts` — `buildScenePrompt` now accepts `maxChoiceWords`
- `services/chemistryEngine.ts` — `applyCategoryToChemistry` heuristic deltas
- `hooks/useQuestionFlow.ts` — chemistry update wired into `handleAnswerSelect`

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35 passing
- `npm run build`: succeeds (6s, 1011 KiB PWA precache)

### Open items
- `@vercel/node 3.0.1` bump still pending.
- `chemistry` (the new ChemistryProfile) is computed but invisible to user and unread by AI prompts. Next push: surface it (UI debug HUD or feed back into question prompt as additional signal alongside legacy `partnerPersona.chemistry`).
- `computeMetaMetrics` (trajectory/surprise/balance/unlock_rate) still uncalled — needs a `chemistryHistory: number[]` field in gameState to feed `computeTrajectory`.
- `BankQuestion[]` bank still empty.

---

## 2026-05-16 — Port from Tonight Commercial: question bank + vibe check end-to-end

The user pointed at a sibling repo at `~/Documents/Personal/Enterprise/Tonight Commercial` containing a 200-question curated bank and a complete bank-driven Vibe Check flow. Ported the high-value pieces; deferred QR room flow + `structured_date` mode + alternate post-report phases.

### What got ported

**Data layer**
- `data/questionBank.json` — 200 curated `BankQuestion`s. Distribution: vibe_check (44), first_date (48), date_night (69), ldr (41), reignite (41). 16 tag types (attraction, commitment, conflict, dreams, future, growth, humor, intimacy, lifestyle, past, playful, rediscovery, sensory, sync, values, vulnerability). Depths 0-5. JSON imports work via Vite default + tsconfig `moduleResolution: bundler`.
- `data/loadQuestionBank.ts` — exposes `QUESTION_BANK` and `getQuestionsForMode(mode)`.

**Hooks**
- `hooks/useChemistry.ts` (71 lines) — wraps `applyAnswerToChemistry`/`compoundChemistryScore`/`computeMetaMetrics`. Takes a `broadcastChemistryUpdate` callback so any caller controls P2P sync (Vibe Check uses it).
- `hooks/useSessionArc.ts` (125 lines) — `checkPhaseTransition(questionCount, elapsedMs)` advances based on `time` / `depth` / `chemistry` triggers. Returns the current phase config + index.
- `hooks/useVibeCheckFlow.ts` (425 lines) — full bank-driven game loop: 5-minute timer, ~17s per question, scored question selection, chemistry update on dual-answer, highlight moment tracking (biggest chemistry delta), match counter (both picked same option), auto-transition to wrap view at 0:00. Host selects + broadcasts each question; guest looks up by ID from the bank.

**Views**
- `components/views/VibeCheckGameView.tsx` (196 lines) — timer countdown, chemistry bar, tap-able answer options, "waiting for partner" state.
- `components/views/VibeCheckFlashView.tsx` (290 lines) — end-of-session wrap with verdict phrases by compound score (`Dangerously Compatible` → `The Night Is Young`), highlight moment, stats.

**Type surface**
- `types.ts` — `AppView` gained `'vibeCheckGame'` and `'vibeCheckFlash'`.
- `types.ts` — `NetworkMessage` gained `SYNC_CHEMISTRY_UPDATE`, `SYNC_ARC_PHASE_CHANGE`, `SYNC_VIBE_CHECK_ANSWER`.

**App integration**
- `App.tsx` — lazy imports for the two new views; `useVibeCheckFlow` called at top-level (returns `vcState`, `vcActions`); two new view routes after the playlist branch; auto-start effect: when `isSynced && sessionMode === 'vibe_check'` and we're not already in a vibe-check view, route to `vibeCheckGame` and call `vcActions.startGame()`.
- `ModeSelectView.tsx` — `vibe_check.available` flipped to `true`. The card no longer renders the "Soon" pill.

### What was deferred
- **`qrEntry` view + QR-based room sharing** — Commercial's `vibe_check` does `modeSelect → qrEntry (host shows QR, guest scans) → vibeCheckGame` to deliver on the "no signup needed" pitch. This port uses the regular `setup → hub` bridge instead: host picks mode → setup form → P2P sync → auto-route to game. Less seamless than QR but works without porting the QR rendering / room-id deep-linking surface.
- **`structured_date` mode** — Commercial has a 6th mode (`structured_date`, `guide` archetype, `structured_summary` wrap). No bank questions assigned to it yet even in Commercial, so the value is low. Skipped.
- **Alternate post-report phases** — Commercial has `'recap' | 'therapist' | 'vault'` in addition to our `'briefing' | 'letter' | 'text'`. Untouched.

### Files Changed (10)
- New: `data/questionBank.json`, `data/loadQuestionBank.ts`, `hooks/useChemistry.ts`, `hooks/useSessionArc.ts`, `hooks/useVibeCheckFlow.ts`, `components/views/VibeCheckGameView.tsx`, `components/views/VibeCheckFlashView.tsx`
- Modified: `App.tsx`, `types.ts`, `components/views/ModeSelectView.tsx`

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35 passing
- `npm run build`: succeeds (5.0s, PWA precache 1103 KiB / 26 entries — bank adds ~90 KiB)
- `npm run dev`: boots in 657ms, all new modules transform cleanly via HMR

### Open items unchanged + new
- Vibe Check uses the existing `setup` flow as a bridge. If we want the no-signup QR experience, port `QrEntryView` + room-deep-link query parsing in a follow-up.
- The new flow needs a real two-device session to validate end-to-end (single browser tab can verify the views render, but not P2P sync behavior).
- `useNetworkSync.ts` doesn't have handlers for the 3 new message types — `useVibeCheckFlow` listens directly via `p2p.onData()` and the inbound types fall through useNetworkSync's switch. Works today; could be tidied later if useNetworkSync grows exhaustive checking.

---

## 2026-05-16 — QR Entry flow for Vibe Check ("no signup needed" delivered)

Follow-up port from Tonight Commercial: the `qrEntry` view + room deep-link parsing. The Vibe Check card on `ModeSelectView` says "Quick-fire chemistry test. No signup needed." — previously a lie because vibe_check still routed through `setup → sync`. Now it's literally true.

### Flow

- **Host** picks `Vibe Check` on `ModeSelectView` → `handleModeSelect` immediately calls `startApp` with placeholder host/guest data (name 'Host', empty fields) and a fresh `vc-<6char>` room id, then overrides view to `qrEntry`. The host sees a QR code that encodes `<origin><path>?room=<id>&mode=vibe_check`.
- **Guest** scans the QR. Their URL has the room + mode params. The new `isQRGuest` state detects this on mount and the new `useEffect` sets `sessionMode='vibe_check'`, applies the theme, and routes to `qrEntry`. The guest sees a single name input (no account, no profile fields).
- Guest submits the name → `QREntryView.onGuestJoin(name)` calls `a.startApp(null, {name,...}, null, null, vibeCheckRoomId, false)` and P2P connects.
- Both synced → the existing `vibeCheckStartedRef` effect fires → view becomes `vibeCheckGame` → `vcActions.startGame()`. 200-question bank, 5-minute timer, chemistry tracking, wrap on time-up.

### Changes
- New: `components/views/QREntryView.tsx` (169 lines, uses `qrcode.react` which was already a dep).
- `types.ts` — `AppView` gained `'qrEntry'`.
- `App.tsx`:
  - Lazy import for `QREntryView`.
  - `vibeCheckRoomId` state (URL or random).
  - `isQRGuest` state (URL params).
  - Guest auto-setup `useEffect` (one-shot on mount).
  - `handleModeSelect` — for `vibe_check`, runs `startApp` immediately and overrides view to `qrEntry` (other modes still route to `setup`).
  - `qrEntry` view route added before `setup`.
  - `SyncWaitScreen` condition adds `view !== 'qrEntry'` so the QR shows instead of a sync spinner pre-connection.

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35
- `npm run build`: succeeds (PWA precache 1108 KiB / 27 entries)
- End-to-end QR scan still requires two devices to verify.

### What's still deferred
- `PhaseIndicator.tsx` — visualizes arc phase progression. Self-contained, but its display names only cover `structured_date`'s phases; other modes use different names. Limited UX value without extending its phase-name map.
- `RecapCard.tsx`, `TherapistSummary.tsx`, `VaultPrompt.tsx` — post-report-phase extensions in Commercial. Blocked: they import `@firetold/studio` which is a Commercial-only workspace package. Porting requires rewriting their export/share surface to drop that dep.
- `structured_date` mode — still no bank questions for it.
- `@vercel/node` major bump: **closed as not actionable.** We're already on the latest `@vercel/node@5.8.2`. The remaining 9 audit findings (undici, minimatch, path-to-regexp, etc.) want `fixAvailable: { version: '3.0.1', isSemVerMajor: true }` — but 3.0.1 is *older* than what we have; `npm audit fix --force` would downgrade us, not patch us. These are unfixed vulnerabilities in 5.x's transitive deps awaiting upstream patches. No action needed from this repo.

---

## 2026-05-16 — Revert Vibe Check, port real Date Night improvements from Enterprise

Course correction. Vibe Check is the commercial product's signature 5-min flow; this is the personal Date Night app, where Vibe Check doesn't belong. Reverted the Vibe-Check-specific UI/flow and kept the general-purpose pieces that benefit Date Night.

### Revert (commit `52a5b6b`)
- Deleted `VibeCheckGameView.tsx`, `VibeCheckFlashView.tsx`, `QREntryView.tsx`, `useVibeCheckFlow.ts`.
- Removed Vibe Check card from `ModeSelectView`.
- Removed App.tsx hook call, room id state, QR-guest auto-setup effect, auto-start effect, `handleModeSelect` vibe_check branch, view routes for `vibeCheckGame`/`vibeCheckFlash`/`qrEntry`.
- `AppView` dropped `vibeCheckGame`, `vibeCheckFlash`, `qrEntry`.
- `NetworkMessage` dropped `SYNC_VIBE_CHECK_ANSWER`.
- Kept (general-purpose, benefits Date Night): the 200-question bank in `data/`, `useChemistry`, `useSessionArc`, the chemistry engine improvements, `SYNC_CHEMISTRY_UPDATE`, `SYNC_ARC_PHASE_CHANGE`.

### Real Date Night improvements

**1. Style anchors from the bank**
Curated bank questions matching the user's category are now injected into the AI question prompt as voice exemplars. Maps the 6 UI categories (Style/Escape/Preferences/Deep/Intimate/Desire) to BankQuestion tag clusters, pulls 3 random matching questions for the active mode, and prepends them with: *"STYLE ANCHORS (hand-written questions for this mode + category — match this voice, brevity, and provocation. Do NOT copy these; generate new questions in the same register)"*. This is a new pattern not in Commercial — Commercial uses the bank only in their Vibe Check flow. The personal app gets curated voice quality across every Date Night question generation.

**2. Mode-aware intelligence report framing**
Ported from Commercial. `buildIntelligenceReportPrompt` now takes a `mode` parameter and switches the report's framing/publication name:
- `reignite` → *"Reconnaissance Report"* (rediscovery dossier; tone: challenging, surprising, tender; publication: "The Rediscovery Files")
- `ldr` → *"Distance Dispatch"* (love letter disguised as report; tone: intimate, longing, hopeful; publication: "The Long-Distance Dossier")
- everything else (including `date_night`) → current *"Post-Date Intelligence Report"* — unchanged
- `generateIntelligenceReport` reads `personalityConfig.mode` from the store and passes it through (matches the napkin rule of services reading mode from store at call time).

**3. `handlePass` action + Pass button**
Ported from Commercial's `useQuestionFlow`. Softer than `handleRefuse`: no sip penalty, no "refused/respecting the boundary" framing. Logs `[Passed]`, flashes *"Passed on this one."*, moves on. Wired into `QuestionView` as a subtle outline button above the existing `Refuse & Sip 🥃`. Two-tier opt-out: "just not this one" vs. "I'm dodging this and will sip on it."

### Diffs reviewed but deferred
- `useBroadcastingState` adds `broadcastModeSelect` / `broadcastChemistryUpdate` / `broadcastArcPhaseChange` and the `useNetworkSync` companion handlers. Skipped — none of these have a consumer in the Date Night flow today (chemistry computes identically on both sides via the same Q+A, no arc-phase-advance code, mode is host-only state).
- `profileStore.therapistLink` — Commercial-only (TherapistSummary feature blocked on `@firetold/studio`).
- `useSessionLifecycle` — ours is actually ahead of Commercial (preserves uploaded avatars, comments on the avatar pipeline).

### Files Changed
- Removed: `components/views/{VibeCheckGameView,VibeCheckFlashView,QREntryView}.tsx`, `hooks/useVibeCheckFlow.ts`
- Modified: `App.tsx`, `types.ts`, `components/views/ModeSelectView.tsx`, `components/views/QuestionView.tsx`, `services/geminiService.ts`, `services/prompts/gamePrompts.ts`, `hooks/useQuestionFlow.ts`

### Verification
- `npx tsc --noEmit`: clean
- `npm test`: 35/35 passing
- `npm run build`: succeeds (24 precache entries, ~1011 KiB — back to pre-Vibe-Check size)

---

## 2026-05-16 — Date Night polish push: resilience, gating, history depth, UI surfacing

After the Enterprise port + revert, pushed through another four sub-slices that round out Date Night.

### Resilience
- `pickBankFallback(category, mode, count)` in `services/geminiService.ts` returns tap-with-options bank questions matching the user's category + active mode, formatted as `Question[]`. Wired into `generateDynamicQuestions` for both empty-response and exception paths. The user never hits an empty question list mid-date — the 200-question bank is the safety net.

### Mode gating
- `handleActivitySelect` in `hooks/useAiActions.ts` now checks `personalityConfig.activities_allowed`. date_night allows all (twoTruths/finishSentence/playlist) so no behavior change; first_date allows only twoTruths; reignite allows only finishSentence; ldr allows finishSentence + playlist. Refuses with a flash if blocked. Legacy sessions (no config) keep allowing all.

### History depth
- `DateHistoryEntry` gained optional `chemistryProfile?: ChemistryProfile` and `mode?: string`. `buildHistoryEntry` accepts both; the `useAiActions` caller reads from the game store and passes them through. Future Date Nights with returning partners now see the full 6-dim trajectory across sessions, not just a single chemistry %.
- `extractHighlights` filter extended to drop `[Passed]` answers alongside the existing refusal filter — neither carries a real answer worth highlighting.
- `renderDateHistoryBlock` in `services/prompts/promptContext.ts` now includes the mode tag and (when available) a "top dimension X (N/100), trajectory ascending|plateauing|oscillating|declining" line per past date. AI generations for a returning partner inherit longitudinal signal.

### UI surfacing
- `PresenceBar`: small uppercase tracking-widest mode label ("Date Night", "First Date", "Long Distance", "Reignite") under the "Tonight" header. Subtle (text-white/25). Defers to the existing "Partner is choosing..." overlay when relevant.
- `IntelligenceBriefing`: a centered "Mode · Trajectory: Rising/Steady/Volatile/Cooling" line in the case-number header, between the CASE line and the headline. Reads `sessionMode` and `chemistry.trajectory` from the store. Shows up only when either field is set.

### Files Changed
- Modified: `services/geminiService.ts`, `hooks/useAiActions.ts`, `utils/dateHistory.ts`, `services/prompts/promptContext.ts`, `components/PresenceBar.tsx`, `components/IntelligenceBriefing.tsx`

### Verification (after each sub-slice)
- `npx tsc --noEmit`: clean
- `npm test`: 35/35
- `npm run build`: green

### What I'd flag as the genuine completion line
Every Enterprise improvement I could identify that benefits Date Night and isn't blocked on `@firetold/studio` has been ported. Anything beyond this point is new feature work (e.g., wiring `useSessionArc` phase advancement, building a chemistry HUD), not Enterprise-derivative. The branch `feature/personality-modes` is ready to merge to `main` when you're ready.

---

## 2026-05-16 — Land: merge, deploy, branch cleanup

Closing the session.

### Merge + push
- `feature/personality-modes` fast-forward merged into `main`. 16 commits, 42 files changed, +3062 / -757 lines. Net new top-level directories: `data/` (question bank), `config/` (mode configs); expanded `types/` subdirectory.
- Final commit on the branch: `f099f1e` (docs: bring CLAUDE.md current with modes/personality system + napkin rule).
- `git push origin main` triggered a Vercel production deploy.

### Vercel deploy verified
- Vercel project: `tonight-v2` (`prj_DnZEodDJGC59V2ZaCyIqiuA5gYRz`).
- Production deployment: `dpl_9SVJWmN2EXF91XcJtRTYJZYTj29o`, state `READY`, target `production`, commit `f099f1e`.
- Production URL (branch alias): `https://tonight-v2-git-main-haris-projects-2de2fa69.vercel.app`.
- Inspector: `https://vercel.com/haris-projects-2de2fa69/tonight-v2/9SVJWmN2EXF91XcJtRTYJZYTj29o`.
- Every preview deploy from the feature branch also went `READY` — no build regressions from the bank-as-JSON-import, new lazy-loaded views, or any of the new types/config layer.
- Used the `claude.ai_Vercel` MCP toolset to verify (the Vercel CLI isn't installed locally).

### Cleanup
- `feature/personality-modes` deleted locally (`git branch -d`) and on origin (`git push origin --delete`). Branch was fully merged so the safe `-d` flag was used.
- Two old `claude/*` branches remain on origin from earlier sessions — untouched, can be cleaned up in a future session if desired.

### End-of-session repo state
- `main` clean, in sync with `origin/main` at `f099f1e`.
- Tests: 35/35 green at merge time.
- Build: 24 PWA precache entries, ~1100 KiB.
- Production deploy live and verified.

### Untested
- Real two-device session of the merged Date Night flow. All preview/prod builds succeeded but no human has played a session on the new code yet. Watch for: AI fallback behavior (bank kicks in if `generateDynamicQuestions` fails), mode label visibility in PresenceBar, mode/trajectory line in IntelligenceBriefing, Pass button behavior, activity gating in first_date / ldr / reignite modes.
