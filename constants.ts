
import { VibeStats, DateVibe, DateLocation } from "./types";

export const INITIAL_VIBE: VibeStats = {
  playful: 0,
  flirty: 0,
  deep: 0,
  comfortable: 0,
};

export const DATE_VIBES: DateVibe[] = [
  {
    id: 'electric',
    title: 'Electric Tension',
    description: 'High stakes, fast heartbeat, undeniable chemistry.',
    icon: '⚡',
    promptModifier: 'High sexual tension, fast-paced banter, electric atmosphere.'
  },
  {
    id: 'noir',
    title: 'Midnight Noir',
    description: 'Shadows, secrets, and sophisticated mystery.',
    icon: '🕵️',
    promptModifier: 'Cinematic noir, mysterious, slow-burn, shadows and smoke.'
  },
  {
    id: 'cozy',
    title: 'Deep & Intimate',
    description: 'Guards down, soul-baring comfort.',
    icon: '🧸',
    promptModifier: 'Warm, vulnerable, deeply personal, safe but intense.'
  },
  {
    id: 'playful',
    title: 'Witty Sparring',
    description: 'Intellectual challenge and teasing laughter.',
    icon: '🧠',
    promptModifier: 'Intellectual, witty, teasing, competitive, lighthearted.'
  },
  {
    id: 'elegant',
    title: 'Velvet Elegance',
    description: 'Classy, slow, and undeniably expensive.',
    icon: '🥂',
    promptModifier: 'Sophisticated, expensive, polite but charged, slow tempo.'
  }
];

export const DATE_LOCATIONS: DateLocation[] = [
  {
    id: 'lounge',
    title: 'Velvet Jazz Lounge',
    description: 'Dim lighting, saxophone in the distance, stiff drinks.',
    icon: 'sax',
    environmentPrompt: 'A dimly lit jazz lounge with velvet booths and smoke in the air.'
  },
  {
    id: 'rooftop',
    title: 'Private Rooftop',
    description: 'Wind in hair, city lights below, feeling infinite.',
    icon: 'city',
    environmentPrompt: 'A private rooftop garden overlooking a glowing metropolis at midnight.'
  },
  {
    id: 'study',
    title: 'The Library',
    description: 'Crackling fire, smell of old books and whiskey.',
    icon: 'book',
    environmentPrompt: 'An antique library with a fireplace, leather chairs, and rain against the window.'
  },
  {
    id: 'beach',
    title: 'Midnight Coast',
    description: 'Sound of waves, moon reflection, isolation.',
    icon: 'wave',
    environmentPrompt: 'A secluded beach at night, only lit by the moon and distant stars.'
  },
  {
    id: 'car',
    title: 'Parked Car',
    description: 'Rain on the windshield, dashboard glow, proximity.',
    icon: 'car',
    environmentPrompt: 'Inside a parked luxury car watching the rain, dashboard lights glowing, intimate proximity.'
  }
];

export const ACTIVITIES = [
  {
    id: 'Standard',
    title: 'Conversation',
    description: 'Exchange words in the quiet of the night.',
    icon: '🌙'
  },
  {
    id: 'truth',
    title: 'Truth or Drink',
    description: 'Raw investigative roots vs sophisticated spin.',
    icon: '🥃'
  },
  {
    id: 'narrative',
    title: 'Noir Narration',
    description: 'Co-write the story of this encounter.',
    icon: '🖋️'
  }
];

export const TRUTH_SEEDS = [
    "What is the one text you drafted to an ex but never sent?",
    "Rank your past three partners by intelligence.",
    "What is a secret you are currently keeping from your family?",
    "When was the last time you lied to get out of an intimacy?",
    "Who do you think is the better kisser between us, based on vibes alone?",
    "What is the most shallow reason you broke up with someone?",
    "Have you ever stalked someone online after a breakup?",
    "What is your biggest regret from your 20s?",
    "If you could sleep with one celebrity, but your partner would know, would you?",
    "What is the meanest thing you've ever said to someone you love?",
    "Have you ever emotionally cheated?",
    "What is a fantasy you are too embarrassed to say out loud?"
];

export const TWIST_SEEDS = [
    "A sudden, heavy storm knocks out the power, plunging the scene into darkness.",
    "You hear a key turning in the front door lock downstairs.",
    "An unknown number calls a phone on the table.",
    "You accidentally knock over your wine glass, staining the pristine rug.",
    "A notification pops up on the screen: 'I know what you're doing.'",
    "One partner suddenly realizes they recognize the other from a past life/event.",
    "A child starts crying in the background, breaking the illusion.",
    "The wifi cuts out for 10 seconds, leaving a frozen, awkward frame.",
    "A siren wails loudly outside, getting closer.",
    "One partner drops the facade and speaks in their 'real' voice for a second."
];

export const NARRATIVE_SEEDS = [
    "The silence stretches too long, becoming heavy with unsaid things.",
    "You notice a small scar on their face you hadn't seen before.",
    "The bottle of wine is suddenly empty, marking a transition.",
    "The lighting shifts as a cloud passes over the moon outside.",
    "You catch them looking at you with genuine sadness for a split second.",
    "The conversation drifts to the concept of 'fate' vs 'chaos'.",
    "A challenge to a staring contest breaks the tension.",
    "The topic of 'first loves' arises naturally.",
    "You both realize you are tired of the 'game' and want something real.",
    "They ask about your dreams, acting like a journalist."
];

export const SYSTEM_INSTRUCTION = `
You are the architect of a premium late-night experience called "Tonight". 
Context: Two adults are on a synchronized virtual date.
Tone: Cinematic, Intimate, Reactive. 

Guidelines:
- Generate content that facilitates connection, flirtation, and vulnerability.
- Do not use explicit sexual language (keep it PG-13 but high tension).
- Be witty, dry, and observational.
- Always assume an atmosphere of late-night intimacy and slight intoxication.

Rule: When generating choices, provide EXACTLY 3 distinct options unless specified otherwise.
Rule: Narrative must be pithy—max 12 words.
`;

export const PAGE_VARIANTS = {
  initial: { opacity: 0, filter: 'blur(12px)', scale: 1.05 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
  exit: { opacity: 0, filter: 'blur(12px)', scale: 0.95, transition: { duration: 0.6, ease: "easeIn" as const } }
};
