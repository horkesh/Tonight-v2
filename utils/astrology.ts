import type { ZodiacSign, ZodiacElement, ZodiacInfo } from '../types/profiles';

export const ZODIAC_ICONS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

interface ZodiacData {
  element: ZodiacElement;
  compatible: ZodiacSign[];
}

const ZODIAC_MAP: Record<ZodiacSign, ZodiacData> = {
  aries:       { element: 'fire',  compatible: ['leo', 'sagittarius', 'gemini', 'aquarius'] },
  taurus:      { element: 'earth', compatible: ['virgo', 'capricorn', 'cancer', 'pisces'] },
  gemini:      { element: 'air',   compatible: ['libra', 'aquarius', 'aries', 'leo'] },
  cancer:      { element: 'water', compatible: ['scorpio', 'pisces', 'taurus', 'virgo'] },
  leo:         { element: 'fire',  compatible: ['aries', 'sagittarius', 'gemini', 'libra'] },
  virgo:       { element: 'earth', compatible: ['taurus', 'capricorn', 'cancer', 'scorpio'] },
  libra:       { element: 'air',   compatible: ['gemini', 'aquarius', 'leo', 'sagittarius'] },
  scorpio:     { element: 'water', compatible: ['cancer', 'pisces', 'virgo', 'capricorn'] },
  sagittarius: { element: 'fire',  compatible: ['aries', 'leo', 'libra', 'aquarius'] },
  capricorn:   { element: 'earth', compatible: ['taurus', 'virgo', 'scorpio', 'pisces'] },
  aquarius:    { element: 'air',   compatible: ['gemini', 'libra', 'aries', 'sagittarius'] },
  pisces:      { element: 'water', compatible: ['cancer', 'scorpio', 'taurus', 'capricorn'] },
};

// Month-day ranges for each sign (month is 1-indexed)
const SIGN_RANGES: { sign: ZodiacSign; startMonth: number; startDay: number }[] = [
  { sign: 'capricorn',   startMonth: 1,  startDay: 1 },
  { sign: 'aquarius',    startMonth: 1,  startDay: 20 },
  { sign: 'pisces',      startMonth: 2,  startDay: 19 },
  { sign: 'aries',       startMonth: 3,  startDay: 21 },
  { sign: 'taurus',      startMonth: 4,  startDay: 20 },
  { sign: 'gemini',      startMonth: 5,  startDay: 21 },
  { sign: 'cancer',      startMonth: 6,  startDay: 21 },
  { sign: 'leo',         startMonth: 7,  startDay: 23 },
  { sign: 'virgo',       startMonth: 8,  startDay: 23 },
  { sign: 'libra',       startMonth: 9,  startDay: 23 },
  { sign: 'scorpio',     startMonth: 10, startDay: 23 },
  { sign: 'sagittarius', startMonth: 11, startDay: 22 },
  { sign: 'capricorn',   startMonth: 12, startDay: 22 },
];

/**
 * Derive zodiac sign, element, and compatible signs from a birthday string.
 * Accepts ISO date string (YYYY-MM-DD) or MM/DD/YYYY.
 */
export function deriveZodiac(birthday: string): ZodiacInfo | null {
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  // Walk ranges in reverse to find the matching sign
  let sign: ZodiacSign = 'capricorn';
  for (let i = SIGN_RANGES.length - 1; i >= 0; i--) {
    const range = SIGN_RANGES[i];
    if (month > range.startMonth || (month === range.startMonth && day >= range.startDay)) {
      sign = range.sign;
      break;
    }
  }

  const data = ZODIAC_MAP[sign];
  return {
    sign,
    element: data.element,
    compatibleSigns: data.compatible,
  };
}
