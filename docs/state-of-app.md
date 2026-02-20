# State of the App

## Initial Architecture (v1)

### Core Concept
"Tonight" is a real-time, two-player social game designed to facilitate deep connection and conversation between a Host and a Guest. It uses a peer-to-peer (P2P) architecture for state synchronization and the Gemini API for generative content (personas, scenes, questions, imagery).

### Key Components

1.  **Session Management (`useSessionState.ts`)**
    *   **"God Hook"**: This single hook manages almost all application state, including:
        *   User identity and presence.
        *   P2P connection status and message handling.
        *   Game loop state (round, vibe, current scene).
        *   AI-generated content (personas, questions).
        *   UI view state (navigation).
    *   **P2P Sync**: Uses `peerjs` to establish a data channel. State updates are broadcast via `p2p.send()` calls within setter functions.
    *   **Persistence**: Saves session metadata to `localStorage` to allow reconnection.

2.  **AI Services (`geminiService.ts`)**
    *   Handles all interactions with the Google Gemini API.
    *   **Generative Tasks**:
        *   `generateScene`: Creates narrative scenarios based on current "vibe" and user choices.
        *   `generateAbstractAvatar`: Creates visual representations of users based on traits.
        *   `generateTwoTruthsOneLie` / `generateFinishSentence`: Generates content for specific mini-games.
        *   `analyzeUserPhotoForAvatar`: extracting traits from uploaded photos.
    *   **Prompt Engineering**: Prompts are currently embedded directly within the service functions as template strings.

3.  **UI Architecture**
    *   **View-Based Routing**: `App.tsx` conditionally renders full-screen views (`SetupView`, `HubView`, `ActivityView`, etc.) based on `session.view`.
    *   **Component Composition**: Heavy use of prop drilling to pass `session`, `actions`, and `aiActions` down to leaf components.
    *   **Styling**: Tailwind CSS for styling, with Framer Motion for transitions and animations.

4.  **Data Flow**
    *   **Action**: User interacts (e.g., clicks a choice).
    *   **State Update**: `useSessionState` updates local state.
    *   **Broadcast**: `p2p.send()` transmits the update to the peer.
    *   **Sync**: Peer receives message, `useSessionState` reducer handles it and updates their local state.

### Known Issues / Technical Debt (v1)
*   **Monolithic Hook**: `useSessionState` is too large and complex, mixing network, game, and UI logic.
*   **Prop Drilling**: Passing state/actions through multiple layers of components is cumbersome.
*   **Prompt Coupling**: AI prompts are hardcoded in the service layer, making iteration difficult.
*   **Network Efficiency**: Full state objects are sometimes sent when only partial updates are needed.

---

## Refactoring Log

### Phase 1: Architecture Cleanup & Optimization

#### 1. Decompose `useSessionState`
*   **Goal**: Split the monolithic hook into smaller, focused hooks.
*   **Changes**:
    *   [x] Create `useNetworkSync` to handle P2P plumbing.
    *   [ ] Create `useGameState` for core game loop logic.
    *   [ ] Create `usePresence` for user/avatar management.
    *   [ ] Integrate these back into a cleaner `useSession` or Context provider.

#### 2. Decouple AI Prompts
*   **Goal**: Move prompt templates out of `geminiService.ts`.
*   **Changes**:
    *   [x] Create `services/prompts/` directory.
    *   [x] Extract prompt builder functions.
    *   [x] Update `geminiService.ts` to use these builders.

#### 3. Implement Context API
*   **Goal**: Eliminate prop drilling.
*   **Changes**:
    *   [x] Create `SessionContext`.
    *   [x] Wrap `App.tsx` with `SessionProvider`.
    *   [x] Update components to consume context directly.

#### 4. Optimize P2P Payloads
*   **Goal**: Reduce network traffic.
*   **Changes**:
    *   [ ] Implement delta updates for state synchronization.
    *   [ ] Optimize image transmission (compression, caching).
