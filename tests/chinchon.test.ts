import { describe, expect, it } from 'vitest';
import {
  autoSortHand,
  chinChonReducer,
  classifyMeld,
  computeChinChonBotAction,
  createInitialChinChonState,
  createSpanishDeck,
  evaluateHandMelds,
  findClosableDiscards,
  getCardPoints,
  shuffleSpanishDeck,
  validateChinChonAction,
  type PlayerSeat,
  type SpanishCard,
} from '../src/engine';

function card(suit: SpanishCard['suit'], rank: SpanishCard['rank'], idSuffix?: string): SpanishCard {
  return {
    id: idSuffix ? `${suit}-${rank}-${idSuffix}` : `${suit}-${rank}`,
    suit,
    rank,
    points: getCardPoints(suit, rank),
  };
}

describe('Spanish Deck & Deterministic Shuffle', () => {
  it('builds 40, 48, and 50 card decks accurately', () => {
    expect(createSpanishDeck({ includeEightsAndNines: false, jokerCount: 0 })).toHaveLength(40);
    expect(createSpanishDeck({ includeEightsAndNines: true, jokerCount: 0 })).toHaveLength(48);

    const deck50 = createSpanishDeck({ includeEightsAndNines: true, jokerCount: 2 });
    expect(deck50).toHaveLength(50);
    expect(deck50.filter((c) => c.suit === 'joker')).toHaveLength(2);
  });

  it('produces identical permutations for identical seeds via @some-alambre/room-relay', () => {
    const deck = createSpanishDeck();
    const s1 = shuffleSpanishDeck(deck, 'room-XK89-r1');
    const s2 = shuffleSpanishDeck(deck, 'room-XK89-r1');
    const s3 = shuffleSpanishDeck(deck, 'room-XK89-r2');

    expect(s1.map((c) => c.id)).toEqual(s2.map((c) => c.id));
    expect(s1.map((c) => c.id)).not.toEqual(s3.map((c) => c.id));
  });
});

describe('Chin Chón Meld Solver', () => {
  it('detects pure escalera and escalera with 1 Joker in internal gap', () => {
    const pure = classifyMeld([card('oros', 4), card('oros', 2), card('oros', 3)]);
    expect(pure?.type).toBe('escalera');
    expect(pure?.hasJoker).toBe(false);
    expect(pure?.cards.map((c) => c.rank)).toEqual([2, 3, 4]);

    const gapped = classifyMeld([card('copas', 5), card('copas', 7), card('joker', 0)]);
    expect(gapped?.type).toBe('escalera');
    expect(gapped?.hasJoker).toBe(true);
    expect(gapped?.cards.map((c) => c.rank)).toEqual([5, 0, 7]);
  });

  it('detects pierna of 3 or 4 cards and rejects invalid combinations', () => {
    const pierna = classifyMeld([card('oros', 10), card('espadas', 10), card('bastos', 10)]);
    expect(pierna?.type).toBe('pierna');

    const piernaWithJoker = classifyMeld([card('oros', 12), card('copas', 12), card('joker', 0)]);
    expect(piernaWithJoker?.type).toBe('pierna');
    expect(piernaWithJoker?.hasJoker).toBe(true);

    // Reject gap of 2 with only 1 Joker
    expect(classifyMeld([card('oros', 1), card('oros', 4), card('joker', 0)])).toBeNull();
  });

  it('detects pure 7-card Chin Chón and awards -100 instant win delta', () => {
    const hand7 = [
      card('espadas', 1),
      card('espadas', 2),
      card('espadas', 3),
      card('espadas', 4),
      card('espadas', 5),
      card('espadas', 6),
      card('espadas', 7),
    ];
    const evalResult = evaluateHandMelds(hand7);
    expect(evalResult.isChinChon).toBe(true);
    expect(evalResult.canClose).toBe(true);
    expect(evalResult.closeScoreDelta).toBe(-100);
  });

  it('detects -10 bonus when all 7 cards are melded across 2 groups (4 + 3)', () => {
    const hand7 = [
      card('oros', 1),
      card('oros', 2),
      card('oros', 3),
      card('oros', 4),
      card('copas', 9),
      card('espadas', 9),
      card('bastos', 9),
    ];
    const evalResult = evaluateHandMelds(hand7);
    expect(evalResult.isChinChon).toBe(false);
    expect(evalResult.canClose).toBe(true);
    expect(evalResult.unmeldedCards).toHaveLength(0);
    expect(evalResult.closeScoreDelta).toBe(-10);
  });

  it('allows closing with 1 loose card <= 5 and forbids closing with loose card > 5', () => {
    const closable7 = [
      card('oros', 1),
      card('oros', 2),
      card('oros', 3),
      card('copas', 7),
      card('espadas', 7),
      card('bastos', 7),
      card('bastos', 4), // loose 4 <= 5
    ];
    const evalOk = evaluateHandMelds(closable7);
    expect(evalOk.canClose).toBe(true);
    expect(evalOk.closeScoreDelta).toBe(4);

    const nonClosable7 = [
      ...closable7.slice(0, 6),
      card('bastos', 8), // loose 8 > 5
    ];
    const evalNo = evaluateHandMelds(nonClosable7);
    expect(evalNo.canClose).toBe(false);
    expect(evalNo.unmeldedPoints).toBe(8);
  });

  it('identifies closable discards from an 8-card hand and auto-sorts cleanly', () => {
    const hand8 = [
      card('bastos', 12), // high trash card to discard
      card('oros', 1),
      card('oros', 2),
      card('oros', 3),
      card('copas', 7),
      card('espadas', 7),
      card('bastos', 7),
      card('bastos', 3),
    ];
    const closable = findClosableDiscards(hand8);
    expect(closable.length).toBeGreaterThan(0);
    expect(closable[0]!.discardCard.id).toBe('bastos-12');
    expect(closable[0]!.evaluation.closeScoreDelta).toBe(3);

    const sorted = autoSortHand(hand8);
    expect(sorted).toHaveLength(8);
    expect(sorted[sorted.length - 1]!.id).toBe('bastos-12');
  });
});

describe('Chin Chón TurnReducer & Bot Policy', () => {
  const basePlayers: PlayerSeat[] = [
    { id: 'host-1', name: 'Marcos', isBot: false, isHost: true, totalScore: 0, isEliminated: false },
    { id: 'bot-1', name: 'Gaucho Bot', isBot: true, isHost: false, totalScore: 0, isEliminated: false },
  ];

  it('starts a match, deals 7 cards per player, and processes draw + discard', () => {
    let state = createInitialChinChonState(basePlayers, 'test-seed');
    state = chinChonReducer(state, { type: 'START_MATCH', seed: 'test-seed' });

    expect(state.phase).toBe('playing');
    expect(state.hands['host-1']).toHaveLength(7);
    expect(state.hands['bot-1']).toHaveLength(7);
    expect(state.discard).toHaveLength(1);
    expect(state.stock).toHaveLength(50 - 14 - 1);
    expect(state.currentTurnPlayerId).toBe('host-1');
    expect(state.turnStep).toBe('draw');

    expect(
      validateChinChonAction(state, { type: 'DRAW_STOCK', playerId: 'host-1' }, 'host-1'),
    ).toBe(true);
    expect(
      validateChinChonAction(state, { type: 'DRAW_STOCK', playerId: 'bot-1' }, 'bot-1'),
    ).toBe(false);

    state = chinChonReducer(state, { type: 'DRAW_STOCK', playerId: 'host-1' });
    expect(state.turnStep).toBe('discard');
    expect(state.hands['host-1']).toHaveLength(8);

    const cardToDiscard = state.hands['host-1']![0]!;
    state = chinChonReducer(state, {
      type: 'DISCARD',
      playerId: 'host-1',
      cardId: cardToDiscard.id,
    });

    expect(state.currentTurnPlayerId).toBe('bot-1');
    expect(state.turnStep).toBe('draw');
    expect(state.hands['host-1']).toHaveLength(7);

    // Bot can compute a valid draw and discard action
    const botDraw = computeChinChonBotAction(state, 'bot-1');
    expect(botDraw).not.toBeNull();
    // Host is permitted to dispatch on behalf of bot-1
    expect(validateChinChonAction(state, botDraw!, 'host-1')).toBe(true);

    state = chinChonReducer(state, botDraw!);
    const botDiscard = computeChinChonBotAction(state, 'bot-1');
    expect(botDiscard).not.toBeNull();
    state = chinChonReducer(state, botDiscard!);
    expect(state.currentTurnPlayerId).toBe('host-1');
  });

  it('scores a round when a player closes and eliminates players exceeding 100 points', () => {
    const nearLimitPlayers: PlayerSeat[] = [
      { id: 'host-1', name: 'Marcos', isBot: false, isHost: true, totalScore: 10, isEliminated: false },
      { id: 'bot-1', name: 'Gaucho Bot', isBot: true, isHost: false, totalScore: 90, isEliminated: false },
    ];

    let state = createInitialChinChonState(nearLimitPlayers, 'close-seed');
    state = chinChonReducer(state, { type: 'START_MATCH', seed: 'close-seed' });

    // Give host-1 an 8-card hand ready to close with -10 bonus in a mid-match round
    state = {
      ...state,
      players: nearLimitPlayers,
      turnStep: 'discard',
      hands: {
        'host-1': [
          card('oros', 1),
          card('oros', 2),
          card('oros', 3),
          card('oros', 4),
          card('copas', 7),
          card('espadas', 7),
          card('bastos', 7),
          card('bastos', 12), // close discard
        ],
        'bot-1': [
          card('oros', 12),
          card('copas', 11),
          card('espadas', 10),
          card('bastos', 9),
          card('oros', 8),
          card('copas', 6),
          card('espadas', 5),
        ],
      },
    };

    expect(
      validateChinChonAction(
        state,
        { type: 'CLOSE_ROUND', playerId: 'host-1', cardId: 'bastos-12' },
        'host-1',
      ),
    ).toBe(true);

    state = chinChonReducer(state, {
      type: 'CLOSE_ROUND',
      playerId: 'host-1',
      cardId: 'bastos-12',
    });

    expect(state.phase).toBe('match_over');
    expect(state.winnerId).toBe('host-1');
    expect(state.players.find((p) => p.id === 'host-1')?.totalScore).toBe(0); // 10 - 10 = 0
    expect(state.players.find((p) => p.id === 'bot-1')?.isEliminated).toBe(true);
  });

  it('synchronizes host and guest peers over @some-alambre/room-relay createTurnEngine', async () => {
    const { createSimulatedRelayHub, createRoomRelay, createTurnEngine } = await import(
      '@some-alambre/room-relay'
    );

    const hub = createSimulatedRelayHub();
    const peers: PlayerSeat[] = [
      { id: 'host-peer', name: 'Host', isBot: false, isHost: true, totalScore: 0, isEliminated: false },
      { id: 'guest-peer', name: 'Guest', isBot: false, isHost: false, totalScore: 0, isEliminated: false },
    ];

    const hostRelay = createRoomRelay({
      roomCode: 'AB12',
      playerId: 'host-peer',
      playerName: 'Host',
      isHost: true,
      mode: 'simulated',
      simulatedHub: hub,
      simulatedLatencyMs: 0,
      autoConnect: true,
    });

    const guestRelay = createRoomRelay({
      roomCode: 'AB12',
      playerId: 'guest-peer',
      playerName: 'Guest',
      isHost: false,
      mode: 'simulated',
      simulatedHub: hub,
      simulatedLatencyMs: 0,
      autoConnect: true,
    });

    const hostEngine = createTurnEngine({
      client: hostRelay,
      initialState: createInitialChinChonState(peers, 'relay-seed'),
      reducer: chinChonReducer,
      validateAction: validateChinChonAction,
    });

    const guestEngine = createTurnEngine({
      client: guestRelay,
      initialState: createInitialChinChonState(peers, 'relay-seed'),
      reducer: chinChonReducer,
      validateAction: validateChinChonAction,
    });

    // Wait for simulated relay hub initial connection
    await new Promise((r) => setTimeout(r, 25));

    hostEngine.dispatch({ type: 'START_MATCH', seed: 'relay-seed', players: peers });

    // Wait for simulated transport delivery (includes up to 16ms jitter per hop)
    await new Promise((r) => setTimeout(r, 40));

    expect(guestEngine.getState().gameState.phase).toBe('playing');
    expect(guestEngine.getState().gameState.hands['guest-peer']).toHaveLength(7);

    // Host draws from stock and discards
    hostEngine.dispatch({ type: 'DRAW_STOCK', playerId: 'host-peer' });
    const hostCardId = hostEngine.getState().gameState.hands['host-peer']![0]!.id;
    hostEngine.dispatch({ type: 'DISCARD', playerId: 'host-peer', cardId: hostCardId });

    await new Promise((r) => setTimeout(r, 40));

    expect(guestEngine.getState().gameState.currentTurnPlayerId).toBe('guest-peer');

    // Guest dispatches intent over relay -> Host commits -> Guest receives commit (2 hops)
    guestEngine.dispatch({ type: 'DRAW_DISCARD', playerId: 'guest-peer' });
    await new Promise((r) => setTimeout(r, 60));

    expect(hostEngine.getState().gameState.hands['guest-peer']).toHaveLength(8);
    expect(guestEngine.getState().gameState.hands['guest-peer']).toHaveLength(8);

    hostEngine.destroy();
    guestEngine.destroy();
  });

  it('prevents infinite update loops on tableSessionStore and relay send with maxHistoryLength: 0', async () => {
    const { tableSessionStore, tableSessionActions } = await import(
      '../src/providers/table-session'
    );
    const { createSimulatedRelayHub, createRoomRelay } = await import(
      '@some-alambre/room-relay'
    );

    tableSessionActions.createHostTable({
      playerName: 'Marcos',
      mode: 'simulated',
      serverUrl: 'wss://relay.alambre.party/room',
    });

    const initialSession = tableSessionStore.getState();
    let storeNotificationCount = 0;
    const unsubStore = tableSessionStore.subscribe(() => {
      storeNotificationCount += 1;
    });

    // Calling syncPeerSeats with empty peers when only host + bot are seated must be a no-op
    tableSessionActions.syncPeerSeats([]);
    expect(storeNotificationCount).toBe(0);
    expect(tableSessionStore.getState()).toBe(initialSession);

    // Calling syncLobbySnapshot with identical seats and matchSeed must also be a no-op
    tableSessionActions.syncLobbySnapshot({
      seats: initialSession.seats,
      matchSeed: initialSession.matchSeed,
    });
    expect(storeNotificationCount).toBe(0);
    expect(tableSessionStore.getState()).toBe(initialSession);

    unsubStore();

    // Verify relay with maxHistoryLength: 0 does not emit state notifications when sending LOBBY_SYNC
    const hub = createSimulatedRelayHub();
    const relay = createRoomRelay({
      roomCode: initialSession.roomCode,
      playerId: initialSession.localPlayerId,
      playerName: initialSession.localPlayerName,
      isHost: true,
      mode: 'simulated',
      simulatedHub: hub,
      simulatedLatencyMs: 0,
      maxHistoryLength: 0,
      autoConnect: true,
    });

    await new Promise((r) => setTimeout(r, 25));
    expect(relay.getState().status).toBe('connected');

    const stateBeforeSend = relay.getState();
    let relayStateChangeCount = 0;
    const unsubRelay = relay.subscribe(() => {
      relayStateChangeCount += 1;
    });

    relay.send('LOBBY_SYNC', {
      seats: initialSession.seats,
      matchSeed: initialSession.matchSeed,
    });

    expect(relayStateChangeCount).toBe(0);
    expect(relay.getState()).toBe(stateBeforeSend);

    unsubRelay();
    relay.destroy();
  });

  it('safely handles REORDER_HAND dispatch without mutating unexpected state', () => {
    const seats: PlayerSeat[] = [
      { id: 'p1', name: 'Alice', isHost: true, isBot: false, totalScore: 0, isEliminated: false },
      { id: 'p2', name: 'Bob', isHost: false, isBot: true, totalScore: 0, isEliminated: false },
    ];
    let state = createInitialChinChonState(seats, 'reorder-seed');
    state = chinChonReducer(state, { type: 'START_MATCH', seed: 'reorder-seed', players: seats });

    const originalHand = state.hands['p1'];
    expect(originalHand).toBeDefined();
    expect(originalHand.length).toBe(7);

    const reversedIds = [...originalHand].reverse().map((c) => c.id);
    const reorderedState = chinChonReducer(state, {
      type: 'REORDER_HAND',
      playerId: 'p1',
      orderedCardIds: reversedIds,
    });

    expect(reorderedState.hands['p1'].map((c) => c.id)).toEqual(reversedIds);
    expect(reorderedState.phase).toBe('playing');
    expect(reorderedState.turnStep).toBe(state.turnStep);
  });

  it('correctly executes AUTO_SORT_HAND action to organize melds followed by unmelded cards', () => {
    const seats: PlayerSeat[] = [
      { id: 'p1', name: 'Alice', isHost: true, isBot: false, totalScore: 0, isEliminated: false },
      { id: 'p2', name: 'Bob', isHost: false, isBot: true, totalScore: 0, isEliminated: false },
    ];
    let state = createInitialChinChonState(seats, 'autosort-test-seed');
    state = chinChonReducer(state, { type: 'START_MATCH', seed: 'autosort-test-seed', players: seats });

    // Inject an unorganized hand with a valid pierna (10 of oros, copas, bastos) and unmelded cards
    const customHand: SpanishCard[] = [
      card('copas', 2),
      card('oros', 10),
      card('espadas', 5),
      card('copas', 10),
      card('bastos', 1),
      card('bastos', 10),
      card('oros', 7),
    ];
    state = {
      ...state,
      hands: {
        ...state.hands,
        p1: customHand,
      },
    };

    const sortedState = chinChonReducer(state, {
      type: 'AUTO_SORT_HAND',
      playerId: 'p1',
    });

    const sortedCards = sortedState.hands['p1'];
    expect(sortedCards).toBeDefined();
    expect(sortedCards).toHaveLength(7);

    // The pierna of 10s should be grouped together at the front
    const firstThreeRanks = sortedCards.slice(0, 3).map((c) => c.rank);
    expect(firstThreeRanks).toEqual([10, 10, 10]);
  });
});

