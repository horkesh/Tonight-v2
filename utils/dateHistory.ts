import type { IntelligenceReport, VibeStats, ConversationEntry } from '../types';
import { VULNERABLE_CATEGORIES } from '../constants';

const HISTORY_KEY = 'tonight_history';
const MAX_ENTRIES = 10;

export interface DateHistoryEntry {
  id: string;
  timestamp: number;
  partnerName: string;
  profileId?: string;
  location: string;
  vibe: VibeStats;
  chemistry: number;
  headline: string;
  summary: string;
  rating: number | null;
  highlights?: string[];
  partnerAvatar?: string | null;
}

export function saveDateToHistory(entry: Omit<DateHistoryEntry, 'id' | 'timestamp'>): void {
  const history = getDateHistory();
  const newEntry: DateHistoryEntry = {
    ...entry,
    id: `date-${Date.now()}`,
    timestamp: Date.now(),
  };

  // Ring buffer: keep last MAX_ENTRIES
  history.unshift(newEntry);
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save date history:', e);
  }
}

export function getDateHistory(): DateHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DateHistoryEntry[];
  } catch {
    return [];
  }
}

export function buildHistoryEntry(
  report: IntelligenceReport,
  opts: {
    partnerName: string;
    location: string;
    vibe: VibeStats;
    chemistry: number;
    profileId?: string;
    highlights?: string[];
    partnerAvatar?: string | null;
  }
): Omit<DateHistoryEntry, 'id' | 'timestamp'> {
  return {
    partnerName: opts.partnerName,
    profileId: opts.profileId,
    location: opts.location,
    vibe: opts.vibe,
    chemistry: opts.chemistry,
    headline: report.headline,
    summary: report.summary,
    rating: report.partnerRating ?? null,
    highlights: opts.highlights,
    partnerAvatar: opts.partnerAvatar,
  };
}

/**
 * Extract conversation highlights — the most revealing/vulnerable moments from a date.
 */
export function extractHighlights(conversationLog: ConversationEntry[]): string[] {
  return conversationLog
    .filter(e => (VULNERABLE_CATEGORIES as readonly string[]).includes(e.category) && e.answer !== '[Refused — took a sip instead]')
    .slice(-5)
    .map(e => `"${e.questionText}" → "${e.answer}"`);
}

export function getHistoryForProfile(profileId: string): DateHistoryEntry[] {
  return getDateHistory().filter((h) => h.profileId === profileId);
}

export function getDateNumber(profileId: string): number {
  return getHistoryForProfile(profileId).length + 1;
}
