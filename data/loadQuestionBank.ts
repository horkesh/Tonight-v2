import type { BankQuestion } from '../types/questions';
import rawBank from './questionBank.json';

/**
 * The full question bank loaded from the curated JSON file.
 * Questions are cast to BankQuestion[] — the JSON structure matches
 * the BankQuestion interface by design.
 */
export const QUESTION_BANK: BankQuestion[] = (rawBank as any).questions as BankQuestion[];

/**
 * Returns questions filtered by mode eligibility.
 */
export function getQuestionsForMode(mode: string): BankQuestion[] {
  return QUESTION_BANK.filter(q => q.mode_eligible.includes(mode));
}
