import { computeChinChonBotAction } from './chinchon/bot';
import {
  CHINCHON_MAX_PLAYERS,
  CHINCHON_MIN_PLAYERS,
  CHINCHON_TARGET_SCORE,
  chinChonReducer,
  createInitialChinChonState,
  validateChinChonAction,
  type ChinChonAction,
  type ChinChonState,
} from './chinchon/reducer';
import type { GameCatalogEntry, GameDefinition } from './types';

export const chinChonGameDefinition: GameDefinition<ChinChonState, ChinChonAction> = {
  id: 'chinchon',
  minPlayers: CHINCHON_MIN_PLAYERS,
  maxPlayers: CHINCHON_MAX_PLAYERS,
  deckSpec: {
    includeEightsAndNines: true,
    jokerCount: 2,
  },
  availability: 'available',
  targetScore: CHINCHON_TARGET_SCORE,
  createInitialState: createInitialChinChonState,
  reducer: chinChonReducer,
  validateAction: validateChinChonAction,
  computeBotAction: computeChinChonBotAction,
};

export const GAME_CATALOG: readonly GameCatalogEntry[] = [
  chinChonGameDefinition,
  {
    id: 'truco',
    minPlayers: 2,
    maxPlayers: 4,
    deckSpec: {
      includeEightsAndNines: false,
      jokerCount: 0,
    },
    availability: 'coming_soon',
    targetScore: 30,
  },
  {
    id: 'escoba',
    minPlayers: 2,
    maxPlayers: 4,
    deckSpec: {
      includeEightsAndNines: false,
      jokerCount: 0,
    },
    availability: 'coming_soon',
    targetScore: 15,
  },
  {
    id: 'game-maker',
    minPlayers: 2,
    maxPlayers: 6,
    deckSpec: {
      includeEightsAndNines: true,
      jokerCount: 2,
    },
    availability: 'maker_preview',
    targetScore: 100,
  },
] as const;
