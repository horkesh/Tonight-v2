import type { PromptContext, PartnerProfile, VenueProfile, DateConfig } from '../../types/profiles';
import type { DateHistoryEntry } from '../../utils/dateHistory';
import { getHistoryForProfile } from '../../utils/dateHistory';

const ZODIAC_TRAITS: Record<string, string> = {
  aries: 'bold, competitive, passionate, impatient',
  taurus: 'sensual, loyal, stubborn, comfort-seeking',
  gemini: 'curious, witty, restless, dual-natured',
  cancer: 'nurturing, moody, intuitive, protective',
  leo: 'dramatic, generous, proud, attention-seeking',
  virgo: 'analytical, perfectionist, service-oriented, critical',
  libra: 'charming, indecisive, diplomatic, beauty-loving',
  scorpio: 'intense, secretive, passionate, transformative',
  sagittarius: 'adventurous, philosophical, blunt, freedom-loving',
  capricorn: 'ambitious, disciplined, reserved, traditional',
  aquarius: 'unconventional, humanitarian, detached, visionary',
  pisces: 'empathetic, dreamy, escapist, deeply intuitive',
};

const LOVE_LANGUAGE_LABELS: Record<string, string> = {
  words_of_affirmation: 'Words of Affirmation',
  acts_of_service: 'Acts of Service',
  receiving_gifts: 'Receiving Gifts',
  quality_time: 'Quality Time',
  physical_touch: 'Physical Touch',
};

/**
 * Build a PromptContext from profile store values.
 * Returns null if no active profile is set (legacy/guest mode).
 */
export function buildPromptContext(
  activeProfile: PartnerProfile | null,
  activeVenue: VenueProfile | null,
  activeDateConfig: DateConfig | null
): PromptContext | null {
  if (!activeProfile || !activeDateConfig) return null;

  const history = getHistoryForProfile(activeProfile.id);

  return {
    profile: activeProfile,
    venue: activeVenue,
    config: activeDateConfig,
    dateHistory: history,
  };
}

/**
 * Render a rich text block describing the partner's profile for prompt injection.
 */
export function renderProfileBlock(profile: PartnerProfile): string {
  const parts: string[] = [];

  parts.push(`PARTNER DEEP PROFILE — ${profile.name}:`);

  // Astrology
  if (profile.zodiac) {
    const traits = ZODIAC_TRAITS[profile.zodiac.sign] || '';
    parts.push(`Zodiac: ${profile.zodiac.sign} (${profile.zodiac.element} sign). Personality tendencies: ${traits}.`);
  }

  // Love Language
  if (profile.primaryLoveLanguage) {
    const primary = LOVE_LANGUAGE_LABELS[profile.primaryLoveLanguage] || profile.primaryLoveLanguage;
    const secondary = profile.secondaryLoveLanguage
      ? LOVE_LANGUAGE_LABELS[profile.secondaryLoveLanguage]
      : null;
    parts.push(`Love Language: Primary — ${primary}${secondary ? `, Secondary — ${secondary}` : ''}.`);
  }

  // Personality
  if (profile.personalityTraits.length > 0) {
    parts.push(`Personality: ${profile.personalityTraits.join(', ')}.`);
  }

  // Interests
  if (profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(', ')}.`);
  }

  // Career
  if (profile.job) {
    const feeling = profile.jobFeeling ? ` (${profile.jobFeeling.replace(/_/g, ' ')})` : '';
    parts.push(`Career: ${profile.job}${feeling}.`);
  }
  if (profile.aspiration) {
    parts.push(`Aspiration: ${profile.aspiration}.`);
  }

  // Signature Details
  const sigs: string[] = [];
  if (profile.drink) sigs.push(`Drink: ${profile.drink}`);
  if (profile.dreamDestination) sigs.push(`Dream destination: ${profile.dreamDestination}`);
  if (profile.lovedPlace) sigs.push(`Loved place: ${profile.lovedPlace}`);
  if (profile.definingMedia) sigs.push(`Defining media: ${profile.definingMedia}`);
  if (profile.catchPhrase) sigs.push(`Catch phrase: "${profile.catchPhrase}"`);
  if (profile.friendNickname) sigs.push(`Friends call her: ${profile.friendNickname}`);
  if (sigs.length > 0) {
    parts.push(`Signature Details: ${sigs.join('. ')}.`);
  }

  // What Impresses
  if (profile.impressionFactors.length > 0) {
    parts.push(`What impresses her: ${profile.impressionFactors.join(', ')}.`);
  }

  // Physical Comfort
  if (profile.physicalComfort) {
    parts.push(`Physical comfort level: ${profile.physicalComfort.replace(/_/g, ' ')}.`);
  }

  // Play Style
  if (profile.playStyle) {
    parts.push(`Play style: ${profile.playStyle}.`);
  }

  // Life Situation
  const life: string[] = [];
  if (profile.relationshipHistory && profile.relationshipHistory !== 'prefer_not_say') {
    life.push(`Relationship: ${profile.relationshipHistory.replace(/_/g, ' ')}`);
  }
  if (profile.livingSituation && profile.livingSituation !== 'prefer_not_say') {
    life.push(`Lives: ${profile.livingSituation}`);
  }
  if (life.length > 0) {
    parts.push(`Life situation: ${life.join(', ')}.`);
  }

  return parts.join('\n');
}

/**
 * Render venue atmosphere description.
 */
export function renderVenueBlock(venue: VenueProfile): string {
  const parts: string[] = [];
  parts.push(`VENUE: ${venue.name} — a ${venue.vibe} ${venue.type}`);
  if (venue.settings.length > 0) {
    parts.push(`Atmosphere: ${venue.settings.map(s => s.replace(/_/g, ' ')).join(', ')}`);
  }
  if (venue.neighborhoodFeel) {
    parts.push(`Neighborhood: ${venue.neighborhoodFeel}`);
  }
  if (venue.city) {
    parts.push(`City: ${venue.city}`);
  }
  return parts.join('. ') + '.';
}

/**
 * Render date config directives.
 */
export function renderDateConfigBlock(config: DateConfig): string {
  const parts: string[] = [];

  parts.push(`DATE CONFIG:`);

  const arcLabels: Record<string, string> = {
    slow_burn: 'Slow Burn — gradual intensity buildup, patience rewarded.',
    high_energy: 'High Energy — fast-paced, electric, bold from the start.',
    deep_dive: 'Deep Dive — vulnerability and emotional depth prioritized.',
    ai_reads_room: 'AI Reads the Room — adaptive pacing based on chemistry signals.',
  };
  parts.push(`Arc: ${arcLabels[config.dateArc] || config.dateArc}`);

  if (config.specialOccasion) {
    parts.push(`Special Occasion: ${config.specialOccasion.replace(/_/g, ' ')} — acknowledge this naturally in content.`);
  }

  const comfortLabels: Record<string, string> = {
    safe: 'Keep content safe and light — no heavy topics.',
    can_go_there: 'Can push boundaries — test comfort zones gradually.',
    no_limits: 'Full vulnerability permitted — raw, honest, unfiltered.',
  };
  parts.push(`Comfort: ${comfortLabels[config.comfortLevel] || config.comfortLevel}`);

  if (config.dateNumber > 1) {
    parts.push(`This is date #${config.dateNumber} — they have history. Build on familiarity. Reference past experiences.`);
  }

  return parts.join('\n');
}

/**
 * Hard constraint: topics to never bring up.
 */
export function renderTopicsToAvoidFilter(topics: string[]): string {
  if (topics.length === 0) return '';
  const labels = topics.map(t => t.replace(/_/g, ' '));
  return `HARD CONSTRAINT — NEVER ask about, reference, or allude to: ${labels.join(', ')}. These topics are OFF LIMITS.`;
}

/**
 * Suggestions for what the host wants to reveal naturally.
 */
export function renderHostReveals(config: DateConfig): string {
  const parts: string[] = [];
  if (config.aboutYouForHer) {
    parts.push(`Set up natural openings for the host to reveal: ${config.aboutYouForHer}`);
  }
  if (config.preDateIntel) {
    parts.push(`Pre-date intel (things she mentioned before tonight — create callback moments): ${config.preDateIntel}`);
  }
  if (config.notesForTonight) {
    parts.push(`Special notes for tonight: ${config.notesForTonight}`);
  }
  return parts.length > 0 ? `HOST INTELLIGENCE:\n${parts.join('\n')}` : '';
}

/**
 * Summarize past date history for longitudinal callbacks.
 */
export function renderDateHistoryBlock(history: DateHistoryEntry[]): string {
  if (history.length === 0) return '';

  const header = `OUR STORY SO FAR (${history.length} previous date${history.length > 1 ? 's' : ''}):`;

  const summaries = history.slice(0, 5).map((h, i) => {
    const date = new Date(h.timestamp).toLocaleDateString();
    let entry = `Date ${i + 1} (${date}): ${h.location}. Chemistry: ${h.chemistry}%. "${h.headline}" — ${h.summary}`;
    if (h.highlights && h.highlights.length > 0) {
      entry += `\n  Key moments: ${h.highlights.join(' | ')}`;
    }
    return entry;
  });

  const instructions = `\nThis is a RETURNING partner. Reference specific moments from past dates — "Last time you said...", "Remember when...". Build on established inside jokes and emotional threads. Show that the AI remembers and the connection has continuity.`;

  return `${header}\n${summaries.join('\n')}${instructions}`;
}

/**
 * Compose the full prompt context block for injection into any prompt.
 */
export function renderFullContextBlock(ctx: PromptContext): string {
  const blocks: string[] = [];

  blocks.push(renderProfileBlock(ctx.profile));

  if (ctx.venue) {
    blocks.push(renderVenueBlock(ctx.venue));
  }

  blocks.push(renderDateConfigBlock(ctx.config));

  const avoidFilter = renderTopicsToAvoidFilter(ctx.config.topicsToAvoid);
  if (avoidFilter) blocks.push(avoidFilter);

  const hostReveals = renderHostReveals(ctx.config);
  if (hostReveals) blocks.push(hostReveals);

  const historyBlock = renderDateHistoryBlock(ctx.dateHistory);
  if (historyBlock) blocks.push(historyBlock);

  return blocks.join('\n\n');
}
