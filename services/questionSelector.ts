import type { BankQuestion } from '../types/questions';
import type { PersonalityConfig } from '../types/personality';
import type { SessionArc } from '../types/sessionArc';
import type { ChemistryProfile } from '../types/chemistry';

export interface QuestionSelectorContext {
  config: PersonalityConfig;
  arc: SessionArc;
  chemistry: ChemistryProfile;
  askedThisSession: string[];
  askedWithPartner: string[];
  partnerSessionsCount: number;
  maxDepthThisSession: number;
  lastQuestionId: string | null;
}

/**
 * Selects the next question following the 5-step algorithm from the architecture spec.
 *
 * Steps:
 * 1. Load eligible questions (mode, depth ceiling, session requirements)
 * 2. Filter out asked/blocked questions
 * 3. Score remaining by tag overlap, depth proximity, follow-up bonus, novelty
 * 4. Select top candidate (with follow-up probability roll)
 * 5. (Optional) AI personalization pass -- not implemented in skeleton
 *
 * Sprint 1: Returns from the provided pool using filtering only.
 * Sprint 2: Full scoring + graph traversal when question bank exists.
 */
export function selectNextQuestion(
  pool: BankQuestion[],
  ctx: QuestionSelectorContext,
): BankQuestion | null {
  const { config, arc, askedThisSession, askedWithPartner, partnerSessionsCount, maxDepthThisSession, lastQuestionId } = ctx;
  const currentPhase = arc.phases[arc.current_phase];
  if (!currentPhase) return null;

  // Step 1: Filter eligible
  const maxDepth = Math.floor(config.vulnerability_ceiling * 5);
  let candidates = pool.filter(q =>
    q.mode_eligible.includes(config.mode) &&
    q.depth <= maxDepth &&
    q.requires_sessions <= partnerSessionsCount &&
    q.requires_depth_reached <= maxDepthThisSession
  );

  // Step 2: Filter out asked / blocked
  const askedSet = new Set([...askedThisSession, ...askedWithPartner.filter(id => {
    const q = pool.find(p => p.id === id);
    return q?.once_per_partner;
  })]);

  const lastQuestion = lastQuestionId ? pool.find(q => q.id === lastQuestionId) : null;
  const neverAfterSet = new Set(lastQuestion?.never_after ?? []);

  candidates = candidates.filter(q =>
    !askedSet.has(q.id) &&
    !neverAfterSet.has(q.id)
  );

  if (candidates.length === 0) return null;

  // Step 3: Score
  const tagsUsed = new Set(
    askedThisSession
      .map(id => pool.find(q => q.id === id))
      .filter(Boolean)
      .flatMap(q => q!.tags)
  );

  const scored = candidates.map(q => {
    let score = 0;

    // Tag overlap with current phase
    const tagOverlap = q.tags.filter(t => currentPhase.allowed_tags.includes(t)).length;
    score += tagOverlap * 10;

    // Depth proximity to phase target
    const depthDist = Math.abs(q.depth - currentPhase.target_depth);
    score += Math.max(0, 5 - depthDist * 2);

    // Follow-up bonus
    if (lastQuestionId && q.follow_up_of === lastQuestionId) {
      score += 15;
    }

    // Novelty bonus
    const novelTags = q.tags.filter(t => !tagsUsed.has(t)).length;
    score += novelTags * 3;

    return { question: q, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Step 4: Follow-up probability roll
  if (lastQuestionId && Math.random() < config.follow_up_probability) {
    const followUp = scored.find(s => s.question.follow_up_of === lastQuestionId);
    if (followUp) return followUp.question;
  }

  return scored[0]?.question ?? null;
}
