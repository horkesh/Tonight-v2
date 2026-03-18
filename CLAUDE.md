# Tonight

Tonight is a premium, synchronized two-person virtual date experience built with React 19, TypeScript, Vite, Tailwind CSS v4, and Framer Motion.

## Stack

- **Runtime**: Vite dev server (port 3000), browser-based SPA
- **UI**: React 19, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion
- **State**: Zustand stores (`store/`) + React Context (`context/SessionContext.tsx`)
- **AI**: Google Gemini API via server-side proxy (`api/gemini/`) → `services/geminiService.ts`
- **Networking**: PeerJS (WebRTC P2P data channels) via `services/p2p.ts`
- **Profiles**: Partner profiles + venue profiles in localStorage via `utils/profileStorage.ts`
- **Testing**: Vitest + jsdom + @testing-library/react
- **Fonts**: Inter (sans), Playfair Display (serif) — loaded via CDN in `index.html`
- **Deployment**: Vercel (free tier, push-to-deploy)
- **Path alias**: `@/*` → `./*`

## Repo Structure

```
App.tsx             Main app wrapper — view router, lazy loading, provider composition
index.tsx           React DOM entry
index.html          HTML shell with CDN fonts, theme CSS vars, background layers
constants.ts        Vibes, locations, activities, prompt seeds, system instruction
types.ts            All shared type definitions (MessageType, ActivityPayload, etc.)
types/profiles.ts   Profile, venue, and date config type definitions
components/         UI components (26 feature + views/ + ui/)
  views/            Full-screen route views (13 views, most lazy-loaded)
  ui/               Low-level primitives (GlassCard, TextRenderer, CollapsibleSection, CheckboxGrid)
context/            SessionContext provider
hooks/              Custom hooks (14 hooks, core orchestration layer)
services/           Gemini AI proxy client + PeerJS networking + sound
  prompts/          Prompt builder functions (promptContext, gamePrompts, narrativePrompts)
store/              Zustand stores (gameState, presenceState, aiState, profileStore)
utils/              Helpers (astrology, dateHistory, profileStorage, image compression, venueToLocation)
api/                Vercel serverless routes (gemini/text, gemini/image)
tests/              Vitest tests (helpers, geminiParsing, p2p, syncHandlers)
docs/               Planning, architecture notes, project ledger
```

## Key Entrypoints

- `index.html` → `index.tsx` → `App.tsx`
- `App.tsx` renders views based on `gameState.currentScene` / view state
- Views lazy-loaded via `React.lazy()` (except SetupView, SyncWaitScreen)
- `context/SessionContext.tsx` composes all hooks into a single provider

## Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build
npm run lint      # ESLint
npm test          # Vitest (35 tests)
npx tsc --noEmit  # Type check
```

## Environment

- `GEMINI_API_KEY` — set in Vercel dashboard (server-side only, never in client bundle)
- `.env.local` for local dev — loaded via Vite `import.meta.env`
- Never commit `.env.local` or API keys

## Conventions

### State Management
- Domain state lives in Zustand stores under `store/`
- Cross-cutting composition lives in hooks under `hooks/`
- Components consume state via `useSession()` from `context/SessionContext.tsx`
- P2P sync messages are typed in `types.ts` (`MessageType` enum)
- `INITIAL_PERSONA` is exported from `store/presenceState.ts` — single source of truth

### Components
- Views are full-screen route components in `components/views/`
- Shared UI primitives go in `components/ui/`
- Feature components go directly in `components/`
- Use Framer Motion for transitions (`PAGE_VARIANTS` in `constants.ts`)

### AI Integration
- All Gemini calls go through server-side proxy: `api/gemini/text.ts` and `api/gemini/image.ts`
- Client calls proxy via `callProxy()` in `services/geminiService.ts`
- Prompt templates live in `services/prompts/`
- Use `getPromptContext()` from `services/prompts/promptContext.ts` to read profile store for AI calls
- System instruction is defined in `constants.ts`
- Retry with exponential backoff for rate limits (capped at 30s)

### Networking
- Host creates a PeerJS connection with a deterministic ID based on room name
- Guest connects to the host's known ID
- All state sync uses typed `MessageType` messages
- Heartbeat via PING/PONG (30s timeout, 3-miss tolerance)
- State updates that need P2P sync go through `useBroadcastingState.ts` (send) and `useNetworkSync.ts` (receive)

### Profiles & Setup
- Partner profiles and venues stored in localStorage via `utils/profileStorage.ts`
- `saveProfile()` / `saveVenue()` return boolean — always check for quota errors
- Profile store (`store/profileStore.ts`) holds active selections
- Date config (arc, comfort, topics to avoid, vibes) set during pre-date setup

### Styling
- Tailwind CSS v4 — use utility classes, not custom CSS
- Theme colors defined as CSS variables in `index.html` (single source of truth)
- Primary: rose-600 (`#e11d48`), Background: slate-950 (`#020617`)
- Dark cinematic aesthetic throughout — maintain consistency
- Prefer transform animations (`scaleX`/`scaleY`/`opacity`) over layout properties (`width`/`height`)

### Code Style
- TypeScript strict mode
- Prefer hooks and functional components
- Keep hooks focused — one domain per hook
- No prop drilling — use context
- Shared constants go in `constants.ts` — check before duplicating
- Use `applyVibeDeltas()` from `utils/helpers` for vibe stat updates
- Use `getDominantVibe()` from `utils/helpers` for vibe comparisons
- Clean up timers/intervals/subscriptions in useEffect returns

### Documentation
- `docs/project_ledger.md` — chronological record of all changes (update after every session)
- `.claude/napkin.md` — reusable rules and patterns (update when patterns emerge)
- `CLAUDE.md` — this file (update when architecture changes)
