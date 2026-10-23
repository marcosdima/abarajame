import type { TurnActionMeta } from '@some-alambre/room-relay';
import { createSpanishDeck, shuffleSpanishDeck } from '../deck';
import type { PlayerSeat, SpanishCard } from '../types';
import {
  autoSortHand,
  evaluateHandMelds,
  type MeldGroup,
} from './meld-solver';

export type ChinChonPhase = 'lobby' | 'playing' | 'round_summary' | 'match_over';
export type ChinChonTurnStep = 'draw' | 'discard';

export interface PlayerRoundBreakdown {
  playerId: string;
  playerName: string;
  hand: SpanishCard[];
  melds: MeldGroup[];
  unmeldedCards: SpanishCard[];
  roundDelta: number;
  previousScore: number;
  newScore: number;
  isCloser: boolean;
  isChinChon: boolean;
  newlyEliminated: boolean;
}

export interface ChinChonRoundSummary {
  roundNumber: number;
  closerId: string;
  closerName: string;
  closeDiscardCard: SpanishCard;
  isChinChon: boolean;
  breakdowns: PlayerRoundBreakdown[];
}

export interface ChinChonState {
  gameId: 'chinchon';
  phase: ChinChonPhase;
  roundNumber: number;
  turnCount: number;
  seed: string;
  targetScore: number;
  players: PlayerSeat[];
  /** Index into `players` for the round's starting player (rotates each round). */
  dealerIndex: number;
  /** ID of the player whose turn it currently is. */
  currentTurnPlayerId: string;
  /** Current step within the active player's turn ('draw' -> 7 cards, 'discard' -> 8 cards). */
  turnStep: ChinChonTurnStep;
  /** Face-down draw pile (last element is top of stock). */
  stock: SpanishCard[];
  /** Face-up discard pile (last element is top of discard). */
  discard: SpanishCard[];
  /** Card placed face-down on the close slot when a player closes the round. */
  closeCard: SpanishCard | null;
  /** Map of playerId -> ordered cards in hand. */
  hands: Record<string, SpanishCard[]>;
  /** Summary of the most recently finished round. */
  lastRoundSummary: ChinChonRoundSummary | null;
  /** Winner player ID when `phase === 'match_over'`. */
  winnerId: string | null;
  /** Last human-readable event key/metadata for table feed. */
  lastEvent: {
    type:
      | 'match_started'
      | 'drew_stock'
      | 'drew_discard'
      | 'discarded'
      | 'closed_round'
      | 'stock_recycled';
    playerId: string;
    card?: SpanishCard;
  } | null;
}

export type ChinChonAction =
  | { type: 'SYNC_PLAYERS'; players: PlayerSeat[] }
  | { type: 'ADD_BOT'; botId: string; botName: string }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'START_MATCH'; seed: string; players?: PlayerSeat[] }
  | { type: 'DRAW_STOCK'; playerId: string }
  | { type: 'DRAW_DISCARD'; playerId: string }
  | { type: 'DISCARD'; playerId: string; cardId: string }
  | { type: 'CLOSE_ROUND'; playerId: string; cardId: string }
  | { type: 'REORDER_HAND'; playerId: string; orderedCardIds: string[] }
  | { type: 'AUTO_SORT_HAND'; playerId: string }
  | { type: 'NEXT_ROUND'; seed?: string }
  | { type: 'REMATCH'; seed: string };

export const CHINCHON_MAX_PLAYERS = 4;
export const CHINCHON_MIN_PLAYERS = 2;
export const CHINCHON_TARGET_SCORE = 100;

export function createInitialChinChonState(
  players: PlayerSeat[] = [],
  seed: string | number = 'abarajame-initial',
): ChinChonState {
  const normalizedPlayers = players.map((p) => ({
    ...p,
    totalScore: p.totalScore ?? 0,
    isEliminated: p.isEliminated ?? false,
  }));

  return {
    gameId: 'chinchon',
    phase: 'lobby',
    roundNumber: 0,
    turnCount: 0,
    seed: String(seed),
    targetScore: CHINCHON_TARGET_SCORE,
    players: normalizedPlayers,
    dealerIndex: 0,
    currentTurnPlayerId: normalizedPlayers[0]?.id ?? '',
    turnStep: 'draw',
    stock: [],
    discard: [],
    closeCard: null,
    hands: {},
    lastRoundSummary: null,
    winnerId: null,
    lastEvent: null,
  };
}

/**
 * Deals a fresh 7-card hand to each non-eliminated player and flips 1 card to the discard pile.
 */
function dealChinChonRound(
  state: ChinChonState,
  roundNumber: number,
  seed: string,
  dealerIndex: number,
): ChinChonState {
  const activePlayers = state.players.filter((p) => !p.isEliminated);
  if (activePlayers.length < 2) {
    return state;
  }

  const fullDeck = createSpanishDeck({ includeEightsAndNines: true, jokerCount: 2 });
  const shuffled = shuffleSpanishDeck(fullDeck, `${seed}-r${roundNumber}`);

  const hands: Record<string, SpanishCard[]> = {};
  for (const player of state.players) {
    hands[player.id] = [];
  }

  let cursor = 0;
  for (let cardIdx = 0; cardIdx < 7; cardIdx++) {
    for (const player of activePlayers) {
      const card = shuffled[cursor++];
      if (card) {
        hands[player.id]!.push(card);
      }
    }
  }

  // Initial face-up card on discard pile
  const firstDiscard = shuffled[cursor++];
  const remainingStock = shuffled.slice(cursor);

  const normalizedDealerIdx = dealerIndex % activePlayers.length;
  const startingPlayer = activePlayers[normalizedDealerIdx]!;

  return {
    ...state,
    phase: 'playing',
    roundNumber,
    turnCount: 1,
    seed,
    dealerIndex: normalizedDealerIdx,
    currentTurnPlayerId: startingPlayer.id,
    turnStep: 'draw',
    stock: remainingStock,
    discard: firstDiscard ? [firstDiscard] : [],
    closeCard: null,
    hands,
    lastRoundSummary: null,
    lastEvent: {
      type: 'match_started',
      playerId: startingPlayer.id,
    },
  };
}

function getNextActivePlayerId(players: readonly PlayerSeat[], currentPlayerId: string): string {
  const active = players.filter((p) => !p.isEliminated);
  if (active.length === 0) return currentPlayerId;
  const idx = active.findIndex((p) => p.id === currentPlayerId);
  if (idx === -1) return active[0]!.id;
  return active[(idx + 1) % active.length]!.id;
}

/**
 * Validates whether `senderId` is allowed to dispatch `action` in `state`.
 * Note: The host is permitted to dispatch actions on behalf of bot players (`isBot: true`).
 */
export function validateChinChonAction(
  state: ChinChonState,
  action: ChinChonAction,
  senderId: string,
): boolean {
  const senderSeat = state.players.find((p) => p.id === senderId);
  const isHostSender = senderSeat?.isHost ?? false;

  const canActForPlayer = (targetPlayerId: string): boolean => {
    if (senderId === targetPlayerId) return true;
    if (isHostSender) {
      const targetSeat = state.players.find((p) => p.id === targetPlayerId);
      return Boolean(targetSeat?.isBot);
    }
    return false;
  };

  switch (action.type) {
    case 'SYNC_PLAYERS':
    case 'ADD_BOT':
    case 'REMOVE_PLAYER':
      return state.phase === 'lobby' && (isHostSender || state.players.length === 0);

    case 'START_MATCH': {
      const list = action.players ?? state.players;
      const isSenderHostInList =
        isHostSender || list.some((p) => p.id === senderId && p.isHost);
      return (
        state.phase === 'lobby' &&
        isSenderHostInList &&
        list.length >= CHINCHON_MIN_PLAYERS &&
        list.length <= CHINCHON_MAX_PLAYERS
      );
    }

    case 'DRAW_STOCK':
      return (
        state.phase === 'playing' &&
        state.turnStep === 'draw' &&
        state.currentTurnPlayerId === action.playerId &&
        canActForPlayer(action.playerId) &&
        (state.stock.length > 0 || state.discard.length > 1)
      );

    case 'DRAW_DISCARD':
      return (
        state.phase === 'playing' &&
        state.turnStep === 'draw' &&
        state.currentTurnPlayerId === action.playerId &&
        canActForPlayer(action.playerId) &&
        state.discard.length > 0
      );

    case 'DISCARD': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'discard' ||
        state.currentTurnPlayerId !== action.playerId ||
        !canActForPlayer(action.playerId)
      ) {
        return false;
      }
      const hand = state.hands[action.playerId] ?? [];
      return hand.length === 8 && hand.some((c) => c.id === action.cardId);
    }

    case 'CLOSE_ROUND': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'discard' ||
        state.currentTurnPlayerId !== action.playerId ||
        !canActForPlayer(action.playerId)
      ) {
        return false;
      }
      const hand = state.hands[action.playerId] ?? [];
      if (hand.length !== 8) return false;
      const idx = hand.findIndex((c) => c.id === action.cardId);
      if (idx === -1) return false;
      const remaining7 = hand.filter((_, i) => i !== idx);
      return evaluateHandMelds(remaining7).canClose;
    }

    case 'REORDER_HAND':
    case 'AUTO_SORT_HAND':
      return state.phase === 'playing' && canActForPlayer(action.playerId);

    case 'NEXT_ROUND':
      return state.phase === 'round_summary' && isHostSender;

    case 'REMATCH':
      return (state.phase === 'match_over' || state.phase === 'round_summary') && isHostSender;
  }
}

export function chinChonReducer(
  state: ChinChonState,
  action: ChinChonAction,
  _meta?: TurnActionMeta,
): ChinChonState {
  switch (action.type) {
    case 'SYNC_PLAYERS': {
      if (state.phase !== 'lobby') return state;
      return {
        ...state,
        players: action.players.slice(0, CHINCHON_MAX_PLAYERS),
      };
    }

    case 'ADD_BOT': {
      if (state.phase !== 'lobby' || state.players.length >= CHINCHON_MAX_PLAYERS) {
        return state;
      }
      if (state.players.some((p) => p.id === action.botId)) {
        return state;
      }
      return {
        ...state,
        players: [
          ...state.players,
          {
            id: action.botId,
            name: action.botName,
            isBot: true,
            isHost: false,
            totalScore: 0,
            isEliminated: false,
          },
        ],
      };
    }

    case 'REMOVE_PLAYER': {
      if (state.phase !== 'lobby') return state;
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      };
    }

    case 'START_MATCH': {
      const players = (action.players ?? state.players)
        .slice(0, CHINCHON_MAX_PLAYERS)
        .map((p) => ({
          ...p,
          totalScore: 0,
          isEliminated: false,
        }));

      if (players.length < CHINCHON_MIN_PLAYERS) return state;

      const baseState: ChinChonState = {
        ...state,
        players,
        winnerId: null,
        lastRoundSummary: null,
      };

      return dealChinChonRound(baseState, 1, action.seed, 0);
    }

    case 'DRAW_STOCK': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'draw' ||
        state.currentTurnPlayerId !== action.playerId
      ) {
        return state;
      }

      let workingStock = [...state.stock];
      let workingDiscard = [...state.discard];

      // Recycle discard pile if stock is empty
      if (workingStock.length === 0 && workingDiscard.length > 1) {
        const topDiscard = workingDiscard.pop()!;
        workingStock = shuffleSpanishDeck(
          workingDiscard,
          `${state.seed}-recycle-r${state.roundNumber}-t${state.turnCount}`,
        );
        workingDiscard = [topDiscard];
      }

      if (workingStock.length === 0) return state;

      const drawnCard = workingStock.pop()!;
      const currentHand = state.hands[action.playerId] ?? [];

      return {
        ...state,
        stock: workingStock,
        discard: workingDiscard,
        turnStep: 'discard',
        hands: {
          ...state.hands,
          [action.playerId]: [...currentHand, drawnCard],
        },
        lastEvent: {
          type: 'drew_stock',
          playerId: action.playerId,
        },
      };
    }

    case 'DRAW_DISCARD': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'draw' ||
        state.currentTurnPlayerId !== action.playerId ||
        state.discard.length === 0
      ) {
        return state;
      }

      const workingDiscard = [...state.discard];
      const drawnCard = workingDiscard.pop()!;
      const currentHand = state.hands[action.playerId] ?? [];

      return {
        ...state,
        discard: workingDiscard,
        turnStep: 'discard',
        hands: {
          ...state.hands,
          [action.playerId]: [...currentHand, drawnCard],
        },
        lastEvent: {
          type: 'drew_discard',
          playerId: action.playerId,
          card: drawnCard,
        },
      };
    }

    case 'DISCARD': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'discard' ||
        state.currentTurnPlayerId !== action.playerId
      ) {
        return state;
      }

      const currentHand = state.hands[action.playerId] ?? [];
      const cardIndex = currentHand.findIndex((c) => c.id === action.cardId);
      if (cardIndex === -1 || currentHand.length !== 8) {
        return state;
      }

      const discardedCard = currentHand[cardIndex]!;
      const nextHand = currentHand.filter((_, i) => i !== cardIndex);

      let nextStock = [...state.stock];
      let nextDiscard = [...state.discard, discardedCard];

      // If stock was exhausted, immediately recycle all but the newly discarded card
      if (nextStock.length === 0 && nextDiscard.length > 1) {
        const topDiscard = nextDiscard.pop()!;
        nextStock = shuffleSpanishDeck(
          nextDiscard,
          `${state.seed}-recycle-r${state.roundNumber}-t${state.turnCount}`,
        );
        nextDiscard = [topDiscard];
      }

      const nextPlayerId = getNextActivePlayerId(state.players, action.playerId);

      return {
        ...state,
        stock: nextStock,
        discard: nextDiscard,
        turnCount: state.turnCount + 1,
        currentTurnPlayerId: nextPlayerId,
        turnStep: 'draw',
        hands: {
          ...state.hands,
          [action.playerId]: nextHand,
        },
        lastEvent: {
          type: 'discarded',
          playerId: action.playerId,
          card: discardedCard,
        },
      };
    }

    case 'CLOSE_ROUND': {
      if (
        state.phase !== 'playing' ||
        state.turnStep !== 'discard' ||
        state.currentTurnPlayerId !== action.playerId
      ) {
        return state;
      }

      const closerHand8 = state.hands[action.playerId] ?? [];
      const closeIdx = closerHand8.findIndex((c) => c.id === action.cardId);
      if (closeIdx === -1 || closerHand8.length !== 8) {
        return state;
      }

      const closeDiscardCard = closerHand8[closeIdx]!;
      const closerRemaining7 = closerHand8.filter((_, i) => i !== closeIdx);
      const closerEval = evaluateHandMelds(closerRemaining7);

      if (!closerEval.canClose) {
        return state;
      }

      const nextHands: Record<string, SpanishCard[]> = {
        ...state.hands,
        [action.playerId]: autoSortHand(closerRemaining7),
      };

      const breakdowns: PlayerRoundBreakdown[] = [];
      const updatedPlayers: PlayerSeat[] = [];

      for (const seat of state.players) {
        if (seat.isEliminated) {
          updatedPlayers.push(seat);
          continue;
        }

        const isCloser = seat.id === action.playerId;
        const playerHand = isCloser
          ? closerRemaining7
          : (state.hands[seat.id] ?? []);
        const sortedHand = autoSortHand(playerHand);
        nextHands[seat.id] = sortedHand;

        const evaluation = isCloser ? closerEval : evaluateHandMelds(playerHand);
        const roundDelta = isCloser
          ? evaluation.closeScoreDelta
          : evaluation.unmeldedPoints;
        const previousScore = seat.totalScore;
        const newScore = closerEval.isChinChon && isCloser
          ? previousScore
          : previousScore + roundDelta;
        const newlyEliminated = closerEval.isChinChon
          ? !isCloser
          : newScore > state.targetScore;

        breakdowns.push({
          playerId: seat.id,
          playerName: seat.name,
          hand: sortedHand,
          melds: evaluation.melds,
          unmeldedCards: evaluation.unmeldedCards,
          roundDelta,
          previousScore,
          newScore,
          isCloser,
          isChinChon: isCloser && closerEval.isChinChon,
          newlyEliminated,
        });

        updatedPlayers.push({
          ...seat,
          totalScore: newScore,
          isEliminated: seat.isEliminated || newlyEliminated,
        });
      }

      // Edge case: if every active player exceeded targetScore simultaneously, keep the lowest score alive
      let survivors = updatedPlayers.filter((p) => !p.isEliminated);
      if (survivors.length === 0 && updatedPlayers.length > 0) {
        const minScore = Math.min(...updatedPlayers.map((p) => p.totalScore));
        for (let i = 0; i < updatedPlayers.length; i++) {
          if (updatedPlayers[i]!.totalScore === minScore) {
            updatedPlayers[i] = { ...updatedPlayers[i]!, isEliminated: false };
            break;
          }
        }
        survivors = updatedPlayers.filter((p) => !p.isEliminated);
      }

      const isMatchOver = closerEval.isChinChon || survivors.length <= 1;
      const winnerId = closerEval.isChinChon
        ? action.playerId
        : isMatchOver
          ? (survivors[0]?.id ?? action.playerId)
          : null;

      const closerSeat = state.players.find((p) => p.id === action.playerId);

      const summary: ChinChonRoundSummary = {
        roundNumber: state.roundNumber,
        closerId: action.playerId,
        closerName: closerSeat?.name ?? action.playerId,
        closeDiscardCard,
        isChinChon: closerEval.isChinChon,
        breakdowns,
      };

      return {
        ...state,
        phase: isMatchOver ? 'match_over' : 'round_summary',
        players: updatedPlayers,
        closeCard: closeDiscardCard,
        hands: nextHands,
        lastRoundSummary: summary,
        winnerId,
        lastEvent: {
          type: 'closed_round',
          playerId: action.playerId,
          card: closeDiscardCard,
        },
      };
    }

    case 'REORDER_HAND': {
      const currentHand = state.hands[action.playerId];
      if (!currentHand) return state;

      const cardMap = new Map(currentHand.map((c) => [c.id, c]));
      const reordered: SpanishCard[] = [];
      const seen = new Set<string>();

      for (const id of action.orderedCardIds) {
        const card = cardMap.get(id);
        if (card && !seen.has(id)) {
          reordered.push(card);
          seen.add(id);
        }
      }

      for (const card of currentHand) {
        if (!seen.has(card.id)) {
          reordered.push(card);
        }
      }

      return {
        ...state,
        hands: {
          ...state.hands,
          [action.playerId]: reordered,
        },
      };
    }

    case 'AUTO_SORT_HAND': {
      const currentHand = state.hands[action.playerId];
      if (!currentHand) return state;

      return {
        ...state,
        hands: {
          ...state.hands,
          [action.playerId]: autoSortHand(currentHand),
        },
      };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'round_summary') return state;
      const nextSeed = action.seed ?? state.seed;
      const nextRound = state.roundNumber + 1;
      return dealChinChonRound(state, nextRound, nextSeed, state.dealerIndex + 1);
    }

    case 'REMATCH': {
      const resetPlayers = state.players.map((p) => ({
        ...p,
        totalScore: 0,
        isEliminated: false,
      }));
      const base: ChinChonState = {
        ...state,
        players: resetPlayers,
        winnerId: null,
        lastRoundSummary: null,
      };
      return dealChinChonRound(base, 1, action.seed, 0);
    }
  }
}
