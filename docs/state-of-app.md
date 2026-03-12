# State of the App

Last updated: 2026-03-12

## What Tonight Is

A two-player real-time date experience. You open it on your phone at a bar, your date scans a QR code, and the app guides you through AI-generated questions, activities, and conversation prompts — building a shared vibe that evolves throughout the night. At the end, it generates a noir-themed "Intelligence Briefing" summarizing the date.

## Architecture Overview

```
index.html → index.tsx → App.tsx
                           ├── SessionProvider (context/SessionContext.tsx)
                           │     ├── useSessionState (composition root)
                           │     │     ├── useBroadcastingState (P2P-wrapped setters)
                           │     │     ├── usePersonaLogic (avatar generation)
                           │     │     ├── useNetworkSync (P2P listeners + handlers)
                           │     │     ├── useSessionLifecycle (persist/restore/start)
                           │     │     └── usePersonaEffects (chemistry, haze, avatar sync)
                           │     ├── useQuestionFlow (Q&A generation + flow)
                           │     └── useAiActions (activities, scenes, report)
                           └── View components (10 views)
```

All components consume state via `useSession()` from context. No prop drilling.

## Layers

### Stores (Zustand)

Three stores hold raw state. Setters support function-based updaters.

| Store | State | Purpose |
|-------|-------|---------|
| **gameState** | round, vibe, currentScene, sceneChoices, activeQuestion, questionOwnerId, dateContext, conversationLog, sipLevel, myRating, partnerRating | Game progression |
| **presenceState** | users, userPersona, partnerPersona, guestProfileConfirmed, arrivalEvent | Identity & personas |
| **aiState** | selectedCategory, availableQuestions, askedQuestionIds, twoTruthsData, finishSentenceData, activityChoices, intelligenceReport | AI generation state |

### Hooks

| Hook | Lines | Role |
|------|-------|------|
| **useSessionState** | 201 | Composition root. Owns `sessionInfo` state, wires all sub-hooks together, returns unified `{ state, actions }` |
| **useBroadcastingState** | 217 | Wraps every Zustand setter with `p2p.send()`. Has a `broadcast` flag so incoming P2P messages don't re-broadcast. Returns `rawSetters` for network sync to use without broadcasting |
| **useNetworkSync** | 433 | Sets up P2P listeners, dispatches incoming messages to typed handlers via `createSyncHandlers()`. Manages connection/sync status. Sends batched `SYNC_FULL_STATE` on connect |
| **usePersonaLogic** | 114 | Avatar generation via Gemini image API, photo analysis, visual modifiers. Retry with backoff on failure |
| **usePersonaEffects** | 58 | Side-effect only. Syncs `persona.imageUrl` → `users[].avatar`, computes chemistry from vibe, triggers milestone flashes, applies drunk haze CSS |
| **useSessionLifecycle** | 185 | Saves/restores sessions from localStorage (5-min window). `startApp()` initializes host or guest, creates users, generates location image |
| **useQuestionFlow** | 275 | Generates personalized questions via Gemini, manages category selection, handles partner bot responses when offline, extracts traits from answers |
| **useAiActions** | 276 | Orchestrates activities (Two Truths, Finish Sentence, scene-based). Handles `finalizeReport()` which generates the Intelligence Briefing and saves date history |
| **useAtmosphere** | 132 | Updates CSS variables (blob colors, animation speeds, background) based on location + vibe. Pure visual theming |
| **useAssetLoader** | 39 | Preloads location images + default avatar. App shows spinner until done |
| **useInnerMonologue** | 21 | Random AI-generated thoughts every ~45s (40% chance). Adds flavor text |
| **useDeviceSensors** | 39 | Detects phone tilt (>55° = "pour" gesture → sip), visibility change (tab away = "glance back") |
| **useLongPress** | 55 | Timer-based long-press detection with haptic feedback |

### Services

**geminiService.ts** — All AI calls proxy through Vercel serverless routes (`/api/gemini/text`, `/api/gemini/image`). The `@google/genai` SDK runs server-side only. Client uses `callProxy()` (fetch wrapper) with `callWithRetry()` (exponential backoff for 429s).

14 exported functions: `generateScene`, `generateIntelligenceReport`, `generateDynamicQuestions`, `extractTraitFromInteraction`, `generateTwoTruthsOneLie`, `generateFinishSentence`, `generateInnerMonologue`, `generateSilentReaction`, `analyzeImageAction`, `generateAbstractAvatar`, `analyzeUserPhotoForAvatar`, `generateLocationImage`, `cleanAndParseJSON`, `callWithRetry`.

**p2p.ts** — PeerJS WebRTC wrapper. Host uses deterministic peer ID (`tonight-v2-{room}-host`), guest connects by known ID. Features: message buffering pre-open, heartbeat (PING/PONG, 30s timeout, 3 missed tolerance), zombie connection guard, auto-retry (10 signaling, 15 connection attempts), `onData`/`onConnect`/`onDisconnect`/`onStatus` listener pattern.

**services/prompts/gamePrompts.ts** — Prompt builder functions for all AI calls. Keeps prompt engineering separate from API plumbing.

### Components

**Views** (10, in `components/views/`):
SetupView, OnboardingView, HubView, QuestionView, ActivityView, TwoTruthsView, FinishSentenceView, RatingView, LoadingView, SyncWaitScreen

**Feature** (24, in `components/`):
ActionDock, ArrivalOverlay, AvatarEditor, CameraModal, ChoiceButton, ConfirmationModal, ConnectionStatusOverlay, DateHUD, FlashMessage, GifPicker, GuestProfileOverlay, HeatmapOverlay (TouchLayer), InnerMonologue, IntelligenceBriefing, LocationWindow, PastDates, PersonaReveal, PresenceBar, ReactionOverlay, ReactionPicker, SharedDraft, Soundscape, ToastOverlay, VibeMatrix

**Primitives** (2, in `components/ui/`):
GlassCard, TextRenderer

### API Routes (Vercel serverless)

| Route | Purpose |
|-------|---------|
| `api/gemini/text.ts` | Proxies text generation + multimodal analysis to Gemini |
| `api/gemini/image.ts` | Proxies image generation, extracts base64 from response |

Both read `GEMINI_API_KEY` from `process.env` (Vercel environment).

## Data Flow

### P2P Sync Pattern

```
User action
  → broadcasting wrapper (useBroadcastingState)
    → Zustand setter (local state update)
    → p2p.send({ type: 'SYNC_*', payload }) (if broadcast=true)

Incoming P2P message
  → p2p.onData handler (useNetworkSync)
    → createSyncHandlers dispatch
      → raw Zustand setter (via rawSetters — no re-broadcast)
```

### Connection Handshake

```
Guest connects → sends SYNC_HELLO { id, name, avatar }
Host receives  → merges guest into users[], sends SYNC_FULL_STATE (batched)
                → sends heavy assets (avatars, location image) staggered
                → sends SYNC_FINISHED
Guest receives → unpacks SYNC_FULL_STATE into individual setters
              → receives SYNC_FINISHED → marks synced, shows arrival overlay
```

### Network Messages (27 types)

State sync: `SYNC_VIBE`, `SYNC_SCENE`, `SYNC_USER`, `SYNC_PERSONA`, `SYNC_ROUND`, `SYNC_VIEW`, `SYNC_QUESTION_STATE`, `SYNC_RATING`, `SYNC_CONVERSATION_LOG`, `SYNC_DATE_CONTEXT`, `SYNC_SCENE_CHOICE`, `SYNC_DRAFT_STATE`, `SYNC_DRAFT_STROKE`, `SYNC_ACTIVITY_DATA`, `SYNC_ACTIVITY_CHOICE`, `SYNC_LAST_CHOICE`, `SYNC_SIP`, `SYNC_TOUCH`, `SYNC_TOAST_INVITE`, `SYNC_FULL_STATE`, `SYNC_FINISHED`, `SYNC_HELLO`

Triggers: `TRIGGER_FLASH`, `TRIGGER_CLINK`, `TRIGGER_REACTION`

Control: `REQUEST_SYNC`, `PING`, `PONG`

## Key Types

| Type | Shape |
|------|-------|
| `AppView` | `'setup' \| 'onboarding' \| 'hub' \| 'activity' \| 'question' \| 'loading' \| 'rating' \| 'twoTruths' \| 'finishSentence'` |
| `VibeStats` | `{ playful, flirty, deep, comfortable }` (0-100 each) |
| `PersonaState` | traits, memories, secrets, imageUrl, appearance, background, sex, age, chemistry, drunkFactor, revealProgress, isProfileComplete |
| `DateContext` | `{ location: DateLocation, vibe: DateVibe, generatedImage? }` |
| `IntelligenceReport` | publicationName, headline, lede, summary, vibeAnalysis, closingThought, date, barTab[], partnerRating? |
| `ActivityPayload` | `{ type: 'twoTruths', data: TwoTruthsData } \| { type: 'finishSentence', data: FinishSentenceData }` |
| `NetworkMessage` | Discriminated union of all 27 message types |

## Build & Deploy

- **Dev**: `npm run dev` (Vite, port 3000)
- **Build**: `npm run build` (produces PWA with service worker)
- **Test**: `npm test` (vitest, 35 tests across 4 files)
- **Type check**: `npx tsc --noEmit`
- **Deploy**: Push to `main` → Vercel auto-deploys. API key set in Vercel dashboard.
- **Chunks**: vendor-react (4KB), vendor-motion (133KB), vendor-peer (94KB), vendor-charts (<1KB), app (~590KB)

## Utilities

| File | Exports |
|------|---------|
| `utils/helpers.ts` | `applyVibeDeltas`, `getDominantVibe`, `compressImage` |
| `utils/dateHistory.ts` | `saveDateToHistory`, `getDateHistory`, `buildHistoryEntry` |
| `constants.ts` | `DEFAULT_AVATAR`, `INITIAL_VIBE`, `DATE_VIBES`, `DATE_LOCATIONS`, `PAGE_VARIANTS`, `SYSTEM_INSTRUCTION`, activity definitions |
