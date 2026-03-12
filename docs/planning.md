# Tonight — Master Development Plan

The goal of Tonight is simple: pull out your phone on a date, open the app, and create a moment that makes the other person say *"what is this?"* Everything below serves that moment.

---

## Tier 1: The Wow Factor

These directly improve the in-person experience. Do these first.

### 1.1 Sound Design
The app is silent. Sound is the fastest way to make it feel premium and real.
- **UI feedback sounds**: soft glass clink on toast, subtle pulse on reactions, tactile tap on choices
- **Ambient transitions**: when the vibe shifts (playful → deep), crossfade the soundscape audibly
- **The Clink**: the synchronized toast moment needs a satisfying, resonant *clink* sound — this is the app's signature interaction
- **Files**: `components/Soundscape.tsx` (ambient already exists), new audio assets in `public/sounds/`

### 1.2 The Intelligence Report as a Keepsake
The end-of-date Intelligence Briefing is the payoff. Right now it just closes and disappears.
- **Share as image**: use `html2canvas` (already in import map, unused) to render the briefing as a shareable card
- **"Send to Partner" button**: generate the image and offer to share via Web Share API (`navigator.share`)
- **Visual polish**: make the exported card look like a classified document — stamps, redacted text, noir aesthetic
- **This is what they'll screenshot and send to their friends**
- **Files**: `components/IntelligenceBriefing.tsx`, new `utils/exportReport.ts`

### 1.3 Polished PWA Experience
You'll open this on your phone at a restaurant. It needs to feel like an app, not a website.
- **Real app icons**: replace the 1x1 placeholder PNGs with a proper Tonight logo (dark, minimal, rose accent)
- **Splash screen**: iOS/Android splash that matches the dark theme
- **No browser chrome**: the PWA manifest already sets `display: standalone`, but test on both iOS Safari and Android Chrome
- **Files**: `public/icon-192.png`, `public/icon-512.png`, `vite.config.ts` (PWA config)

### 1.4 Smoother Reconnection
If either person's phone locks or loses signal for 30 seconds at a bar, the session shouldn't die.
- **Extend session restore window**: 5 minutes → 15 minutes
- **"Reconnect to [Name]?" prompt**: pre-filled room code, one-tap rejoin
- **Auto-reconnect on focus**: when the tab regains focus, silently attempt reconnection before showing error UI
- **Files**: `hooks/useSessionLifecycle.ts`, `services/p2p.ts`

---

## Tier 2: Depth & Delight

These make repeat uses feel fresh and add layers to the experience.

### 2.1 More Activities
Two Truths and Finish My Sentence are solid, but variety keeps it interesting on a second or third date.
- **"Read My Mind"**: both players secretly answer the same question, reveal simultaneously — chemistry test
- **"Hot Take / Cold Take"**: AI generates a spicy opinion, both react agree/disagree, see if you're aligned
- **"Draw Together"**: the SharedDraft canvas exists but is underused — give it a prompt ("draw your ideal weekend")
- **Files**: `types.ts` (new ActivityId), `hooks/useAiActions.ts`, new view components

### 2.2 Dynamic Question Escalation
Questions should feel like they're reading the room, not random.
- **Chemistry-aware progression**: at chemistry > 50, unlock "Intimate" and "Desire" categories automatically
- **Callback questions**: reference something from an earlier answer ("You mentioned [X]...")
- **Conversation memory**: the `conversationLog` exists but questions don't reference it yet
- **Files**: `services/prompts/gamePrompts.ts`, `hooks/useQuestionFlow.ts`

### 2.3 Location-Aware Theming
The background blobs and color palette should shift more dramatically based on the chosen location.
- **Per-location color schemes**: jazz bar = warm amber/burgundy, rooftop = deep navy/gold, library = forest/cream
- **Location-specific ambient sounds**: already partially there, make them more distinct
- **Vibe-reactive intensity**: as chemistry rises, colors get warmer, blur increases, grain reduces
- **Files**: `hooks/useAtmosphere.ts`, `index.html` (CSS vars), `constants.ts`

### 2.4 Past Dates — Richer History
The date history saves but is minimal. Make it a conversation starter for the next date.
- **Store more**: full conversation log highlights, partner avatar thumbnail, the exported report image
- **"Our Story So Far"**: if you've dated the same person before (name match), reference it in AI prompts
- **Visual timeline**: replace the simple list with a mini card-based timeline
- **Files**: `utils/dateHistory.ts`, `components/PastDates.tsx`

---

## Tier 3: Infrastructure & Safety

These don't directly wow anyone but prevent embarrassment.

### 3.1 API Proxy Rate Limiting
The Vercel proxy routes have no auth. Anyone who finds the endpoints can burn through Gemini quota.
- **Origin check**: verify `req.headers.origin` matches your domain
- **Simple rate limiting**: use Vercel KV or in-memory map to limit requests per IP (e.g., 60/min)
- **Files**: `api/gemini/text.ts`, `api/gemini/image.ts`

### 3.2 Type the Setup Flow
`hostData: any` and `guestData: any` flow through the entire setup pipeline untyped.
- **Define `SetupFormData` interface** in `types.ts`
- **Type `startApp` parameters** — catches mismatches at compile time
- **Files**: `types.ts`, `hooks/useSessionLifecycle.ts`, `components/views/SetupView.tsx`

### 3.3 TURN Server Fallback
PeerJS uses public STUN servers. Strict NATs or some cellular networks will fail to connect.
- **Deploy Coturn** on a cheap VM or use a hosted TURN service (Twilio, Xirsys free tier)
- **Pass ICE config** to PeerJS in `services/p2p.ts`
- Only matters if connections fail in the wild — test at an actual restaurant first

### 3.4 E2E Test
One Playwright test covering the happy path: setup → hub → question → activity → rating → report.
- Catches integration regressions that unit tests miss
- **Files**: new `e2e/` directory, `playwright.config.ts`

---

## Priority Order

For maximum impact on actual dates:

1. **Sound design** (1.1) — instant atmosphere upgrade
2. **Report as keepsake** (1.2) — gives them something to take home
3. **Real PWA icons** (1.3) — looks professional when opened
4. **Reconnection** (1.4) — prevents embarrassing failures
5. **More activities** (2.1) — variety for repeat dates
6. **Question escalation** (2.2) — makes the AI feel smarter
7. **API rate limiting** (3.1) — prevents quota burn
8. Everything else as time allows

---

## Completed (Archived)

Previously in this file — all done as of 2026-03-12:
- Hook decomposition (useGameState, usePresence, useSessionState refactor)
- P2P delta updates and image optimization
- Component cleanup and prop drilling removal
- Gemini API proxy (Phase 1), type safety (Phase 2), useSessionState split (Phase 3)
- Testing foundation (Phase 4), PWA/QR/batching (Phase 5), date history (Phase 6)
