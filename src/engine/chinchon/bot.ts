import {
  evaluateEightCardHand,
  evaluateHandMelds,
  findClosableDiscards,
} from './meld-solver';
import type { ChinChonAction, ChinChonState } from './reducer';

/**
 * Computes the optimal next action for a bot player (`botPlayerId`) when it is their turn.
 * Returns `null` if the game is not in `'playing'` phase or it is not `botPlayerId`'s turn.
 */
export function computeChinChonBotAction(
  state: ChinChonState,
  botPlayerId: string,
): ChinChonAction | null {
  if (state.phase !== 'playing' || state.currentTurnPlayerId !== botPlayerId) {
    return null;
  }

  const hand = state.hands[botPlayerId] ?? [];

  if (state.turnStep === 'draw') {
    if (hand.length !== 7) return null;

    const topDiscard = state.discard[state.discard.length - 1];
    if (topDiscard) {
      const currentEval = evaluateHandMelds(hand);
      const withDiscard8 = [...hand, topDiscard];

      // Check if taking topDiscard allows an immediate legal close
      const closeOptions = findClosableDiscards(withDiscard8);
      if (closeOptions.length > 0) {
        return { type: 'DRAW_DISCARD', playerId: botPlayerId };
      }

      // Check if taking topDiscard significantly reduces unmelded points
      const { bestSevenEvaluation } = evaluateEightCardHand(withDiscard8);
      if (bestSevenEvaluation.unmeldedPoints < currentEval.unmeldedPoints - 3) {
        return { type: 'DRAW_DISCARD', playerId: botPlayerId };
      }
    }

    if (state.stock.length > 0 || state.discard.length > 1) {
      return { type: 'DRAW_STOCK', playerId: botPlayerId };
    }

    return topDiscard ? { type: 'DRAW_DISCARD', playerId: botPlayerId } : null;
  }

  if (state.turnStep === 'discard') {
    if (hand.length !== 8) return null;

    // 1. If bot can legally close ('Cortar'), close with the best option!
    const closeOptions = findClosableDiscards(hand);
    if (closeOptions.length > 0) {
      return {
        type: 'CLOSE_ROUND',
        playerId: botPlayerId,
        cardId: closeOptions[0]!.discardCard.id,
      };
    }

    // 2. Otherwise discard the card that leaves the lowest unmelded points
    const { recommendedDiscard } = evaluateEightCardHand(hand);
    return {
      type: 'DISCARD',
      playerId: botPlayerId,
      cardId: recommendedDiscard.id,
    };
  }

  return null;
}
