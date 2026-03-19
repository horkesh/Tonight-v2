# Wow Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 features that elevate the date experience — evolving location art, whisper dares, shared playlist, private insight card, end-of-night letter, and post-date text suggestion.

**Architecture:** Features are independent and can be built in any order. They share a foundation layer (types, stores, gemini service). The end-session features (letter + text) modify the existing `finalizeReport` flow. All new Gemini functions use the existing `callProxy` pattern. New views are lazy-loaded.

**Tech Stack:** React 19, TypeScript, Zustand, Framer Motion, Gemini API via server proxy, PeerJS P2P.

**Spec:** `docs/superpowers/specs/2026-03-19-wow-features-design.md`

---

## Chunk 1: Foundation — Types, Stores, Constants

### Task 1: Add new types

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add PlaylistData, LetterData types and expand unions**

After the `FinishSentenceData` interface (~line 213), add:

```typescript
// --- Activity: Shared Playlist ---
export interface PlaylistData {
  songs: { title: string; artist: string; vibe: string }[];
}

// --- End-of-Night Letter ---
export interface LetterData {
  salutation: string;
  body: string;
  signoff: string;
}
```

Update `ActivityId` (~line 194):
```typescript
export type ActivityId = 'twoTruths' | 'finishSentence' | 'playlist';
```

Update `ActivityPayload` (~line 196):
```typescript
export type ActivityPayload =
  | { type: 'twoTruths'; data: TwoTruthsData }
  | { type: 'finishSentence'; data: FinishSentenceData }
  | { type: 'playlist'; data: PlaylistData };
```

Add to `NetworkMessage` union (~line 185):
```typescript
  | { type: 'SYNC_PLAYLIST_CHOICE'; payload: { userId: string; choices: number[] } }
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers of new types yet)

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat: Add PlaylistData, LetterData types and playlist network message"
```

---

### Task 2: Expand stores

**Files:**
- Modify: `store/gameState.ts`
- Modify: `store/aiState.ts`

- [ ] **Step 1: Add `lastLocationImageRound` to gameState**

In `store/gameState.ts`, add to the interface and initial state:
```typescript
// In GameState interface:
lastLocationImageRound: number;
setLastLocationImageRound: (round: number) => void;

// In create():
lastLocationImageRound: 0,
setLastLocationImageRound: (round) => set({ lastLocationImageRound: round }),
```

- [ ] **Step 2: Add playlist, letter, followUpText to aiState**

In `store/aiState.ts`, add to the `AiState` interface and store:
```typescript
// In interface:
playlistData: PlaylistData | null;
setPlaylistData: (data: PlaylistData | null) => void;
playlistChoices: Record<string, number[]>;
setPlaylistChoices: (updater: Record<string, number[]> | ((prev: Record<string, number[]>) => Record<string, number[]>)) => void;
letterData: LetterData | null;
setLetterData: (data: LetterData | null) => void;
followUpText: string | null;
setFollowUpText: (text: string | null) => void;

// In create():
playlistData: null,
setPlaylistData: (data) => set({ playlistData: data }),
playlistChoices: {},
setPlaylistChoices: (updater) => set((state) => ({
  playlistChoices: typeof updater === 'function' ? updater(state.playlistChoices) : updater,
})),
letterData: null,
setLetterData: (data) => set({ letterData: data }),
followUpText: null,
setFollowUpText: (text) => set({ followUpText: text }),
```

Import `PlaylistData`, `LetterData` from `../types`.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add store/gameState.ts store/aiState.ts
git commit -m "feat: Add store fields for playlist, letter, follow-up text, location evolution"
```

---

### Task 3: Add constants — whisper dares and playlist activity

**Files:**
- Modify: `constants.ts`

- [ ] **Step 1: Add whisper dare pool and playlist activity**

Add to `constants.ts`:

```typescript
export const WHISPER_DARES: string[] = [
  "Tell her the first thing you noticed about her.",
  "Ask her what she's afraid to ask you.",
  "Describe how she makes you feel in three words.",
  "Tell her a secret you haven't told anyone this year.",
  "Ask her what she'd do if this was your last night together.",
  "Tell her the moment tonight you felt most nervous.",
  "Ask her what she's pretending not to feel right now.",
  "Confess something you almost said earlier but held back.",
  "Tell her what her voice does to you.",
  "Ask her where she'd take you if she could go anywhere right now.",
  "Tell her something about herself she probably doesn't know.",
  "Ask her what she wants to happen next.",
  "Describe the version of her you see that she doesn't show anyone.",
  "Tell her the honest answer to the last question you dodged.",
  "Ask her to tell you one thing she needs to hear tonight.",
  "Look at her and say exactly what you're thinking. No filter.",
  "Tell her what you'd write about tonight in your journal.",
  "Ask her what part of tonight she'll replay in her head later.",
  "Tell her the thing about her that scares you a little.",
  "Ask her what she wishes you'd notice.",
];
```

Add to `ACTIVITIES` array:
```typescript
{
  id: 'playlist',
  title: 'Our Playlist',
  description: 'Build tonight\'s soundtrack together.',
  icon: '🎵'
},
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add constants.ts
git commit -m "feat: Add whisper dare pool and playlist activity constant"
```

---

## Chunk 2: Whisper Mode

### Task 4: Add whisper callback to useDeviceSensors

**Files:**
- Modify: `hooks/useDeviceSensors.ts`

- [ ] **Step 1: Add `onWhisper` callback with 60s cooldown**

Update the interface and hook. The existing hook detects `beta > 55` for "pour" with a 2s debounce. Add a separate `onWhisper` callback with a 60s cooldown and different detection (sustained tilt — beta > 55 held for 1.5s, or simply a second pour-like event on a different timer).

Simplest approach: `onWhisper` fires on the same `beta > 55` condition but with its own 60s debounce, separate from `onPour`'s 2s debounce. Add `onWhisper?: () => void` to the interface as optional.

```typescript
interface UseDeviceSensorsProps {
  onPour: () => void;
  onGlanceBack: () => void;
  onWhisper?: () => void;
}
```

Add a separate `lastWhisperRef` with 60000ms debounce. Fire `onWhisper` on the same beta > 55 detection, independently of `onPour`.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add hooks/useDeviceSensors.ts
git commit -m "feat: Add onWhisper callback with 60s cooldown to device sensors"
```

---

### Task 5: Create WhisperOverlay component

**Files:**
- Create: `components/WhisperOverlay.tsx`

- [ ] **Step 1: Build the overlay**

```typescript
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHISPER_DARES } from '../constants';

interface WhisperOverlayProps {
  isActive: boolean;
  onDismiss: () => void;
}

export const WhisperOverlay: React.FC<WhisperOverlayProps> = ({ isActive, onDismiss }) => {
  const [dare, setDare] = useState('');
  const [showDare, setShowDare] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isActive) {
      setShowDare(false);
      return;
    }

    // Pick a random unused dare
    const available = WHISPER_DARES.map((_, i) => i).filter(i => !usedIndices.has(i));
    const pool = available.length > 0 ? available : WHISPER_DARES.map((_, i) => i);
    const idx = pool[Math.floor(Math.random() * pool.length)];
    setDare(WHISPER_DARES[idx]);
    setUsedIndices(prev => new Set([...prev, idx]));

    // Show dare after 1.5s beat
    const timer = setTimeout(() => setShowDare(true), 1500);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={onDismiss}
          className="fixed inset-0 z-[150] flex items-center justify-center p-8 cursor-pointer"
        >
          {/* Dim overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Heartbeat pulse */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-rose-500/10"
          />

          {/* Dare text */}
          <AnimatePresence>
            {showDare && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="relative max-w-xs text-center"
              >
                <p className="text-2xl font-serif italic text-white/90 leading-relaxed">
                  {dare}
                </p>
                <span className="block mt-6 text-[8px] uppercase tracking-[0.5em] text-white/20 font-black">
                  Tap to dismiss
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/WhisperOverlay.tsx
git commit -m "feat: Create WhisperOverlay component with dare pool and heartbeat animation"
```

---

### Task 6: Mount WhisperOverlay in App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Wire up whisper state and sensor callback**

In `AppContent`, add state:
```typescript
const [whisperActive, setWhisperActive] = useState(false);
```

Update `useDeviceSensors` call to include `onWhisper`:
```typescript
useDeviceSensors({
  onPour: () => { if (a.handleDrinkAction()) qa.showFlash("Sip Detected 🥃"); },
  onGlanceBack: () => qa.showFlash("Lost you for a second there...", 3000),
  onWhisper: () => { if (s.isHost && s.isSynced) setWhisperActive(true); },
});
```

Import and mount `WhisperOverlay` near the other overlays:
```tsx
<WhisperOverlay isActive={whisperActive} onDismiss={() => setWhisperActive(false)} />
```

Import the component at the top.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: Mount WhisperOverlay in App, wire device sensor callback"
```

---

## Chunk 3: Insight Card ("What I Noticed")

### Task 7: Add generatePartnerInsight to geminiService

**Files:**
- Modify: `services/geminiService.ts`

- [ ] **Step 1: Add the function**

Follow the existing pattern (callProxy + schema). Add near the other generate functions:

```typescript
export const generatePartnerInsight = async (
  partnerPersona: PersonaState,
  conversationLog: ConversationEntry[],
  vibe: VibeStats,
  promptContext?: PromptContext | null
): Promise<string> => {
  const traits = partnerPersona.traits.join(', ') || 'unknown';
  const secrets = partnerPersona.secrets.slice(-3).join('; ') || 'none revealed';
  const memories = partnerPersona.memories.slice(-5).join('; ') || 'none yet';
  const recentAnswers = conversationLog.slice(-5).map(e =>
    `[${e.category}] "${e.questionText}" → "${e.answer}"`
  ).join('\n');

  const prompt = `You are an expert psychologist observing a date. Based on the data below, write ONE observation about the partner — something the host might not notice themselves. Max 20 words. Be specific, not generic. Observational, not flattering. Focus on behavioral patterns, defense mechanisms, or hidden desires.

PARTNER TRAITS: ${traits}
REVEALED SECRETS: ${secrets}
KNOWN FACTS: ${memories}
RECENT ANSWERS:
${recentAnswers}

VIBE: playful=${vibe.playful}, flirty=${vibe.flirty}, deep=${vibe.deep}, comfortable=${vibe.comfortable}

${promptContext ? `PARTNER PROFILE: ${promptContext.profile?.name || 'Unknown'}, ${promptContext.profile?.job || ''}, interests: ${promptContext.profile?.interests?.join(', ') || 'unknown'}` : ''}

Respond with ONLY the observation sentence. No quotes, no preamble.`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim().slice(0, 150); // Safety cap
  } catch {
    return ''; // Silent failure per spec
  }
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add services/geminiService.ts
git commit -m "feat: Add generatePartnerInsight Gemini function"
```

---

### Task 8: Create InsightCard component

**Files:**
- Create: `components/InsightCard.tsx`

- [ ] **Step 1: Build the component**

```typescript
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InsightCardProps {
  text: string | null;
  onDismiss: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ text, onDismiss }) => {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={onDismiss}
          className="fixed bottom-28 left-4 right-4 z-[110] flex justify-center pointer-events-auto"
        >
          <div className="max-w-sm w-full p-5 bg-black/80 backdrop-blur-2xl border border-rose-500/20 rounded-2xl shadow-2xl cursor-pointer">
            <span className="text-[8px] uppercase tracking-[0.4em] text-rose-500/60 font-black block mb-2">Private Intel</span>
            <p className="text-sm font-serif italic text-white/80 leading-relaxed">{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/InsightCard.tsx
git commit -m "feat: Create InsightCard component for mid-date observations"
```

---

### Task 9: Wire insight trigger in useNarrativeFlow + mount in App

**Files:**
- Modify: `hooks/useNarrativeFlow.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Add insight generation to useNarrativeFlow**

Add state and logic to the hook. After the existing narrative suggestion effect, add:

```typescript
const [insightText, setInsightText] = useState<string | null>(null);
const insightShownRef = useRef(false);

// Insight card — fires once after round 4
useEffect(() => {
  if (s.view !== 'hub' || !s.isHost) return;
  if (s.round < 4 || insightShownRef.current) return;

  insightShownRef.current = true;

  const fetchInsight = async () => {
    try {
      const { activeProfile, activeVenue, activeDateConfig } = useProfileStore.getState();
      const promptContext = buildPromptContext(activeProfile, activeVenue, activeDateConfig);
      const text = await generatePartnerInsight(s.partnerPersona, s.conversationLog, s.vibe, promptContext);
      if (text) setInsightText(text);
    } catch {
      // Silent failure
    }
  };
  fetchInsight();
}, [s.view, s.round, s.isHost]);
```

Import `generatePartnerInsight` from geminiService. Use the existing `stateRef` pattern for accessing `s.partnerPersona` etc.

Add `insightText` and a `clearInsight` action to the return:
```typescript
return {
  narrativeState: { narrativeSuggestion, isLoadingSuggestion, overrideActive, insightText },
  narrativeActions: { overrideSuggestion, clearInsight: () => setInsightText(null) },
};
```

- [ ] **Step 2: Mount InsightCard in App.tsx**

In `AppContent`, after the other overlays, add:
```tsx
{narrativeState.insightText && (
  <InsightCard
    text={narrativeState.insightText}
    onDismiss={narrativeActions.clearInsight}
  />
)}
```

Access `narrativeState` and `narrativeActions` from `useSession()`.

Auto-dismiss after 8 seconds — add a `useEffect` in App or in the InsightCard itself:
```typescript
useEffect(() => {
  if (!text) return;
  const timer = setTimeout(onDismiss, 8000);
  return () => clearTimeout(timer);
}, [text, onDismiss]);
```

(Add this inside `InsightCard.tsx`)

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add hooks/useNarrativeFlow.ts components/InsightCard.tsx App.tsx
git commit -m "feat: Wire insight card — triggers once after round 4, auto-dismisses"
```

---

## Chunk 4: Location Image Evolution

### Task 10: Add generateLocationTransition to geminiService

**Files:**
- Modify: `services/geminiService.ts`

- [ ] **Step 1: Add the function**

```typescript
export const generateLocationTransition = async (
  vibe: VibeStats,
  round: number,
  conversationLog: ConversationEntry[],
  currentEnvironmentPrompt: string
): Promise<{ narrative: string; imagePrompt: string }> => {
  const recentAnswers = conversationLog.slice(-3).map(e =>
    `[${e.category}] "${e.answer}"`
  ).join(', ');

  const dominant = getDominantVibe(vibe);

  const prompt = `You are a cinematographer directing a date scene. The current setting: "${currentEnvironmentPrompt}". The mood is ${dominant} (playful=${vibe.playful}, flirty=${vibe.flirty}, deep=${vibe.deep}, comfortable=${vibe.comfortable}). Round ${round}. Recent answers: ${recentAnswers}.

Write TWO things:
1. "narrative": A short atmospheric transition line (max 10 words). Something that could appear as a subtitle in a film. Examples: "The bartender dims the lights." "Rain starts against the window."
2. "imagePrompt": An updated environment description for image generation. Keep the same location but shift the atmosphere to match the current mood. Max 30 words.

Respond as JSON: {"narrative": "...", "imagePrompt": "..."}`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    return { narrative: parsed.narrative || '', imagePrompt: parsed.imagePrompt || currentEnvironmentPrompt };
  } catch {
    return { narrative: '', imagePrompt: currentEnvironmentPrompt };
  }
};
```

Import `getDominantVibe` from `../utils/helpers`.

- [ ] **Step 2: Commit**

```bash
git add services/geminiService.ts
git commit -m "feat: Add generateLocationTransition Gemini function"
```

---

### Task 11: Add narrative overlay to LocationWindow

**Files:**
- Modify: `components/LocationWindow.tsx`

- [ ] **Step 1: Add narrative text prop and overlay**

Add `narrativeText?: string` to `LocationWindowProps`. Render it as an animated overlay:

```tsx
{/* Narrative transition text */}
{narrativeText && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 1.5 }}
    className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
  >
    <p className="text-sm font-serif italic text-white/70 text-center px-6">{narrativeText}</p>
  </motion.div>
)}
```

Wrap in `<AnimatePresence>`.

- [ ] **Step 2: Commit**

```bash
git add components/LocationWindow.tsx
git commit -m "feat: Add narrative transition overlay to LocationWindow"
```

---

### Task 12: Wire location evolution trigger in useNarrativeFlow

**Files:**
- Modify: `hooks/useNarrativeFlow.ts`

- [ ] **Step 1: Add location evolution effect**

Add state:
```typescript
const [locationNarrative, setLocationNarrative] = useState<string | null>(null);
```

Add effect (after existing narrative suggestion effect):
```typescript
useEffect(() => {
  if (s.view !== 'hub' || !s.isHost) return;
  if (s.round < 3 || s.round % 3 !== 0) return;

  const { lastLocationImageRound } = useGameStore.getState();
  if (lastLocationImageRound === s.round) return;

  const evolveLocation = async () => {
    const snap = stateRef.current;
    if (!snap.dateContext?.location) return;

    try {
      const { narrative, imagePrompt } = await generateLocationTransition(
        snap.vibe, snap.round, snap.conversationLog,
        snap.dateContext.location.environmentPrompt
      );

      useGameStore.getState().setLastLocationImageRound(snap.round);

      if (narrative) {
        setLocationNarrative(narrative);
        setTimeout(() => setLocationNarrative(null), 4000);
      }

      // Generate new image with evolved prompt
      const newImage = await generateLocationImage(
        { ...snap.dateContext.location, environmentPrompt: imagePrompt },
        snap.dateContext.vibe || { id: 'noir', title: 'Noir', description: '', icon: '', promptModifier: '' },
      );

      if (newImage) {
        // Update dateContext with new image — this syncs via P2P
        // Access the broadcasting setDateContext through session actions
      }
    } catch {
      // Silent failure per spec
    }
  };

  evolveLocation();
}, [s.view, s.round, s.isHost]);
```

Note: The image update needs access to the session's `setDateContext` action. Pass it through or call it via the session reference.

Add `locationNarrative` to the return:
```typescript
narrativeState: { narrativeSuggestion, isLoadingSuggestion, overrideActive, insightText, locationNarrative },
```

- [ ] **Step 2: Pass locationNarrative through to LocationWindow in HubView**

In `components/views/HubView.tsx`, the `LocationWindow` already receives `location` and `generatedImage`. Add:
```tsx
<LocationWindow
  location={state.dateContext?.location || null}
  generatedImage={state.dateContext?.generatedImage}
  narrativeText={narrativeState.locationNarrative}
/>
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add hooks/useNarrativeFlow.ts components/views/HubView.tsx components/LocationWindow.tsx
git commit -m "feat: Wire location evolution — narrated scene transitions every 3 rounds"
```

---

## Chunk 5: Shared Playlist Activity

### Task 13: Add generatePlaylistSongs to geminiService

**Files:**
- Modify: `services/geminiService.ts`

- [ ] **Step 1: Add the function**

Follow the `generateTwoTruthsOneLie` pattern:

```typescript
export const generatePlaylistSongs = async (
  userPersona: PersonaState,
  partnerPersona: PersonaState,
  vibe: VibeStats,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<PlaylistData> => {
  const dominant = getDominantVibe(vibe);
  const location = dateContext?.location?.title || 'a night out';
  const partnerTraits = partnerPersona.traits.join(', ') || 'mysterious';
  const userTraits = userPersona.traits.join(', ') || 'unknown';
  const recentTopics = conversationLog.slice(-5).map(e => e.category).join(', ');

  const prompt = `Generate a playlist of 8 songs for a date night. The setting: ${location}. The mood is ${dominant}. Partner traits: ${partnerTraits}. Host traits: ${userTraits}. Recent conversation topics: ${recentTopics || 'getting to know each other'}.

Mix genres. Include recognizable songs that evoke emotion. Each song should feel intentional, not random.

Return JSON array of exactly 8 objects: [{"title": "Song Name", "artist": "Artist Name", "vibe": "one-word mood descriptor"}]`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    const songs = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    if (Array.isArray(songs) && songs.length >= 6) {
      return { songs: songs.slice(0, 8) };
    }
    throw new Error('Invalid song array');
  } catch {
    // Fallback playlist
    return {
      songs: [
        { title: 'Wicked Game', artist: 'Chris Isaak', vibe: 'longing' },
        { title: 'Kiss of Life', artist: 'Sade', vibe: 'smooth' },
        { title: 'Slow Dancing in a Burning Room', artist: 'John Mayer', vibe: 'bittersweet' },
        { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', vibe: 'tension' },
        { title: 'Love on the Brain', artist: 'Rihanna', vibe: 'raw' },
        { title: 'The Night We Met', artist: 'Lord Huron', vibe: 'nostalgic' },
        { title: 'Earned It', artist: 'The Weeknd', vibe: 'dark' },
        { title: 'Something', artist: 'The Beatles', vibe: 'timeless' },
      ]
    };
  }
};
```

Import `PlaylistData` from types.

- [ ] **Step 2: Commit**

```bash
git add services/geminiService.ts
git commit -m "feat: Add generatePlaylistSongs Gemini function with fallback playlist"
```

---

### Task 14: Add playlist handling to useAiActions + networking

**Files:**
- Modify: `hooks/useAiActions.ts`
- Modify: `hooks/useBroadcastingState.ts`
- Modify: `hooks/useNetworkSync.ts`
- Modify: `hooks/useSessionState.ts`

- [ ] **Step 1: Add playlist branch to handleActivitySelect**

In `useAiActions.ts`, inside `handleActivitySelect`, add after the `finishSentence` branch (~line 124):

```typescript
} else if (activityId === 'playlist') {
  const data = await generatePlaylistSongs(
    s.userPersona, s.partnerPersona, s.vibe,
    s.conversationLog, s.dateContext, getPromptContext()
  );
  setPlaylistData(data);
  setPlaylistChoices({});
  a.setView('playlist');
  a.broadcastActivityData({ type: 'playlist', data });
```

In the activity callback registration (`useEffect` at line 44), add playlist handling:
```typescript
if (payload.type === 'playlist') {
  setPlaylistData(payload.data);
  setPlaylistChoices({});
  a.setView('playlist', false);
}
```

Add a `submitPlaylistChoice` function:
```typescript
const submitPlaylistChoice = (choices: number[]) => {
  const selfId = a.getSelf()?.id;
  if (!selfId) return;
  setPlaylistChoices(prev => ({ ...prev, [selfId]: choices }));
  a.broadcastPlaylistChoice(selfId, choices);
};
```

Add a `handlePlaylistComplete` function:
```typescript
const handlePlaylistComplete = (matchCount: number) => {
  const labels = ['Different wavelengths', 'Found common ground', 'Tuned in', 'Same frequency'];
  a.triggerFlash(labels[Math.min(matchCount, 3)]);
  if (matchCount >= 2) {
    a.setVibe(v => ({ ...v, comfortable: Math.min(100, v.comfortable + 10), flirty: Math.min(100, v.flirty + 5) }));
  }
  setTimeout(() => a.setView('hub'), 2000);
};
```

Extract `playlistData`, `playlistChoices`, `setPlaylistData`, `setPlaylistChoices` from `useAiStore()`.

Return `submitPlaylistChoice`, `handlePlaylistComplete` in aiActions, and `playlistData`, `playlistChoices` in aiState.

- [ ] **Step 2: Add broadcastPlaylistChoice to useBroadcastingState**

```typescript
const broadcastPlaylistChoice = useCallback((userId: string, choices: number[]) => {
  p2p.send({ type: 'SYNC_PLAYLIST_CHOICE', payload: { userId, choices } });
}, []);
```

Add to return and expose in useSessionState actions.

- [ ] **Step 3: Add SYNC_PLAYLIST_CHOICE handler to useNetworkSync**

In `createSyncHandlers`:
```typescript
SYNC_PLAYLIST_CHOICE: (payload: { userId: string; choices: number[] }) => {
  if (activityCallbacksRef.current.onPlaylistChoice) {
    activityCallbacksRef.current.onPlaylistChoice(payload);
  }
},
```

Extend `registerActivityCallbacks` to accept `onPlaylistChoice` callback. Or simpler: handle directly by updating the store in the callback.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useAiActions.ts hooks/useBroadcastingState.ts hooks/useNetworkSync.ts hooks/useSessionState.ts
git commit -m "feat: Wire playlist activity — generation, sync, and completion handling"
```

---

### Task 15: Create PlaylistView component

**Files:**
- Create: `components/views/PlaylistView.tsx`

- [ ] **Step 1: Build the view**

Follow the TwoTruthsView pattern. Key differences:
- Both players pick 3 from 8 songs (multi-select toggle)
- Submit button appears when exactly 3 are selected
- Reveal shows all 8 songs, highlighting matches
- Match count determines result text

The component should:
1. Get `playlistData` and `playlistChoices` from `useSession()`
2. Track local selection as `Set<number>`, toggle on tap
3. Show a "Lock In" button when `selection.size === 3`
4. On submit, call `aiActions.submitPlaylistChoice([...selection])`
5. Wait for partner's choices (same pattern as other activities)
6. Reveal: iterate songs, show who picked what, highlight matches

Song card design: each song shows `title · artist` with the `vibe` tag. Selected songs get a rose border. Matched songs in reveal get a special gold/amber treatment.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/views/PlaylistView.tsx
git commit -m "feat: Create PlaylistView with multi-select, sync, and reveal animation"
```

---

### Task 16: Mount PlaylistView in App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add lazy import and route**

Add lazy import:
```typescript
const PlaylistView = lazy(() => import('./components/views/PlaylistView').then(m => ({ default: m.PlaylistView })));
```

Add route in the AnimatePresence block:
```tsx
{s.view === 'playlist' && aiState.playlistData && s.isSynced && (
  <PlaylistView />
)}
```

Where `aiState` comes from `useSession()`.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: Mount PlaylistView in App router"
```

---

## Chunk 6: End-of-Night Letter + Post-Date Text

### Task 17: Add generateEndOfNightLetter and generateFollowUpText to geminiService

**Files:**
- Modify: `services/geminiService.ts`

- [ ] **Step 1: Add both functions**

```typescript
export const generateEndOfNightLetter = async (
  vibe: VibeStats,
  partnerPersona: PersonaState,
  rating: number,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<LetterData> => {
  const partnerName = promptContext?.profile?.name || 'your date';
  const location = dateContext?.location?.title || 'tonight';
  const highlights = conversationLog.slice(-8).map(e => `"${e.answer}"`).join(', ');
  const dominant = getDominantVibe(vibe);

  const prompt = `Write a short letter about tonight's date as if you're a close, perceptive friend who watched the whole evening. Address it to "You" (the host). Reference specific moments from the conversation highlights below. Tone: warm but sharp, like a friend who sees through both of you. Max 100 words.

PARTNER: ${partnerName}
LOCATION: ${location}
MOOD: ${dominant} (chemistry ${partnerPersona.chemistry}%)
RATING: ${rating}/10
CONVERSATION HIGHLIGHTS: ${highlights || 'a night of discovery'}
PARTNER TRAITS: ${partnerPersona.traits.join(', ') || 'still emerging'}

Respond as JSON: {"salutation": "short greeting (2-3 words)", "body": "the letter text", "signoff": "short sign-off (1-3 words)"}`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return { salutation: 'Tonight', body: 'The words escaped before the ink could catch them.', signoff: '—' };
  }
};

export const generateFollowUpText = async (
  partnerPersona: PersonaState,
  conversationLog: ConversationEntry[],
  vibe: VibeStats,
  rating: number,
  letterBody: string,
  promptContext?: PromptContext | null
): Promise<string> => {
  const partnerName = promptContext?.profile?.name || 'them';
  const highlights = conversationLog.slice(-5).map(e =>
    `Q: "${e.questionText}" A: "${e.answer}"`
  ).join('\n');

  const prompt = `Write ONE follow-up text message to send after a date. It should reference a specific moment from the conversation — not be generic. 1-2 sentences, SMS length (under 200 chars). Match the tone of this letter that was just written about the night: "${letterBody}"

PARTNER: ${partnerName}
CHEMISTRY: ${partnerPersona.chemistry}%
RATING: ${rating}/10
KEY MOMENTS:
${highlights || 'a memorable evening'}

Respond with ONLY the text message. No quotes, no preamble, no explanation.`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    return text.trim().slice(0, 280);
  } catch {
    return 'I had a great time tonight.';
  }
};
```

Import `LetterData` from types.

- [ ] **Step 2: Commit**

```bash
git add services/geminiService.ts
git commit -m "feat: Add generateEndOfNightLetter and generateFollowUpText Gemini functions"
```

---

### Task 18: Modify finalizeReport to generate letter + text in parallel

**Files:**
- Modify: `hooks/useAiActions.ts`

- [ ] **Step 1: Update finalizeReport**

Replace the single `generateIntelligenceReport` call with parallel generation. The letter must resolve before text (text uses letter body for tone). Report is independent.

```typescript
const finalizeReport = async (rating: number) => {
  a.triggerFlash("Compiling Final Dossier...");
  // ... existing context gathering code stays the same ...

  try {
    // Report in parallel with letter→text chain
    const [report, letterAndText] = await Promise.all([
      generateIntelligenceReport(s.vibe, s.partnerPersona, rating, s.dateContext, getPromptContext()),
      (async () => {
        const letter = await generateEndOfNightLetter(
          s.vibe, s.partnerPersona, rating, s.conversationLog, s.dateContext, getPromptContext()
        );
        const text = await generateFollowUpText(
          s.partnerPersona, s.conversationLog, s.vibe, rating, letter.body, getPromptContext()
        );
        return { letter, text };
      })(),
    ]);

    report.caseNumber = `TNT-${Date.now().toString(36).toUpperCase()}`;
    setIntelligenceReport(report);
    setLetterData(letterAndText.letter);
    setFollowUpText(letterAndText.text);
    saveHistory(report);
    return true;
  } catch (error) {
    // ... existing fallback stays the same, plus fallbacks for letter/text ...
    setLetterData({ salutation: 'Tonight', body: 'The words escaped before the ink could catch them.', signoff: '—' });
    setFollowUpText('I had a great time tonight.');
    // ... rest of existing error handling ...
  }
};
```

Extract `setLetterData`, `setFollowUpText` from `useAiStore()` at the top.

- [ ] **Step 2: Return new state in aiState**

Add to the return:
```typescript
aiState: {
  intelligenceReport, currentScene: s.currentScene,
  twoTruthsData, finishSentenceData, activityChoices,
  playlistData, playlistChoices,
  letterData, followUpText,
},
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useAiActions.ts
git commit -m "feat: Generate letter + follow-up text in parallel with intelligence report"
```

---

### Task 19: Create LetterView component

**Files:**
- Create: `components/LetterView.tsx`

- [ ] **Step 1: Build the view**

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { LetterData } from '../types';
import { PAGE_VARIANTS } from '../constants';

interface LetterViewProps {
  letter: LetterData;
  onContinue: () => void;
}

export const LetterView: React.FC<LetterViewProps> = ({ letter, onContinue }) => {
  const copyToClipboard = () => {
    const text = `${letter.salutation}\n\n${letter.body}\n\n${letter.signoff}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      key="letter"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[80vh] px-6"
    >
      <div className="max-w-sm w-full">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="p-10 bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-rose-500/60 font-black mb-6">{letter.salutation}</p>
          <p className="text-lg font-serif italic text-white/80 leading-relaxed whitespace-pre-line">{letter.body}</p>
          <p className="text-sm font-serif italic text-white/40 mt-8 text-right">{letter.signoff}</p>
        </motion.div>

        <div className="flex flex-col gap-4 mt-10">
          <button
            onClick={copyToClipboard}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            Copy Letter
          </button>
          <button
            onClick={onContinue}
            className="w-full py-4 bg-rose-600 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white hover:bg-rose-500 transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)]"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/LetterView.tsx
git commit -m "feat: Create LetterView with handwritten-style letter display"
```

---

### Task 20: Create TextSuggestionView component

**Files:**
- Create: `components/TextSuggestionView.tsx`

- [ ] **Step 1: Build the view**

```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../constants';

interface TextSuggestionViewProps {
  text: string;
  onEndSession: () => void;
}

export const TextSuggestionView: React.FC<TextSuggestionViewProps> = ({ text, onEndSession }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      key="text-suggestion"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[80vh] px-6"
    >
      <div className="max-w-sm w-full flex flex-col items-center gap-10">
        <div className="text-center">
          <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">Send This</span>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Tomorrow. Or tonight. You'll know.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="w-full"
        >
          <div className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-3xl rounded-bl-lg shadow-2xl">
            <p className="text-base text-white/90 leading-relaxed">{text}</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleCopy}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            {copied ? 'Copied' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onEndSession}
            className="w-full py-4 bg-rose-600 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white hover:bg-rose-500 transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)]"
          >
            End Session
          </button>
        </div>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/TextSuggestionView.tsx
git commit -m "feat: Create TextSuggestionView with copy-to-clipboard and end session"
```

---

### Task 21: Wire end-of-session flow in App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add post-report flow state and views**

Add state to track the post-report flow:
```typescript
const [postReportPhase, setPostReportPhase] = useState<'briefing' | 'letter' | 'text' | null>(null);
```

Modify the `onFinalize` handler for RatingView to set the phase:
```typescript
onFinalize={async (n) => { if(await aa.finalizeReport(n)) setPostReportPhase('briefing'); }}
```

Modify IntelligenceBriefing's `onClose` to advance to letter:
```typescript
<IntelligenceBriefing
  report={as.intelligenceReport}
  isOpen={postReportPhase === 'briefing'}
  onClose={() => {
    if (as.letterData) setPostReportPhase('letter');
    else if (as.followUpText) setPostReportPhase('text');
    else { setPostReportPhase(null); }
  }}
/>
```

Add LetterView and TextSuggestionView (lazy imported):
```tsx
{postReportPhase === 'letter' && as.letterData && (
  <LetterView
    letter={as.letterData}
    onContinue={() => {
      if (as.followUpText) setPostReportPhase('text');
      else setPostReportPhase(null);
    }}
  />
)}

{postReportPhase === 'text' && as.followUpText && (
  <TextSuggestionView
    text={as.followUpText}
    onEndSession={() => { setPostReportPhase(null); a.clearSession(); }}
  />
)}
```

Add lazy imports at top:
```typescript
const LetterView = lazy(() => import('./components/LetterView').then(m => ({ default: m.LetterView })));
const TextSuggestionView = lazy(() => import('./components/TextSuggestionView').then(m => ({ default: m.TextSuggestionView })));
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Test end-to-end flow manually**

Start the app, play through a short session, rate, and verify:
1. Intelligence Briefing opens
2. Closing it shows the Letter
3. "Continue" from letter shows the Text Suggestion
4. "End Session" clears the session

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: Wire end-of-session flow — briefing → letter → text suggestion → end"
```

---

## Chunk 7: Final Integration + SessionContext

### Task 22: Update SessionContext to expose new state and actions

**Files:**
- Modify: `context/SessionContext.tsx`

- [ ] **Step 1: Ensure all new aiState and aiActions are forwarded**

The `SessionContext` composes `useSessionState` + `useQuestionFlow` + `useAiActions` + `useNarrativeFlow`. The new fields (`playlistData`, `playlistChoices`, `letterData`, `followUpText`, `insightText`, `locationNarrative`) and actions (`submitPlaylistChoice`, `handlePlaylistComplete`, `clearInsight`) need to flow through.

Check that `useSession()` returns them. If `aiState` and `narrativeState` are already spread into the context value, this may work automatically. If not, add the missing fields.

- [ ] **Step 2: Add 'playlist' to AppView type if needed**

Check `types.ts` for `AppView` type. If it's a string union, add `'playlist'`:
```typescript
export type AppView = 'setup' | 'hub' | 'question' | 'rating' | 'activity' | 'twoTruths' | 'finishSentence' | 'loading' | 'onboarding' | 'playlist';
```

- [ ] **Step 3: Full type check + manual test**

Run: `npx tsc --noEmit`

Then: `npm run dev` and test each feature:
- Whisper: tilt phone (or simulate with DevTools override)
- Insight: play to round 4+, return to hub
- Playlist: select from activity menu
- Letter/text: rate the date and go through the flow

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Final integration — SessionContext, AppView, all features wired"
```

- [ ] **Step 5: Push**

```bash
git push
```
