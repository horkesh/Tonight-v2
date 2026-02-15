
# Tonight | Future Feature Roadmap

## Cinematic & Sensory Enhancements

### 1. Typographic "Intoxication" (Visual Haze)
*   **Concept:** As the `drunkFactor` rises (3+), the AI’s text generation should visually "slur" slightly.
*   **Execution:**
    *   Increase character spacing (`tracking`) randomly on specific words.
    *   Use a slight CSS skew (`transform: skewX(-2deg)`) on the text container.
    *   **The "Double Vision" Effect:** At max haze, duplicate the text layer, lower the opacity to 30%, tint it cyan/red (chromatic aberration), and offset it by 2px.

### 2. The "Pour" Gesture (Gyroscope)
*   **Concept:** Turn the phone into a physical prop (the glass).
*   **Execution:**
    *   Use `DeviceOrientationEvent`.
    *   Tilt phone back > 45° to "drink" (trigger sip animation).
    *   Tilt phone forward to "refill".
    *   Replace tap interactions for "Sip" with this gesture for higher immersion.

### 3. Audio: Dynamic "Heartbeat" Stems
*   **Concept:** Background audio tracking "Intimacy/Tension" via rhythmic entrainment.
*   **Execution:**
    *   Introduce a subtle, low-frequency "heartbeat" thrum (~60bpm).
    *   **Flirty > 70%:** Heartbeat speeds up (90bpm) and increases volume.
    *   **Deep > 70%:** Heartbeat slows (50bpm) and becomes bass-heavy (comfort).
    *   **Silence:** If no user action for 20s, introduce high-pitched string tension.

### 4. The "Glance Away" Detection
*   **Concept:** Eye contact simulator using the camera stream.
*   **Execution:**
    *   Detect if the user looks away from the screen for > 5 seconds.
    *   Berina pauses "typing" or narration.
    *   On return, trigger flash message: *"Lost you for a second there..."* or *"Am I boring you?"*

### 5. "Last Call" Mechanic (Narrative Closure)
*   **Concept:** A definitive, cinematic ending to prevent infinite loops.
*   **Execution:**
    *   Triggered by high `round` count or max `drunkFactor`.
    *   UI dims significantly. Audio shifts to muffled "end of night" tone.
    *   **Binary Choice:**
        1.  **"Call the cab"** (End Session & Generate Report).
        2.  **"One last glass"** (High risk question, huge vibe impact, increases Haze).

### 6. The "Under the Table" Channel
*   **Concept:** Noir subtext—what is said vs. what is meant.
*   **Execution:**
    *   **Long-press** a choice to "Think" it instead of "Say" it.
    *   Updates `Vibe` and `Secrets` state without advancing dialogue text aloud.
    *   Berina reacts to the *silence*, acknowledging the shift in tension.

### 7. Haptic Text Rendering
*   **Concept:** Text should have weight and rhythm.
*   **Execution:**
    *   Trigger extremely light haptic feedback (taptic engine) with every *word* that appears during AI streaming.
    *   Makes reading feel physical and intimate.

## Sensory & Haptic Immersion (The "Physicality" Update)
*   **Parallax "Depth" Layers:** Use the gyroscope (`deviceorientation`) to slightly offset the background blobs, the avatar card, and the UI elements.
*   **Liquid Physics:** Canvas-based fluid simulation for Sip Tracker that reacts to phone tilt.
*   **Haptic Syntax:** Distinct vibration patterns for different vibe shifts (Witty vs Deep).

## The "Drunk" UI Mechanic (Ludonarrative Harmony)
*   **Input Drift:** At high haze, apply wandering XY transform to Choice Buttons.
*   **Typo Injection:** Inject synthetic typos in Shared Draft/Avatar Editor that require backspacing.
*   **Tunnel Vision:** Vignette effect darkening edges at max intoxication.

## Connection Resilience
*   **State "Heartbeat" & Reconciliation:** Periodic hash checks to ensure P2P sync.
*   **Graceful "Reconnecting" UI:** Narrative-driven "Signal Lost" screen instead of generic errors.

## Audio-Reactive Atmosphere
*   **Keyword Triggers:** Dynamic foley (rain, wind) based on AI narrative keywords.
*   **Silence Detection:** Fade music during long inactivity to create "Uncomfortable Silence".

## Artifacts (Post-Date Experience)
*   **The Receipt:** Visual "Bar Tab" listing emotional items consumed (e.g., "1x Deep Confession").
*   **Photo Booth Strip:** Vertical stitch of reaction images and camera captures.
