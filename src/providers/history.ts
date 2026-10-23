import { createCollection } from 'alambre';
import { storage } from '../storage';

export interface MatchPlayerScore {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
}

export interface MatchHistoryRecord {
  id: string;
  gameId: 'chinchon';
  roomCode: string;
  winnerId: string;
  winnerName: string;
  roundsPlayed: number;
  isChinChonWin: boolean;
  players: MatchPlayerScore[];
  finishedAt: number;
  [key: string]: unknown;
}

export const {
  useCollection: useMatchHistory,
  actions: matchHistoryActions,
} = createCollection<MatchHistoryRecord>({
  storage,
  storageKey: 'abarajame.matchHistory',
  initialValue: [],
});
