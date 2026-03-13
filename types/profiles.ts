import type { DateHistoryEntry } from '../utils/dateHistory';

// ── Union literal types ──────────────────────────────────────────────

export type LoveLanguage =
  | 'words_of_affirmation'
  | 'acts_of_service'
  | 'receiving_gifts'
  | 'quality_time'
  | 'physical_touch';

export type PersonalityTrait =
  | 'adventurous'
  | 'intellectual'
  | 'romantic'
  | 'witty'
  | 'reserved'
  | 'spontaneous'
  | 'nurturing'
  | 'competitive'
  | 'artistic'
  | 'spiritual'
  | 'rebellious'
  | 'stoic';

export type Interest =
  | 'travel'
  | 'cooking'
  | 'music'
  | 'fitness'
  | 'reading'
  | 'art'
  | 'film'
  | 'gaming'
  | 'nature'
  | 'fashion'
  | 'tech'
  | 'writing'
  | 'dance'
  | 'photography'
  | 'wine'
  | 'spirituality'
  | 'psychology'
  | 'politics'
  | 'entrepreneurship';

export type ImpressionFactor =
  | 'humor'
  | 'intelligence'
  | 'confidence'
  | 'vulnerability'
  | 'ambition'
  | 'style'
  | 'kindness'
  | 'mystery'
  | 'passion'
  | 'cultural_knowledge';

export type VenueType =
  | 'bar'
  | 'restaurant'
  | 'cafe'
  | 'lounge'
  | 'rooftop'
  | 'club'
  | 'park'
  | 'home'
  | 'other';

export type VenueSetting =
  | 'loud'
  | 'quiet'
  | 'outdoor'
  | 'candlelit'
  | 'live_music'
  | 'crowded'
  | 'private'
  | 'has_view'
  | 'food'
  | 'drinks';

export type VenueVibe =
  | 'upscale'
  | 'casual'
  | 'intimate'
  | 'energetic'
  | 'chill';

export type NeighborhoodFeel =
  | 'downtown'
  | 'hipster'
  | 'upscale'
  | 'waterfront'
  | 'suburban'
  | 'bohemian';

export type TopicToAvoid =
  | 'exes'
  | 'politics'
  | 'religion'
  | 'money'
  | 'weight'
  | 'family_drama'
  | 'past_trauma'
  | 'children'
  | 'marriage'
  | 'age';

export type SpecialOccasion =
  | 'birthday'
  | 'anniversary'
  | 'first_irl'
  | 'reconnecting'
  | 'making_up'
  | 'just_because';

export type DateArc =
  | 'slow_burn'
  | 'high_energy'
  | 'deep_dive'
  | 'ai_reads_room';

export type ComfortLevel =
  | 'safe'
  | 'can_go_there'
  | 'no_limits';

export type PhysicalComfort =
  | 'no_touch'
  | 'light_touch'
  | 'affectionate'
  | 'very_physical';

export type PlayStyle =
  | 'shy'
  | 'flirty'
  | 'bold'
  | 'chaotic';

export type RelationshipHistory =
  | 'single_long_time'
  | 'recently_single'
  | 'dating_around'
  | 'complicated'
  | 'prefer_not_say';

export type ChildrenStatus =
  | 'none'
  | 'has_children'
  | 'prefer_not_say';

export type LivingSituation =
  | 'alone'
  | 'roommates'
  | 'family'
  | 'prefer_not_say';

export type JobFeeling =
  | 'loves_it'
  | 'its_fine'
  | 'hates_it'
  | 'between_jobs'
  | 'prefer_not_say';

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

// ── Core interfaces ──────────────────────────────────────────────────

export interface ZodiacInfo {
  sign: ZodiacSign;
  element: ZodiacElement;
  compatibleSigns: ZodiacSign[];
}

export interface PartnerProfile {
  id: string;
  createdAt: number;
  updatedAt: number;

  // Identity (required)
  name: string;
  photo: string | null;

  // Identity (optional)
  pronouns: string | null;
  nationality: string | null;
  languages: string[];
  city: string | null;

  // Birthday & Stars
  birthday: string | null; // ISO date string
  zodiac: ZodiacInfo | null;

  // Life Situation
  relationshipHistory: RelationshipHistory | null;
  children: ChildrenStatus | null;
  livingSituation: LivingSituation | null;
  religion: string | null;

  // Career & Ambition
  job: string | null;
  jobFeeling: JobFeeling | null;
  aspiration: string | null;

  // Love Language
  primaryLoveLanguage: LoveLanguage | null;
  secondaryLoveLanguage: LoveLanguage | null;

  // Personality & Interests
  personalityTraits: PersonalityTrait[];
  interests: Interest[];

  // Signature Details
  drink: string | null;
  dreamDestination: string | null;
  lovedPlace: string | null;
  definingMedia: string | null; // book/movie/song
  catchPhrase: string | null;
  friendNickname: string | null;

  // What Impresses (max 3)
  impressionFactors: ImpressionFactor[];

  // Comfort & Play
  physicalComfort: PhysicalComfort | null;
  playStyle: PlayStyle | null;

  // AI-derived from photo analysis
  aiAppearance: string | null;
  aiTraits: string[];
  aiEstimatedAge: string | null;
  aiGender: string | null;
}

export interface VenueProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  type: VenueType;
  vibe: VenueVibe;
  settings: VenueSetting[];
  city: string | null;
  neighborhoodFeel: NeighborhoodFeel | null;
}

export interface DateConfig {
  profileId: string;
  venueId: string | null;
  dateNumber: number;
  dateArc: DateArc;
  specialOccasion: SpecialOccasion | null;
  comfortLevel: ComfortLevel;
  topicsToAvoid: TopicToAvoid[];
  vibes: string[]; // DateVibe ids (1-2)
  aboutYouForHer: string | null;
  preDateIntel: string | null;
  notesForTonight: string | null;
}

export interface PromptContext {
  profile: PartnerProfile;
  venue: VenueProfile | null;
  config: DateConfig;
  dateHistory: DateHistoryEntry[];
}

export interface HostProfile {
  name: string;
  age: number;
  sex: string;
  appearance: string;
  avatarPath: string | null;
}
