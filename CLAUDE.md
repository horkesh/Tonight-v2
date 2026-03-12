# Tonight

Tonight is a premium, synchronized two-person virtual date experience built with React 19, TypeScript, Vite, Tailwind CSS v4, and Framer Motion.

## Stack

- **Runtime**: Vite dev server (port 3000), browser-based SPA
- **UI**: React 19, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion
- **State**: Zustand stores (`store/`) + React Context (`context/SessionContext.tsx`)
- **AI**: Google Gemini API (`@google/genai`) via `services/geminiService.ts`
- **Networking**: PeerJS (WebRTC P2P data channels) via `services/p2p.ts`
- **Fonts**: Inter (sans), Playfair Display (serif) — loaded via CDN in `index.html`
- **Path alias**: `@/*` → `./*`

## Repo Structure

```
App.tsx           Main app wrapper — view router, provider composition
index.tsx         React DOM entry
index.html        HTML shell with CDN imports, theme vars, animated background
constants.ts      Vibes, locations, activities, prompt seeds, system instruction
types.ts          All shared type definitions
components/       UI components (24 main + views/ + ui/)
  views/          Full-screen route views (10 views)
  ui/             Low-level primitives (GlassCard, TextRenderer)
context/          SessionContext provider
hooks/            Custom hooks (10 hooks, core orchestration layer)
services/         Gemini AI + PeerJS networking
  prompts/        Prompt builder functions
store/            Zustand stores (gameState, presenceState, aiState)
utils/            Helpers (image compression)
docs/             Planning and architecture notes
```

## Key Entrypoints

- `index.html` → `index.tsx` → `App.tsx`
- `App.tsx` renders views based on `gameState.currentScene` / view state
- `context/SessionContext.tsx` composes all hooks into a single provider

## Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build
npm run lint      # ESLint
npx tsc --noEmit  # Type check
```

## Environment

- `GEMINI_API_KEY` in `.env.local` (loaded via Vite `import.meta.env`)
- Never commit `.env.local` or API keys

## Conventions

### State Management
- Domain state lives in Zustand stores under `store/`
- Cross-cutting composition lives in hooks under `hooks/`
- Components consume state via `useSession()` from `context/SessionContext.tsx`
- P2P sync messages are typed in `types.ts` (`MessageType` enum)

### Components
- Views are full-screen route components in `components/views/`
- Shared UI primitives go in `components/ui/`
- Feature components go directly in `components/`
- Use Framer Motion for transitions (`PAGE_VARIANTS` in `constants.ts`)

### AI Integration
- All Gemini calls go through `services/geminiService.ts`
- Prompt templates live in `services/prompts/`
- System instruction is defined in `constants.ts`
- Retry with exponential backoff for rate limits

### Networking
- Host creates a PeerJS connection with a deterministic ID based on room name
- Guest connects to the host's known ID
- All state sync uses typed `MessageType` messages
- Heartbeat via PING/PONG

### Styling
- Tailwind CSS v4 — use utility classes, not custom CSS
- Theme colors defined as CSS variables in `index.css` and `index.html`
- Primary: rose-600 (`#e11d48`), Background: slate-950 (`#020617`)
- Dark cinematic aesthetic throughout — maintain consistency

### Code Style
- TypeScript strict mode
- Prefer hooks and functional components
- Keep hooks focused — one domain per hook
- No prop drilling — use context
