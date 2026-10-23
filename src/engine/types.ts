import type { TurnReducer } from '@some-alambre/room-relay';

export type RealSpanishSuit = 'oros' | 'copas' | 'espadas' | 'bastos';
export type SpanishSuit = RealSpanishSuit | 'joker';

export type SpanishRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface SpanishCard {
  id: string;
  suit: SpanishSuit;
  rank: SpanishRank;
  points: number;
}

export interface DeckSpec {
  includeEightsAndNines: boolean;
  jokerCount: number;
}

export type GameAvailability = 'available' | 'coming_soon' | 'maker_preview';

export interface PlayerSeat {
  id: string;
  name: string;
  isBot: boolean;
  isHost: boolean;
  totalScore: number;
  isEliminated: boolean;
}

export interface GameCatalogEntry {
  id: 'chinchon' | 'truco' | 'escoba' | 'game-maker';
  minPlayers: number;
  maxPlayers: number;
  deckSpec: DeckSpec;
  availability: GameAvailability;
  targetScore: number;
}

export interface GameDefinition<TState, TAction> extends GameCatalogEntry {
  createInitialState: (players: PlayerSeat[], seed?: string | number) => TState;
  reducer: TurnReducer<TState, TAction>;
  validateAction: (state: TState, action: TAction, senderId: string) => boolean;
  computeBotAction: (state: TState, botPlayerId: string) => TAction | null;
}
