# Tonight — Master Backlog

The measure of every item here: does it make the person sitting across from you say *"what is this?"* faster, louder, or more memorably?

---

## P0 — Fix What Breaks the Magic

These are structural problems. Until they're solved, the app fights the moment instead of creating it.

### Pre-Date Setup Mode

**What:** The current setup flow is 8+ screens of configuration before anything happens. At a bar, that's death. The host (always Haris) should pre-configure everything — his profile is permanent, partner profile is optional — so the live experience is: open app, show QR, partner scans, cinematic arrival, experience begins. Under 60 seconds from phone-out to first wow moment.

**Why it matters:** Every second spent tapping through setup screens is a second of awkward silence where you're staring at your phone instead of your date. The magic starts when *they* see something incredible, not when you finish filling out a form.

**Scope:** Medium. Needs a persistent host profile (localStorage), a stripped-down guest join flow, a new "pre-configured session" path that skips most of SetupView. Touches `hooks/useSessionLifecycle.ts`, `components/views/SetupView.tsx`, `types.ts`, and likely a new `utils/hostProfile.ts`.

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

Done as of 2026-03-13:

- **Guided Narrative Flow** — AI-driven arc suggestions on hub, cinematic transition text, accept/override UX. `hooks/useNarrativeFlow.ts`, `services/prompts/narrativePrompts.ts`, `constants.ts` arc rules, `HubView.tsx` restructured.
- **Cinematic Partner Arrival** — 9-second multi-stage reveal: location Ken Burns, particle convergence, avatar blur-in, letter-spacing name animation, arrival sound. `components/ArrivalOverlay.tsx`, `store/presenceState.ts` persistence.
- **Sound Design** — `services/soundManager.ts` singleton with Web Audio API, lazy buffer loading, per-category volume. 7 synthesized audio files. Integrated into toast, answer, activity, vulnerability, and arrival.
- **Shareable Intelligence Report** — Classified document aesthetic with dark slate, CLASSIFIED/TOP SECRET stamps, vibe analysis bars, case numbers. Web Share API with native share sheet, lazy 3x retina export, download fallback. `components/IntelligenceBriefing.tsx`.
- **Smoother Reconnection** — 15-minute restore window, 15s restore timeout, tab-focus auto-reconnect via `visibilitychange`, host keeps peer alive, "Reconnect to [Name]?" prompt, connection quality dot. `services/p2p.ts`, `hooks/useSessionLifecycle.ts`, `components/ConnectionStatusOverlay.tsx`.
- **Profile & Venue System** — Deep partner profiles, venue profiles, date config, AI prompt personalization via PromptContext.

Previously tracked — all done as of 2026-03-12:

- Hook decomposition (useGameState, usePresence, useSessionState refactor)
- P2P delta updates and image optimization
- Component cleanup and prop drilling removal
- Gemini API proxy, type safety, useSessionState split
- Testing foundation, PWA/QR/batching, date history
