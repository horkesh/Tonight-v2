# Implementation Plan

Based on the current state of the app and the refactoring log in `docs/state-of-app.md`, here is the detailed plan to complete the architectural improvements.

## App Suggestions & Planning

Based on the current state of the app, here are some suggestions for improvements:

### 1. Network & Connectivity
*   **TURN Server Fallback**: You are using peerjs for the real-time connection. By default, PeerJS uses public STUN servers, which will fail if either user is on a strict NAT or certain cellular networks. Since you are deploying on Google Cloud, you can deploy a **Coturn** instance on a Compute Engine VM and pass its credentials via environment variables (`VITE_TURN_SERVER_URL`, `VITE_TURN_SERVER_USER`, `VITE_TURN_SERVER_PASSWORD`) in `p2p.ts` to ensure the date doesn't abruptly drop.
*   **Reconnection Logic**: Enhance the reconnection logic to handle brief network interruptions more gracefully without resetting the session state.

### 2. User Experience
*   **Audio/Video Quality**: Implement dynamic quality adjustment based on network conditions to prevent lag or dropped frames.
*   **Accessibility**: Add ARIA labels and keyboard navigation support to all interactive elements, especially custom UI components like the ActionDock and ReactionPicker.

### 3. Architecture
*   **[COMPLETED] State Management**: Consider moving complex state logic out of React context and into a dedicated state management library (like Zustand or Redux) if the app continues to grow. *(Implemented Zustand stores for GameState and Presence)*
*   **[COMPLETED] Asset Loading**: Preload critical assets (images, sounds) to ensure smooth transitions between views. *(Implemented `useAssetLoader` for images)*

## Phase 1: Hook Decomposition (Remaining Items)

The goal is to finish breaking down the monolithic `useSessionState` into focused domain-specific hooks. `useNetworkSync` and `usePersonaLogic` are already implemented.

### 1.1 Create `useGameState` [COMPLETED]
*   **Responsibility**: Manage the core game loop, rounds, scenes, and choices.
*   **State to Extract**:
    *   `round`
    *   `currentScene`
    *   `sceneChoices`
    *   `activeQuestion`
    *   `questionOwnerId`
    *   `vibe` (and vibe updating logic)
    *   `dateContext`
    *   `conversationLog`
*   **Actions to Extract**:
    *   `setRound`, `setCurrentScene`, `submitSceneChoice`, `setQuestionState`, `setVibe`, `setDateContext`, `setConversationLog`.
*   **File**: `src/hooks/useGameState.ts`

### 1.2 Create `usePresence` [COMPLETED]
*   **Responsibility**: Manage user identity, presence status, and high-level persona coordination.
*   **State to Extract**:
    *   `users`
    *   `userPersona` (wrapper around `usePersonaLogic` state if needed, or just coordination)
    *   `partnerPersona`
    *   `guestProfileConfirmed`
    *   `arrivalEvent`
*   **Actions to Extract**:
    *   `setUsers`, `setGuestProfileConfirmed`, `setArrivalEvent`.
*   **File**: `src/hooks/usePresence.ts`

### 1.3 Refactor `useSessionState` [COMPLETED]
*   **Goal**: Transform `useSessionState` into a composition layer that ties `useGameState`, `usePresence`, `useNetworkSync`, and `usePersonaLogic` together.
*   **Task**:
    *   Import the new hooks.
    *   Remove the extracted state and logic from `useSessionState`.
    *   Ensure `useNetworkSync` receives the correct state references from the new hooks.
    *   Expose a unified API via `SessionContext`.

## Phase 2: P2P Optimization

### 2.1 Delta Updates [COMPLETED]
*   **Goal**: Avoid sending the full state object for small changes.
*   **Task**:
    *   Review `useNetworkSync.ts`.
    *   Ensure specific actions (like `setVibe`) only broadcast the `SYNC_VIBE` message, not a full state sync. (This appears to be partially implemented, need to verify coverage).
    *   Implement a `syncDelta` helper if needed.

### 2.2 Image Optimization [COMPLETED]
*   **Goal**: Reduce bandwidth usage for avatar and scene images.
*   **Task**:
    *   Verify `compressImage` usage in `geminiService` and `usePersonaLogic`.
    *   Ensure images are not re-sent unnecessarily in `useNetworkSync`.

## Phase 3: Component Cleanup

### 3.1 Remove Prop Drilling [COMPLETED]
*   **Goal**: Ensure all components consume `SessionContext` directly.
*   **Task**:
    *   Review `App.tsx` and remove props passed to views (`HubView`, `QuestionView`, etc.).
    *   Update Views to use `useSession()` hook.
    *   Update `ActionDock`, `PresenceBar`, and other shared components to use `useSession()`.

### 3.2 Final Verification [COMPLETED]
*   **Task**:
    *   Run `lint_applet` to catch any disconnected props or type errors.
    *   Verify game flow (Setup -> Hub -> Question -> Activity).
