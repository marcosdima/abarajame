import type { RealSpanishSuit, SpanishCard, SpanishRank } from '../types';

export type MeldType = 'escalera' | 'pierna';

export interface MeldGroup {
  type: MeldType;
  cards: SpanishCard[];
  hasJoker: boolean;
  isChinChon: boolean;
}

export interface HandMeldEvaluation {
  melds: MeldGroup[];
  unmeldedCards: SpanishCard[];
  /** Sum of points of unmelded cards (0 if all 7 cards are melded). */
  unmeldedPoints: number;
  /**
   * Net score delta if the player closes with this 7-card hand:
   * - Pure 7-card Escalera without Joker (Chin Chón): -100 (instant win)
   * - 7 cards melded (0 loose cards): -10 bonus
   * - 6 cards melded + 1 loose card <= 5: loose card points (1..5)
   */
  closeScoreDelta: number;
  /** True if all 7 cards form a single natural Escalera without Jokers. */
  isChinChon: boolean;
  /** True if this 7-card hand can legally close (<= 1 loose card of points <= 5). */
  canClose: boolean;
}

export interface ClosableDiscardOption {
  discardCard: SpanishCard;
  evaluation: HandMeldEvaluation;
}

const SUIT_ORDER: Record<SpanishCard['suit'], number> = {
  oros: 0,
  copas: 1,
  espadas: 2,
  bastos: 3,
  joker: 4,
};

/**
 * Checks whether a subset of 3..7 cards forms a valid Chin Chón meld:
 * - `pierna`: 3 or 4 cards of the same rank (distinct suits), max 1 Joker.
 * - `escalera`: 3..7 cards of the same suit with consecutive ranks (1..12), max 1 Joker.
 *
 * Returns a `MeldGroup` with cards ordered naturally (with Joker positioned in its gap),
 * or `null` if the subset is not a valid single meld.
 */
export function classifyMeld(subset: readonly SpanishCard[]): MeldGroup | null {
  const n = subset.length;
  if (n < 3 || n > 7) return null;

  const jokers = subset.filter((c) => c.suit === 'joker');
  const naturals = subset.filter((c) => c.suit !== 'joker');

  // At most 1 Joker per meld, and at least 2 natural cards
  if (jokers.length > 1 || naturals.length < 2) {
    return null;
  }

  // 1. Check Escalera (same suit, consecutive ranks in 1..12)
  const firstSuit = naturals[0]!.suit as RealSpanishSuit;
  const sameSuit = naturals.every((c) => c.suit === firstSuit);

  if (sameSuit) {
    const sortedNaturals = [...naturals].sort((a, b) => a.rank - b.rank);
    let duplicateRank = false;
    let totalGaps = 0;

    for (let i = 1; i < sortedNaturals.length; i++) {
      const diff = sortedNaturals[i]!.rank - sortedNaturals[i - 1]!.rank;
      if (diff === 0) {
        duplicateRank = true;
        break;
      }
      totalGaps += diff - 1;
    }

    if (!duplicateRank && totalGaps <= jokers.length) {
      // Build ordered Escalera placing the Joker in the missing gap (or at the high/low end)
      const ordered: SpanishCard[] = [];
      const remainingJokers = [...jokers];

      for (let i = 0; i < sortedNaturals.length; i++) {
        const curr = sortedNaturals[i]!;
        if (i > 0) {
          const prev = sortedNaturals[i - 1]!;
          const gap = curr.rank - prev.rank - 1;
          for (let g = 0; g < gap && remainingJokers.length > 0; g++) {
            ordered.push(remainingJokers.shift()!);
          }
        }
        ordered.push(curr);
      }

      // If a Joker remains unused inside an internal gap, append it to the high end (if < 12) or prepend to low end
      while (remainingJokers.length > 0) {
        const joker = remainingJokers.shift()!;
        const highestRank = sortedNaturals[sortedNaturals.length - 1]!.rank;
        if (highestRank < 12) {
          ordered.push(joker);
        } else {
          ordered.unshift(joker);
        }
      }

      const isChinChon = n === 7 && jokers.length === 0;
      return {
        type: 'escalera',
        cards: ordered,
        hasJoker: jokers.length > 0,
        isChinChon,
      };
    }
  }

  // 2. Check Pierna (3 or 4 cards of identical rank across distinct suits)
  if (n <= 4) {
    const targetRank = naturals[0]!.rank;
    const sameRank = naturals.every((c) => c.rank === targetRank);
    if (sameRank) {
      const uniqueSuits = new Set(naturals.map((c) => c.suit));
      if (uniqueSuits.size === naturals.length) {
        const sortedNaturals = [...naturals].sort(
          (a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit],
        );
        return {
          type: 'pierna',
          cards: [...sortedNaturals, ...jokers],
          hasJoker: jokers.length > 0,
          isChinChon: false,
        };
      }
    }
  }

  return null;
}

interface CandidateMeld {
  mask: number;
  group: MeldGroup;
  contiguitySpan: number;
}

/**
 * Evaluates a hand (typically 7 cards) and finds the optimal non-overlapping meld partition.
 */
export function evaluateHandMelds(cards: readonly SpanishCard[]): HandMeldEvaluation {
  const n = cards.length;
  const totalMask = (1 << n) - 1;
  const candidates: CandidateMeld[] = [];

  // Enumerate all subsets of size 3..n
  for (let mask = 0; mask <= totalMask; mask++) {
    const bitCount = countBits(mask);
    if (bitCount < 3 || bitCount > 7) continue;

    const subset: SpanishCard[] = [];
    let minIdx = n;
    let maxIdx = -1;

    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        subset.push(cards[i]!);
        if (i < minIdx) minIdx = i;
        if (i > maxIdx) maxIdx = i;
      }
    }

    const group = classifyMeld(subset);
    if (group) {
      candidates.push({
        mask,
        group,
        contiguitySpan: maxIdx - minIdx + 1 - bitCount,
      });
    }
  }

  // Evaluate partitions of 0, 1, or 2 disjoint candidate melds
  let bestEval: HandMeldEvaluation = buildEvaluation(cards, [], 0, 0);
  let bestContiguityPenalty = Number.MAX_SAFE_INTEGER;

  // 1-meld partitions
  for (let i = 0; i < candidates.length; i++) {
    const c1 = candidates[i]!;
    const candidateEval = buildEvaluation(cards, [c1.group], c1.mask, c1.contiguitySpan);
    if (isBetterEvaluation(candidateEval, c1.contiguitySpan, bestEval, bestContiguityPenalty)) {
      bestEval = candidateEval;
      bestContiguityPenalty = c1.contiguitySpan;
    }

    // 2-meld partitions (disjoint bitmasks)
    for (let j = i + 1; j < candidates.length; j++) {
      const c2 = candidates[j]!;
      if ((c1.mask & c2.mask) !== 0) continue;

      const combinedMask = c1.mask | c2.mask;
      const combinedSpan = c1.contiguitySpan + c2.contiguitySpan;
      const pairEval = buildEvaluation(
        cards,
        [c1.group, c2.group],
        combinedMask,
        combinedSpan,
      );

      if (isBetterEvaluation(pairEval, combinedSpan, bestEval, bestContiguityPenalty)) {
        bestEval = pairEval;
        bestContiguityPenalty = combinedSpan;
      }
    }
  }

  return bestEval;
}

function buildEvaluation(
  cards: readonly SpanishCard[],
  melds: MeldGroup[],
  meldedMask: number,
  _span: number,
): HandMeldEvaluation {
  const unmeldedCards: SpanishCard[] = [];
  let unmeldedPoints = 0;

  for (let i = 0; i < cards.length; i++) {
    if ((meldedMask & (1 << i)) === 0) {
      const card = cards[i]!;
      unmeldedCards.push(card);
      unmeldedPoints += card.points;
    }
  }

  const isChinChon =
    cards.length === 7 && melds.length === 1 && melds[0]!.isChinChon;

  const canClose =
    cards.length === 7 &&
    melds.length >= 1 &&
    (unmeldedCards.length === 0 ||
      (unmeldedCards.length === 1 && unmeldedCards[0]!.points <= 5));

  let closeScoreDelta = unmeldedPoints;
  if (isChinChon) {
    closeScoreDelta = -100;
  } else if (canClose && unmeldedCards.length === 0) {
    closeScoreDelta = -10;
  }

  return {
    melds,
    unmeldedCards,
    unmeldedPoints,
    closeScoreDelta,
    isChinChon,
    canClose,
  };
}

function isBetterEvaluation(
  next: HandMeldEvaluation,
  nextSpan: number,
  curr: HandMeldEvaluation,
  currSpan: number,
): boolean {
  // 1. Pure Chin Chón always wins
  if (next.isChinChon !== curr.isChinChon) {
    return next.isChinChon;
  }
  // 2. Ability to legally close wins
  if (next.canClose !== curr.canClose) {
    return next.canClose;
  }
  // 3. Lower closeScoreDelta / unmeldedPoints wins
  if (next.canClose && curr.canClose && next.closeScoreDelta !== curr.closeScoreDelta) {
    return next.closeScoreDelta < curr.closeScoreDelta;
  }
  if (next.unmeldedPoints !== curr.unmeldedPoints) {
    return next.unmeldedPoints < curr.unmeldedPoints;
  }
  // 4. Fewer unmelded cards (more melded cards) wins
  if (next.unmeldedCards.length !== curr.unmeldedCards.length) {
    return next.unmeldedCards.length < curr.unmeldedCards.length;
  }
  // 5. Respect user's current hand adjacency when tied
  return nextSpan < currSpan;
}

/**
 * Given an 8-card hand (after drawing), returns all cards whose discard leaves
 * a 7-card hand that can legally close ('Cortar'), ordered from best close to worst.
 */
export function findClosableDiscards(
  eightCards: readonly SpanishCard[],
): ClosableDiscardOption[] {
  if (eightCards.length !== 8) return [];

  const options: ClosableDiscardOption[] = [];

  for (let i = 0; i < eightCards.length; i++) {
    const discardCard = eightCards[i]!;
    const remaining7 = eightCards.filter((_, idx) => idx !== i);
    const evaluation = evaluateHandMelds(remaining7);
    if (evaluation.canClose) {
      options.push({ discardCard, evaluation });
    }
  }

  options.sort((a, b) => {
    if (a.evaluation.isChinChon !== b.evaluation.isChinChon) {
      return a.evaluation.isChinChon ? -1 : 1;
    }
    return a.evaluation.closeScoreDelta - b.evaluation.closeScoreDelta;
  });

  return options;
}

/**
 * Evaluates the best 7-card hand achievable from an 8-card hand (by discarding 1 card).
 * Useful for UI meld highlighting when the player holds 8 cards during the discard phase.
 */
export function evaluateEightCardHand(eightCards: readonly SpanishCard[]): {
  recommendedDiscard: SpanishCard;
  bestSevenEvaluation: HandMeldEvaluation;
} {
  let bestDiscard = eightCards[0]!;
  let bestEval = evaluateHandMelds(eightCards.slice(1));

  for (let i = 1; i < eightCards.length; i++) {
    const candidateDiscard = eightCards[i]!;
    const remaining7 = eightCards.filter((_, idx) => idx !== i);
    const evaluation = evaluateHandMelds(remaining7);

    if (isBetterEvaluation(evaluation, 0, bestEval, 0)) {
      bestEval = evaluation;
      bestDiscard = candidateDiscard;
    } else if (
      evaluation.unmeldedPoints === bestEval.unmeldedPoints &&
      candidateDiscard.points > bestDiscard.points
    ) {
      bestEval = evaluation;
      bestDiscard = candidateDiscard;
    }
  }

  return {
    recommendedDiscard: bestDiscard,
    bestSevenEvaluation: bestEval,
  };
}

/**
 * Auto-sorts a 7- or 8-card hand by placing valid melds first (in rank order),
 * followed by unmelded cards sorted by suit and rank.
 */
export function autoSortHand(cards: readonly SpanishCard[]): SpanishCard[] {
  if (cards.length <= 1) return [...cards];

  if (cards.length === 8) {
    const { recommendedDiscard, bestSevenEvaluation } = evaluateEightCardHand(cards);
    const sortedMelds = bestSevenEvaluation.melds.flatMap((m) => m.cards);
    const sortedUnmelded = sortCardsBySuitAndRank(bestSevenEvaluation.unmeldedCards);
    return [...sortedMelds, ...sortedUnmelded, recommendedDiscard];
  }

  const evaluation = evaluateHandMelds(cards);
  const sortedMelds = evaluation.melds.flatMap((m) => m.cards);
  const sortedUnmelded = sortCardsBySuitAndRank(evaluation.unmeldedCards);
  return [...sortedMelds, ...sortedUnmelded];
}

export function sortCardsBySuitAndRank(cards: readonly SpanishCard[]): SpanishCard[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return (a.rank as SpanishRank) - (b.rank as SpanishRank);
  });
}

function countBits(n: number): number {
  let count = 0;
  let v = n;
  while (v > 0) {
    v &= v - 1;
    count++;
  }
  return count;
}
