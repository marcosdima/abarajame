import { shuffleWithSeed } from '@some-alambre/room-relay';
import type { DeckSpec, RealSpanishSuit, SpanishCard, SpanishRank } from './types';

export const REAL_SUITS: readonly RealSpanishSuit[] = [
  'oros',
  'copas',
  'espadas',
  'bastos',
] as const;

export const FULL_RANKS: readonly SpanishRank[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export const SHORT_RANKS: readonly SpanishRank[] = [
  1, 2, 3, 4, 5, 6, 7, 10, 11, 12,
] as const;

/**
 * Returns the Chin Chón point value of a Spanish card:
 * - Ranks 1..12: face value (1..12 points)
 * - Joker (Comodín): 25 penalty points if left unmelded
 */
export function getCardPoints(suit: SpanishCard['suit'], rank: SpanishRank): number {
  if (suit === 'joker' || rank === 0) {
    return 25;
  }
  return rank;
}

/**
 * Creates a Spanish deck according to the declarative DeckSpec.
 * - 40 cards: `includeEightsAndNines: false, jokerCount: 0` (Truco / Escoba)
 * - 48 cards: `includeEightsAndNines: true, jokerCount: 0`
 * - 50 cards: `includeEightsAndNines: true, jokerCount: 2` (Classic Chin Chón)
 */
export function createSpanishDeck(
  spec: DeckSpec = { includeEightsAndNines: true, jokerCount: 2 },
): SpanishCard[] {
  const ranks = spec.includeEightsAndNines ? FULL_RANKS : SHORT_RANKS;
  const deck: SpanishCard[] = [];

  for (const suit of REAL_SUITS) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        points: getCardPoints(suit, rank),
      });
    }
  }

  for (let i = 1; i <= spec.jokerCount; i++) {
    deck.push({
      id: `joker-${i}`,
      suit: 'joker',
      rank: 0,
      points: getCardPoints('joker', 0),
    });
  }

  return deck;
}

/**
 * Deterministically shuffles a Spanish deck using `@some-alambre/room-relay`'s `shuffleWithSeed`.
 */
export function shuffleSpanishDeck(
  deck: readonly SpanishCard[],
  seed: string | number,
): SpanishCard[] {
  return shuffleWithSeed(deck, seed);
}
