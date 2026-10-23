import { createStore, useExternalStore } from 'alambre';
import { createRoomRelay, generateRoomCode, type IRoomRelayClient } from '@some-alambre/room-relay';
import type { PlayerSeat } from '../engine';
import { DEFAULT_LAN_RELAY, DEFAULT_PUBLIC_RELAY } from '../constants/network';

export interface TableSessionState {
  gameId: 'chinchon';
  roomCode: string;
  localPlayerId: string;
  localPlayerName: string;
  isHost: boolean;
  mode: 'simulated' | 'websocket';
  serverUrl: string;
  seats: PlayerSeat[];
  matchSeed: string;
}

const initialPlayerId = 'player-host-1';

const initialSession: TableSessionState = {
  gameId: 'chinchon',
  roomCode: generateRoomCode(4),
  localPlayerId: initialPlayerId,
  localPlayerName: 'Jugador 1',
  isHost: true,
  mode: 'simulated',
  serverUrl: DEFAULT_PUBLIC_RELAY,
  seats: [
    {
      id: initialPlayerId,
      name: 'Jugador 1',
      isBot: false,
      isHost: true,
      totalScore: 0,
      isEliminated: false,
    },
    {
      id: 'bot-gaucho-1',
      name: 'Gaucho Bot',
      isBot: true,
      isHost: false,
      totalScore: 0,
      isEliminated: false,
    },
  ],
  matchSeed: `seed-${Date.now()}`,
};

export const tableSessionStore = createStore<TableSessionState>(initialSession);

let activeRelayClient: IRoomRelayClient<Record<string, unknown>> | null = null;

export const getSessionRelayClient = <
  TEvents extends Record<string, unknown> = Record<string, unknown>,
>(): IRoomRelayClient<TEvents> => {
  const current = tableSessionStore.getState();
  if (!activeRelayClient || activeRelayClient.isDestroyed()) {
    activeRelayClient = createRoomRelay({
      roomCode: current.roomCode,
      playerId: current.localPlayerId,
      playerName: current.localPlayerName,
      isHost: current.isHost,
      mode: current.mode,
      serverUrl: current.serverUrl,
      maxHistoryLength: 0,
      autoConnect: true,
    });
  }
  return activeRelayClient as unknown as IRoomRelayClient<TEvents>;
};

export const teardownSessionRelayClient = () => {
  if (activeRelayClient) {
    activeRelayClient.destroy();
    activeRelayClient = null;
  }
};

const BOT_NAMES = ['Gaucho Bot', 'Tango Bot', 'Pampa Bot'];

const resolveServerUrl = (url?: string): string => {
  if (!url || url.includes('relay.alambre.party') || url.includes('192.168.1.102')) {
    return DEFAULT_LAN_RELAY;
  }
  return url;
};

export const tableSessionActions = {
  createHostTable: (options: {
    playerName: string;
    mode: 'simulated' | 'websocket';
    serverUrl: string;
    roomCode?: string;
  }) => {
    teardownSessionRelayClient();
    const code = options.roomCode ?? generateRoomCode(4);
    const hostId = 'player-host-1';
    const seats: PlayerSeat[] = [
      {
        id: hostId,
        name: options.playerName.trim() || 'Anfitrión',
        isBot: false,
        isHost: true,
        totalScore: 0,
        isEliminated: false,
      },
    ];

    if (options.mode === 'simulated') {
      seats.push({
        id: 'bot-gaucho-1',
        name: BOT_NAMES[0]!,
        isBot: true,
        isHost: false,
        totalScore: 0,
        isEliminated: false,
      });
    }

    tableSessionStore.setState({
      gameId: 'chinchon',
      roomCode: code,
      localPlayerId: hostId,
      localPlayerName: seats[0]!.name,
      isHost: true,
      mode: options.mode,
      serverUrl: resolveServerUrl(options.serverUrl),
      seats,
      matchSeed: `${code}-${Date.now()}`,
    });

    getSessionRelayClient();
  },

  joinGuestTable: (options: {
    roomCode: string;
    playerName: string;
    mode: 'simulated' | 'websocket';
    serverUrl: string;
  }) => {
    teardownSessionRelayClient();
    const guestId = `guest-${Math.random().toString(36).slice(2, 7)}`;
    const guestName = options.playerName.trim() || 'Invitado';
    tableSessionStore.setState((prev) => ({
      ...prev,
      roomCode: options.roomCode,
      localPlayerId: guestId,
      localPlayerName: guestName,
      isHost: false,
      mode: options.mode,
      serverUrl: resolveServerUrl(options.serverUrl),
      seats: [
        {
          id: guestId,
          name: guestName,
          isBot: false,
          isHost: false,
          totalScore: 0,
          isEliminated: false,
        },
      ],
      matchSeed: `${options.roomCode}-${Date.now()}`,
    }));

    getSessionRelayClient();
  },

  setTransportMode: (mode: 'simulated' | 'websocket') => {
    tableSessionStore.setState((prev) => ({
      ...prev,
      mode,
    }));
    if (activeRelayClient && !activeRelayClient.isDestroyed()) {
      activeRelayClient.setMode(mode);
    }
  },

  setServerUrl: (serverUrl: string) => {
    tableSessionStore.setState((prev) => ({
      ...prev,
      serverUrl,
    }));
    if (activeRelayClient && !activeRelayClient.isDestroyed()) {
      activeRelayClient.setServerUrl(serverUrl);
    }
  },

  rollRoomCode: () => {
    const nextCode = generateRoomCode(4);
    tableSessionStore.setState((prev) => ({
      ...prev,
      roomCode: nextCode,
      matchSeed: `${nextCode}-${Date.now()}`,
    }));
    if (activeRelayClient && !activeRelayClient.isDestroyed()) {
      activeRelayClient.joinRoom(nextCode);
    }
    return nextCode;
  },

  leaveTable: () => {
    teardownSessionRelayClient();
  },

  addBotSeat: () => {
    tableSessionStore.setState((prev) => {
      if (prev.seats.length >= 4) return prev;
      const existingBots = prev.seats.filter((s) => s.isBot).length;
      const botIndex = existingBots + 1;
      const botId = `bot-seat-${botIndex}-${Date.now().toString(36).slice(-3)}`;
      const botName = BOT_NAMES[existingBots % BOT_NAMES.length] ?? `Bot ${botIndex}`;

      return {
        ...prev,
        seats: [
          ...prev.seats,
          {
            id: botId,
            name: botName,
            isBot: true,
            isHost: false,
            totalScore: 0,
            isEliminated: false,
          },
        ],
      };
    });
  },

  removeSeat: (seatId: string) => {
    tableSessionStore.setState((prev) => ({
      ...prev,
      seats: prev.seats.filter((s) => s.id !== seatId || s.isHost),
    }));
  },

  syncPeerSeats: (peers: ReadonlyArray<{ id: string; name: string; isHost: boolean }>) => {
    const prev = tableSessionStore.getState();
    if (!prev.isHost) return;

    const botSeats = prev.seats.filter((s) => s.isBot);
    const humanMap = new Map<string, PlayerSeat>();

    // Always include local host
    humanMap.set(prev.localPlayerId, {
      id: prev.localPlayerId,
      name: prev.localPlayerName,
      isBot: false,
      isHost: true,
      totalScore: 0,
      isEliminated: false,
    });

    for (const peer of peers) {
      if (!humanMap.has(peer.id)) {
        humanMap.set(peer.id, {
          id: peer.id,
          name: peer.name,
          isBot: false,
          isHost: peer.isHost,
          totalScore: 0,
          isEliminated: false,
        });
      }
    }

    const combined = [...humanMap.values(), ...botSeats].slice(0, 4);
    const isUnchanged =
      combined.length === prev.seats.length &&
      combined.every(
        (s, i) =>
          s.id === prev.seats[i]?.id &&
          s.name === prev.seats[i]?.name &&
          s.isBot === prev.seats[i]?.isBot &&
          s.isHost === prev.seats[i]?.isHost,
      );

    if (isUnchanged) return;

    tableSessionStore.setState({
      ...prev,
      seats: combined,
    });
  },

  syncLobbySnapshot: (payload: { seats: PlayerSeat[]; matchSeed: string }) => {
    const prev = tableSessionStore.getState();
    const isUnchanged =
      prev.matchSeed === payload.matchSeed &&
      payload.seats.length === prev.seats.length &&
      payload.seats.every(
        (s, i) =>
          s.id === prev.seats[i]?.id &&
          s.name === prev.seats[i]?.name &&
          s.isBot === prev.seats[i]?.isBot &&
          s.isHost === prev.seats[i]?.isHost,
      );

    if (isUnchanged) return;

    tableSessionStore.setState({
      ...prev,
      seats: payload.seats,
      matchSeed: payload.matchSeed,
    });
  },

  startNewMatchSeed: (newSeed?: string) => {
    const seed = newSeed ?? `seed-${Date.now()}`;
    tableSessionStore.setState((prev) => ({
      ...prev,
      matchSeed: seed,
    }));
    return seed;
  },
};

export function useTableSession() {
  const session = useExternalStore(tableSessionStore, (s) => s);
  return {
    session,
    ...tableSessionActions,
  };
}
