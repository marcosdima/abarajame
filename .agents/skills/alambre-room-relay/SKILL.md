---
name: alambre-room-relay
description: Real-time multiplayer room synchronization, authoritative turn engines, and deterministic seeded PRNG using @some-alambre/room-relay. Use whenever building multi-device or local simulated multiplayer rooms, turn-based state synchronization (useRoomRelay, useTurnEngine), room codes (generateRoomCode), or deterministic shuffling (createSeededRng, shuffleWithSeed).
---

# `@some-alambre/room-relay` Multiplayer & Turn Engine

`@some-alambre/room-relay` provides lightweight, headless ephemeral room synchronization over WebSockets or an in-memory simulated hub (for single-device/split-screen testing), plus an authoritative host-driven turn engine and deterministic PRNG.

---

## 1. Room Codes (`generateRoomCode`, `sanitizeRoomCode`)

Uses an unambiguous alphabet (`ROOM_CODE_ALPHABET`, excluding `0/O`, `1/I/L`):

```ts
import { generateRoomCode, sanitizeRoomCode } from '@some-alambre/room-relay';

const code = generateRoomCode(5); // e.g. "K7M4P"
const clean = sanitizeRoomCode(userInput);
```

---

## 2. Connecting to a Room (`useRoomRelay`)

Supports two transport modes:
- `'simulated'`: In-memory `defaultSimulatedHub` (instant multi-peer testing in one process with optional simulated latency).
- `'websocket'`: Real `WebSocketRelayTransport` connecting to `ws://<host>:<port>`.

```tsx
import { useRoomRelay } from '@some-alambre/room-relay';

const relay = useRoomRelay({
  peerId: 'player-1',
  displayName: 'Marcos',
  mode: 'simulated', // 'simulated' | 'websocket'
  url: 'ws://localhost:8787', // required when mode === 'websocket'
});

// Actions:
await relay.joinRoom('K7M4P');
relay.sendEvent('chat:message', { text: 'Hello!' });
relay.leaveRoom();

// Reactive state:
// relay.status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
// relay.roomCode: string | null
// relay.peers: RelayPeer[]
// relay.hostPeerId: string | null
// relay.isHost: boolean
```

---

## 3. Authoritative Turn Engine (`useTurnEngine`)

Coordinates deterministic turn-based or reducer-driven state across peers in a room. The host peer acts as the authoritative committer; guests send action intents that the host validates, reduces, and broadcasts with monotonic version numbers:

```tsx
import { useTurnEngine } from '@some-alambre/room-relay';

type GameState = {
  turnIndex: number;
  scores: Record<string, number>;
};

type GameAction =
  | { type: 'SCORE'; points: number }
  | { type: 'END_TURN' };

const gameReducer = (
  state: GameState,
  action: GameAction,
  meta: { actorPeerId: string; version: number; timestamp: number },
): GameState => {
  switch (action.type) {
    case 'SCORE':
      return {
        ...state,
        scores: {
          ...state.scores,
          [meta.actorPeerId]: (state.scores[meta.actorPeerId] ?? 0) + action.points,
        },
      };
    case 'END_TURN':
      return { ...state, turnIndex: state.turnIndex + 1 };
    default:
      return state;
  }
};

const { state, version, isHost, dispatch, resetState, requestSync } = useTurnEngine<
  GameState,
  GameAction
>({
  client: relay.client,
  initialState: { turnIndex: 0, scores: {} },
  reducer: gameReducer,
});

// Any peer (host or guest) dispatches actions identically:
dispatch({ type: 'SCORE', points: 10 });
```

---

## 4. Deterministic Seeded PRNG (`createSeededRng`, `shuffleWithSeed`)

Share a seed string (e.g. `roomCode + roundNumber`) across peers so every device computes identical random sequences or deck shuffles without transmitting full arrays:

```ts
import { createSeededRng, shuffleWithSeed } from '@some-alambre/room-relay';

const rng = createSeededRng('K7M4P-round-1');
const roll = rng.nextInt(1, 6); // deterministic integer in [1, 6]

const shuffledDeck = shuffleWithSeed(cards, 'K7M4P-round-1');
```
