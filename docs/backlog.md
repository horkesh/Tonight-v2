# Tonight — Master Backlog

The measure of every item here: does it make the person sitting across from you say *"what is this?"* faster, louder, or more memorably?

---

## P0 — Fix What Breaks the Magic

These are structural problems. Until they're solved, the app fights the moment instead of creating it.

### Pre-Date Setup Mode

**What:** The current setup flow is 8+ screens of configuration before anything happens. At a bar, that's death. The host (always Haris) should pre-configure everything — his profile is permanent, partner profile is optional — so the live experience is: open app, show QR, partner scans, cinematic arrival, experience begins. Under 60 seconds from phone-out to first wow moment.

**Why it matters:** Every second spent tapping through setup screens is a second of awkward silence where you're staring at your phone instead of your date. The magic starts when *they* see something incredible, not when you finish filling out a form.

**Scope:** Medium. Needs a persistent host profile (localStorage), a stripped-down guest join flow, a new "pre-configured session" path that skips most of SetupView. Touches `hooks/useSessionLifecycle.ts`, `components/views/SetupView.tsx`, `types.ts`, and likely a new `utils/hostProfile.ts`.

### Guided Narrative Flow (Replace Hub as Primary Interface)

**What:** The Hub is a flat menu you return to after every interaction. It feels like a tool, not a date. Replace it with an AI-driven narrative arc: early questions are light and playful, activities get more vulnerable as chemistry builds, the vibe escalates. The AI suggests what comes next based on chemistry score, conversation history, and round number. The Hub becomes a brief breathing room between guided moments — a pause, not a destination.

**Why it matters:** A great date has a natural arc — you don't hand someone a menu and say "pick an intimacy level." The app should feel like it's reading the room and guiding you both somewhere neither expected. That's the difference between an app and an *experience*.

**Scope:** Large. Requires a narrative engine (probably in a new `hooks/useNarrativeFlow.ts`), reworking how scenes transition, updating AI prompts to be arc-aware. The Hub view gets simplified. Touches `hooks/useAiActions.ts`, `hooks/useQuestionFlow.ts`, `services/prompts/`, `store/gameState.ts`, `components/views/HubView.tsx`.

### Cinematic Partner Arrival

**What:** When the date scans the QR and connects, the first thing they see should be breathtaking — a full-screen cinematic moment. Their abstract avatar materializing, location art filling the screen, a dramatic reveal with sound. Not a loading spinner into a dashboard.

**Why it matters:** This is the "holy shit" moment. The partner just scanned a random QR code and expected nothing. If the first thing they see is a cinematic reveal of themselves rendered as art, with ambient sound swelling — that's when they lean in. First impressions are everything.

**Scope:** Medium. A new transition view between connection and Hub, with Framer Motion choreography and sound cues. Needs `components/views/ArrivalView.tsx`, ties into Sound Design (below), and connects to the P2P `GUEST_JOINED` message flow.

---

## P1 — The Wow Factor

These directly amplify the in-person experience. Do these right after P0.

### Sound Design

**What:** The app is completely silent. Add UI feedback sounds (soft glass clink on toast, subtle pulse on reactions, tactile tap on choices), ambient crossfades when the vibe shifts, and most importantly — a satisfying, resonant *clink* for the synchronized toast. That's the app's signature moment.

**Why it matters:** Sound is the fastest way to make a web app feel like a real product. Silence feels broken. A well-timed sound effect makes the toast moment go from "we both tapped a button" to a shared physical experience.

**Scope:** Medium. `components/Soundscape.tsx` already handles ambient audio. Needs new audio assets in `public/sounds/`, a sound manager utility, and trigger points wired into key interactions across several components.

### Shareable Intelligence Report (Web Share API)

**What:** The end-of-date Intelligence Briefing is the payoff — and it just disappears when you close it. Render it as a beautiful shareable card image. Use `navigator.share()` as the primary share path (works on iOS Safari), with `html2canvas` + download as desktop fallback.

**Why it matters:** This is what they screenshot and send to their friends. *"Look what this guy pulled out at dinner."* The report is your app's viral loop. If it doesn't leave the phone, the moment dies at the table.

**Scope:** Medium. Needs `utils/exportReport.ts` for image generation, Web Share API integration in `components/IntelligenceBriefing.tsx`, and visual polish on the exported card (classified document aesthetic — stamps, redacted text, noir feel).

### Smoother Reconnection

**What:** If either phone locks or loses signal at a bar, the session shouldn't die. Extend the restore window from 5 to 15 minutes, add a one-tap "Reconnect to [Name]?" prompt, and auto-attempt reconnection when the tab regains focus before showing any error UI.

**Why it matters:** Nothing kills the vibe faster than "sorry, the app crashed, let me set it up again." Reconnection needs to be invisible. If it can't be invisible, it needs to be one tap.

**Scope:** Small-medium. Touches `hooks/useSessionLifecycle.ts` and `services/p2p.ts`. Mostly tuning timeouts and adding a focus-based reconnect listener.

---

## P2 — Depth & Delight

These make repeat dates feel fresh and add intelligence to the experience.

### Dynamic Question Escalation

**What:** Questions should feel like they're reading the room. At chemistry > 50, auto-unlock deeper categories. Reference earlier answers in follow-up questions ("You mentioned [X]..."). Use the existing `conversationLog` which currently goes unused by the question engine.

**Why it matters:** Generic questions feel like a quiz. Questions that call back to something she said ten minutes ago feel like the app is *listening*. That's the uncanny moment that makes people trust the AI.

**Scope:** Medium. Touches `services/prompts/gamePrompts.ts` and `hooks/useQuestionFlow.ts`. The conversation log data is already there — it just needs to flow into prompt construction.

### Past Dates — Richer History

**What:** Date history saves but is minimal. Store conversation highlights, partner avatar thumbnails, and the exported report image. If you've dated the same person before (name match), reference it in AI prompts — "Our Story So Far."

**Why it matters:** On a second date, the app remembering details from the first one is an incredible flex. It turns a novelty into something with continuity.

**Scope:** Medium. Touches `utils/dateHistory.ts`, `components/PastDates.tsx`, and AI prompt construction.

---

## P3 — Housekeeping

Low-effort items that should get done but don't move the needle on their own.

### API Proxy Rate Limiting

**What:** The Vercel proxy endpoints have no auth. Add origin verification and simple per-IP rate limiting to prevent quota burn.

**Why it matters:** Someone finding the endpoint and burning your Gemini quota mid-date would be embarrassing in a different way.

**Scope:** Small. `api/gemini/text.ts`, `api/gemini/image.ts`. Origin check + in-memory rate map.

### Type the Setup Flow

**What:** `hostData: any` and `guestData: any` flow through the entire setup pipeline untyped. Define a `SetupFormData` interface and type `startApp` parameters.

**Why it matters:** Catches mismatches at compile time. Developer quality-of-life.

**Scope:** Small. `types.ts`, `hooks/useSessionLifecycle.ts`, `components/views/SetupView.tsx`.

### PWA Icons

**What:** Replace the 1x1 placeholder PNGs with a proper Tonight logo (dark, minimal, rose accent). Test standalone mode on iOS Safari and Android Chrome.

**Why it matters:** When you open the app from the home screen, it should look like a real app.

**Scope:** Tiny. Replace two PNG files, verify manifest. 10-minute task.

---

## Deliberately Deprioritized

These were in the original plan but don't justify the effort for a personal app:

- **More activities (was 2.1):** The current three activities are solid. The *flow between them* matters more than having six options. Revisit after Guided Narrative Flow is built.
- **Location-aware theming (was 2.3):** Diminishing returns. The current vibe-based atmosphere shifts are sufficient. Full per-location palettes would be nice but won't change anyone's reaction.
- **TURN server fallback (was 3.3):** Only matters if PeerJS connections fail on specific networks. Test at actual venues first. If it works, skip it.
- **E2E tests (was 3.4):** This is a personal project with one developer. Manual testing at real dates is the E2E test.

---

## Completed

Previously tracked — all done as of 2026-03-12:

- Hook decomposition (useGameState, usePresence, useSessionState refactor)
- P2P delta updates and image optimization
- Component cleanup and prop drilling removal
- Gemini API proxy, type safety, useSessionState split
- Testing foundation, PWA/QR/batching, date history
