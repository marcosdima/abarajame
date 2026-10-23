import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useConfirm, useNavigator, type Point2D } from 'alambre';
import { useRoomRelay, useTurnEngine } from '@some-alambre/room-relay';
import {
  AppBadge,
  AppButton,
  AppDialog,
  AppText,
} from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { useSensoryCues } from '../../providers/sensory';
import { useConfig, type BotSpeed, BOT_SPEED_TIMINGS } from '../../providers/config';
import { matchHistoryActions } from '../../providers/history';
import {
  getSessionRelayClient,
  teardownSessionRelayClient,
  useTableSession,
} from '../../providers/table-session';
import {
  chinChonReducer,
  computeChinChonBotAction,
  createInitialChinChonState,
  evaluateEightCardHand,
  evaluateHandMelds,
  findClosableDiscards,
  validateChinChonAction,
  type ChinChonAction,
  type ChinChonState,
  type MeldType,
  type SpanishCard,
} from '../../engine';
import { InteractiveCardHand } from '../../components/cards/InteractiveCardHand';
import { SpanishPlayingCard } from '../../components/cards/SpanishPlayingCard';
import { TableFeltMat, type OpponentSummary } from '../../components/cards/TableFeltMat';
import { TableCardFlight } from '../../components/cards/TableCardFlight';

export default function GameTable() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { navigate } = useNavigator();
  const { confirm } = useConfirm();
  const { trigger } = useSensoryCues();
  const { session } = useTableSession();
  const { config, saveField } = useConfig();

  const botSpeed = (config.botSpeed ?? 'slow') as BotSpeed;
  const currentTimings = BOT_SPEED_TIMINGS[botSpeed] ?? BOT_SPEED_TIMINGS.slow;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'discard' | 'close' | null>(null);
  const [activeFlight, setActiveFlight] = useState<{
    id: string;
    type: 'draw_stock' | 'draw_discard' | 'discard' | 'close';
    card: SpanishCard;
    from: Point2D;
    to: Point2D;
    faceUp: boolean;
    actorId: string;
  } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [tableDimensions, setTableDimensions] = useState({ width: 360, height: 640 });
  const [feltLayout, setFeltLayout] = useState({ y: 60, height: 260 });
  const recordedMatchSeedRef = useRef<string | null>(null);

  const sessionClient = getSessionRelayClient();
  const relay = useRoomRelay({ client: sessionClient });

  const turnEngine = useTurnEngine<ChinChonState, ChinChonAction>({
    client: relay.client,
    initialState: createInitialChinChonState(session.seats, session.matchSeed),
    reducer: chinChonReducer,
    validateAction: validateChinChonAction,
  });

  const { gameState, dispatch } = turnEngine;
  const engineClient = turnEngine.engine;

  const [observedGameState, setObservedGameState] = useState<ChinChonState>(gameState);

  // Automatically start the match when entering the table from lobby
  useEffect(() => {
    if (session.isHost && gameState.phase === 'lobby' && session.seats.length >= 2) {
      engineClient.dispatch({
        type: 'START_MATCH',
        seed: session.matchSeed,
        players: session.seats,
      });
    }
  }, [engineClient, gameState.phase, session.isHost, session.matchSeed, session.seats]);

  // Broadcast authoritative snapshot whenever Host connects or a Guest peer joins
  useEffect(() => {
    if (
      session.isHost &&
      relay.status === 'connected' &&
      gameState.phase !== 'lobby'
    ) {
      engineClient.syncSnapshot();
    }
  }, [
    engineClient,
    gameState.phase,
    relay.peers.length,
    relay.status,
    session.isHost,
  ]);

  // Host-driven AI Bot Turn Execution with speed-orchestrated pacing
  useEffect(() => {
    if (!session.isHost || gameState.phase !== 'playing') return;

    const activeSeat = gameState.players.find(
      (p) => p.id === gameState.currentTurnPlayerId,
    );
    if (!activeSeat || !activeSeat.isBot) return;

    // Never execute bot actions while a card flight animation is actively running
    if (activeFlight !== null) return;

    const isDrawStep = gameState.turnStep === 'draw';
    const thinkDelay = isDrawStep
      ? currentTimings.botDrawDelayMs
      : currentTimings.botDiscardDelayMs;

    const timer = setTimeout(() => {
      const current = engineClient.getState().gameState;
      if (
        current.phase !== 'playing' ||
        current.currentTurnPlayerId !== activeSeat.id
      ) {
        return;
      }

      const botAction = computeChinChonBotAction(current, activeSeat.id);
      if (botAction) {
        if (botAction.type === 'DRAW_STOCK' || botAction.type === 'DRAW_DISCARD') {
          trigger('card_draw');
        } else if (botAction.type === 'DISCARD') {
          trigger('card_discard');
        } else if (botAction.type === 'CLOSE_ROUND') {
          trigger('round_close');
        }
        engineClient.dispatch(botAction);
      }
    }, thinkDelay);

    return () => clearTimeout(timer);
  }, [
    activeFlight,
    currentTimings.botDiscardDelayMs,
    currentTimings.botDrawDelayMs,
    engineClient,
    gameState.currentTurnPlayerId,
    gameState.phase,
    gameState.players,
    gameState.turnStep,
    session.isHost,
    trigger,
  ]);

  // Persist completed match in matchHistory collection
  useEffect(() => {
    if (
      gameState.phase === 'match_over' &&
      gameState.winnerId &&
      recordedMatchSeedRef.current !== `${gameState.seed}-${gameState.roundNumber}`
    ) {
      recordedMatchSeedRef.current = `${gameState.seed}-${gameState.roundNumber}`;
      trigger('match_win');

      const winnerSeat = gameState.players.find((p) => p.id === gameState.winnerId);
      void matchHistoryActions.add({
        id: `match-${Date.now()}`,
        gameId: 'chinchon',
        roomCode: session.roomCode,
        winnerId: gameState.winnerId,
        winnerName: winnerSeat?.name ?? gameState.winnerId,
        roundsPlayed: gameState.roundNumber,
        isChinChonWin: Boolean(gameState.lastRoundSummary?.isChinChon),
        players: gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.totalScore,
          isBot: p.isBot,
        })),
        finishedAt: Date.now(),
      });
    }
  }, [
    gameState.lastRoundSummary?.isChinChon,
    gameState.phase,
    gameState.players,
    gameState.roundNumber,
    gameState.seed,
    gameState.winnerId,
    session.roomCode,
    trigger,
  ]);

  const localPlayerId = session.localPlayerId;
  const myHand = useMemo(
    () => gameState.hands[localPlayerId] ?? [],
    [gameState.hands, localPlayerId],
  );
  const mySeat = useMemo(
    () => gameState.players.find((p) => p.id === localPlayerId),
    [gameState.players, localPlayerId],
  );

  const opponents: OpponentSummary[] = useMemo(() => {
    return gameState.players
      .filter((p) => p.id !== localPlayerId)
      .map((seat) => ({
        seat,
        cardCount: (gameState.hands[seat.id] ?? []).length,
        isCurrentTurn:
          gameState.phase === 'playing' && gameState.currentTurnPlayerId === seat.id,
      }));
  }, [gameState.currentTurnPlayerId, gameState.hands, gameState.phase, gameState.players, localPlayerId]);

  const isInteractingDisabled = activeFlight !== null;
  const isMyTurn =
    gameState.phase === 'playing' && gameState.currentTurnPlayerId === localPlayerId;
  const canDraw = isMyTurn && gameState.turnStep === 'draw' && !isInteractingDisabled;
  const canDiscard =
    isMyTurn && gameState.turnStep === 'discard' && myHand.length === 8 && !isInteractingDisabled;

  // Live Meld & Close Analysis for local player's hand
  const handAnalysis = useMemo(() => {
    const meldMap = new Map<string, MeldType>();
    const closableSet = new Set<string>();

    if (myHand.length === 8) {
      const closableOptions = findClosableDiscards(myHand);
      for (const opt of closableOptions) {
        closableSet.add(opt.discardCard.id);
      }

      // If user selected a card, evaluate the remaining 7; otherwise evaluate best 7
      const selectedIdx = selectedCardId
        ? myHand.findIndex((c) => c.id === selectedCardId)
        : -1;
      const eval7 =
        selectedIdx >= 0
          ? evaluateHandMelds(myHand.filter((_, i) => i !== selectedIdx))
          : evaluateEightCardHand(myHand).bestSevenEvaluation;

      for (const group of eval7.melds) {
        for (const card of group.cards) {
          meldMap.set(card.id, group.type);
        }
      }

      return {
        meldMap,
        closableSet,
        closableOptions,
        evaluation: eval7,
      };
    }

    const eval7 = evaluateHandMelds(myHand);
    for (const group of eval7.melds) {
      for (const card of group.cards) {
        meldMap.set(card.id, group.type);
      }
    }

    return {
      meldMap,
      closableSet,
      closableOptions: [],
      evaluation: eval7,
    };
  }, [myHand, selectedCardId]);

  const bestClosableCardId =
    selectedCardId && handAnalysis.closableSet.has(selectedCardId)
      ? selectedCardId
      : (handAnalysis.closableOptions[0]?.discardCard.id ?? null);

  const canCloseRound = canDiscard && bestClosableCardId !== null;

  // Spatial tabletop flight coordinates
  const W = tableDimensions.width;
  const H = tableDimensions.height;
  const feltCenterY = feltLayout.y + feltLayout.height * 0.65;
  const opponentY = feltLayout.y + 36;

  const stockPos = useMemo(() => ({ x: W * 0.22, y: feltCenterY }), [W, feltCenterY]);
  const discardPos = useMemo(() => ({ x: W * 0.5, y: feltCenterY }), [W, feltCenterY]);
  const closePos = useMemo(() => ({ x: W * 0.78, y: feltCenterY }), [W, feltCenterY]);
  const handPos = useMemo(
    () => ({ x: W * 0.5, y: Math.max(H - 95, feltLayout.y + feltLayout.height + 40) }),
    [W, H, feltLayout],
  );

  const getOpponentPos = useCallback(
    (playerId: string) => {
      const oppList = gameState.players.filter((p) => p.id !== localPlayerId);
      const oppIdx = oppList.findIndex((p) => p.id === playerId);
      if (oppIdx < 0) return { x: W * 0.5, y: opponentY };
      const total = oppList.length;
      const x = W * ((oppIdx + 1) / (total + 1));
      return { x, y: opponentY };
    },
    [gameState.players, localPlayerId, opponentY, W],
  );

  // Synchronous state transition flight detector to eliminate 1-frame paint flicker
  if (gameState !== observedGameState) {
    setObservedGameState(gameState);

    if (
      observedGameState.phase === 'playing' &&
      (gameState.phase === 'playing' ||
        gameState.phase === 'round_summary' ||
        gameState.phase === 'match_over')
    ) {
      const actorId = observedGameState.currentTurnPlayerId;
      const isLocal = actorId === localPlayerId;
      const actorPos = isLocal ? handPos : getOpponentPos(actorId);

      // 1. Draw from stock (stock decreased by exactly 1)
      if (observedGameState.stock.length - gameState.stock.length === 1) {
        const drawnCard: SpanishCard = isLocal
          ? (gameState.hands[localPlayerId]?.slice(-1)[0] ?? {
            suit: 'oros' as const,
            rank: 1,
            points: 1,
            id: `stock-${Date.now()}`,
          })
          : { suit: 'oros' as const, rank: 1, points: 1, id: `stock-${Date.now()}` };

        setActiveFlight({
          id: `draw-stock-${Date.now()}-${Math.random()}`,
          type: 'draw_stock',
          card: drawnCard,
          from: stockPos,
          to: actorPos,
          faceUp: isLocal,
          actorId,
        });
      }
      // 2. Draw from discard (discard decreased by exactly 1)
      else if (observedGameState.discard.length - gameState.discard.length === 1) {
        const drawnCard =
          observedGameState.discard[observedGameState.discard.length - 1];
        if (drawnCard) {
          setActiveFlight({
            id: `draw-discard-${Date.now()}-${Math.random()}`,
            type: 'draw_discard',
            card: drawnCard,
            from: discardPos,
            to: actorPos,
            faceUp: true,
            actorId,
          });
        }
      }
      // 3. Close round
      else if (!observedGameState.closeCard && gameState.closeCard) {
        setActiveFlight({
          id: `close-${Date.now()}-${Math.random()}`,
          type: 'close',
          card: gameState.closeCard,
          from: actorPos,
          to: closePos,
          faceUp: false,
          actorId,
        });
      }
      // 4. Discard card (discard increased by exactly 1)
      else if (gameState.discard.length - observedGameState.discard.length === 1) {
        const discardedCard = gameState.discard[gameState.discard.length - 1];
        if (discardedCard) {
          setActiveFlight({
            id: `discard-${Date.now()}-${Math.random()}`,
            type: 'discard',
            card: discardedCard,
            from: actorPos,
            to: discardPos,
            faceUp: true,
            actorId,
          });
        }
      }
    }
  }

  // Gracefully delay the summary modal until the closing card's flight has completed
  useEffect(() => {
    const isRoundOver =
      gameState.phase === 'round_summary' || gameState.phase === 'match_over';
    if (!isRoundOver) {
      setShowSummaryModal(false);
      return;
    }

    const delayMs = activeFlight ? currentTimings.flightDurationMs + 650 : 650;
    const timer = setTimeout(() => {
      setShowSummaryModal(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [activeFlight, currentTimings.flightDurationMs, gameState.phase]);

  const handleCycleSpeed = useCallback(() => {
    const speeds: BotSpeed[] = ['very_slow', 'slow', 'normal', 'fast'];
    const currentIdx = speeds.indexOf(botSpeed);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    void saveField('botSpeed', nextSpeed);
    trigger('card_reorder');
  }, [botSpeed, saveField, trigger]);

  const speedLabel = useMemo(() => {
    switch (botSpeed) {
      case 'very_slow':
        return lang.settings.botSpeedVerySlow;
      case 'slow':
        return lang.settings.botSpeedSlow;
      case 'normal':
        return lang.settings.botSpeedNormal;
      case 'fast':
        return lang.settings.botSpeedFast;
    }
  }, [
    botSpeed,
    lang.settings.botSpeedFast,
    lang.settings.botSpeedNormal,
    lang.settings.botSpeedSlow,
    lang.settings.botSpeedVerySlow,
  ]);

  const handleDrawStock = () => {
    if (!canDraw) return;
    trigger('card_draw');
    dispatch({ type: 'DRAW_STOCK', playerId: localPlayerId });
  };

  const handleDrawDiscard = () => {
    if (!canDraw || gameState.discard.length === 0) return;
    trigger('card_draw');
    dispatch({ type: 'DRAW_DISCARD', playerId: localPlayerId });
  };

  const handleSelectCard = useCallback(
    (id: string | null) => {
      trigger('card_select');
      setSelectedCardId(id);
    },
    [trigger],
  );

  const handleDiscardCard = useCallback(
    (card: SpanishCard) => {
      if (!canDiscard) return;
      trigger('card_discard');
      setSelectedCardId(null);
      dispatch({
        type: 'DISCARD',
        playerId: localPlayerId,
        cardId: card.id,
      });
    },
    [canDiscard, dispatch, localPlayerId, trigger],
  );

  const handleCloseRound = useCallback(
    (closingCard?: SpanishCard) => {
      const cardId = closingCard?.id ?? bestClosableCardId;
      if (!canCloseRound || !cardId) return;
      trigger('round_close');
      setSelectedCardId(null);
      dispatch({
        type: 'CLOSE_ROUND',
        playerId: localPlayerId,
        cardId,
      });
    },
    [bestClosableCardId, canCloseRound, dispatch, localPlayerId, trigger],
  );

  const handlePlayCard = useCallback(
    (card: SpanishCard, targetZone: 'discard' | 'close') => {
      if (targetZone === 'close') {
        handleCloseRound(card);
      } else {
        handleDiscardCard(card);
      }
    },
    [handleCloseRound, handleDiscardCard],
  );

  const handlePressDiscardZone = () => {
    if (canDraw && gameState.discard.length > 0) {
      handleDrawDiscard();
      return;
    }
    if (canDiscard && selectedCardId) {
      const card = myHand.find((c) => c.id === selectedCardId);
      if (card) {
        handleDiscardCard(card);
      }
    }
  };

  const handleAutoSort = () => {
    trigger('card_reorder');
    dispatch({ type: 'AUTO_SORT_HAND', playerId: localPlayerId });
  };

  const handleReorderCards = useCallback(
    (orderedCardIds: string[]) => {
      trigger('card_reorder');
      dispatch({
        type: 'REORDER_HAND',
        playerId: localPlayerId,
        orderedCardIds,
      });
    },
    [dispatch, localPlayerId, trigger],
  );

  const handleLeaveTable = async () => {
    const ok = await confirm({
      title: lang.table.leaveTableTitle,
      message: lang.table.leaveTableMessage,
      tone: 'danger',
      confirmLabel: lang.table.leaveConfirm,
      cancelLabel: lang.common.cancel,
    });
    if (ok) {
      teardownSessionRelayClient();
      navigate('home');
    }
  };

  const activeTurnSeat = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId,
  );

  const statusPrompt = isMyTurn
    ? gameState.turnStep === 'draw'
      ? lang.table.yourTurnDraw
      : lang.table.yourTurnDiscard
    : `${lang.table.waitingTurn} ${activeTurnSeat?.name ?? '...'}...`;

  // Synchronize displayed cards on felt and hand so flight kinetics match tabletop state
  const displayDiscardPile = useMemo(() => {
    if (activeFlight?.type === 'discard') {
      return gameState.discard.slice(0, -1);
    }
    return gameState.discard;
  }, [activeFlight, gameState.discard]);

  const displayCloseCard = useMemo(() => {
    if (activeFlight?.type === 'close') {
      return null;
    }
    return gameState.closeCard;
  }, [activeFlight, gameState.closeCard]);

  const displayHandCards = useMemo(() => {
    if (
      (activeFlight?.type === 'draw_stock' || activeFlight?.type === 'draw_discard') &&
      activeFlight.actorId === localPlayerId &&
      myHand.length === 8
    ) {
      return myHand.slice(0, -1);
    }
    return myHand;
  }, [activeFlight, localPlayerId, myHand]);

  const displayOpponents: OpponentSummary[] = useMemo(() => {
    return opponents.map((opp) => {
      const isDrawing =
        (activeFlight?.type === 'draw_stock' || activeFlight?.type === 'draw_discard') &&
        activeFlight.actorId === opp.seat.id;
      return {
        ...opp,
        cardCount: isDrawing ? Math.max(0, opp.cardCount - 1) : opp.cardCount,
      };
    });
  }, [activeFlight, opponents]);

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setTableDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }}
      style={[styles.screenContainer, { backgroundColor: theme.background }]}
    >
      {/* Top Bar: Room Info, Round Badge, Speed Badge & Leave Button */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.topBadges}>
          <AppBadge
            label={`${lang.table.roundBadge} ${gameState.roundNumber}`}
            tone="primary"
            variant="solid"
            size="sm"
          />
          <AppBadge
            label={
              session.mode === 'simulated'
                ? `${lang.table.localBadge} • ${lang.table.limitBadge}`
                : `${session.roomCode} • ${lang.table.limitBadge}`
            }
            tone="neutral"
            variant="soft"
            size="sm"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${lang.table.speedBadge}: ${speedLabel}`}
            onPress={handleCycleSpeed}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <AppBadge
              label={`⚡ ${speedLabel}`}
              tone={
                botSpeed === 'slow'
                  ? 'primary'
                  : botSpeed === 'very_slow'
                    ? 'warning'
                    : 'neutral'
              }
              variant="soft"
              size="sm"
            />
          </Pressable>
        </View>

        <AppButton
          variant="ghost"
          tone="danger"
          size="sm"
          label={lang.table.leaveConfirm}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          onPress={() => void handleLeaveTable()}
        />
      </View>

      {/* Center Tabletop Felt Mat */}
      <View
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          if (height > 0) {
            setFeltLayout({ y: Math.round(y), height: Math.round(height) });
          }
        }}
      >
        <TableFeltMat
          opponents={displayOpponents}
          stockCount={gameState.stock.length}
          discardPile={displayDiscardPile}
          closeCard={displayCloseCard}
          canDrawStock={canDraw && (gameState.stock.length > 0 || gameState.discard.length > 1)}
          canDrawDiscard={canDraw && gameState.discard.length > 0}
          canDiscardToPile={canDiscard && selectedCardId !== null}
          canCloseRound={canCloseRound}
          onPressStock={handleDrawStock}
          onPressDiscard={handlePressDiscardZone}
          onPressCloseZone={() => handleCloseRound()}
          statusPrompt={statusPrompt}
          hoveredZone={hoveredZone}
        />
      </View>

      {/* Local Player Hand Dock */}
      <View
        style={[
          styles.handPanel,
          {
            backgroundColor: theme.surface,
            borderColor: isMyTurn ? theme.primary : theme.border,
          },
        ]}
      >
        {/* Hand Status & Meld Indicators */}
        <View style={styles.handHeaderRow}>
          <View style={styles.playerInfoRow}>
            <AppText style={[styles.playerNameText, { color: theme.color }]}>
              {mySeat?.name ?? session.localPlayerName} ({myHand.length})
            </AppText>
            <AppBadge
              label={`${mySeat?.totalScore ?? 0} ${lang.common.points}`}
              tone="primary"
              variant="soft"
              size="sm"
            />
          </View>

          <View style={styles.meldBadgesRow}>
            {handAnalysis.evaluation.isChinChon ? (
              <AppBadge
                label={lang.table.chinChonReady}
                tone="warning"
                variant="solid"
                size="sm"
              />
            ) : canCloseRound || handAnalysis.evaluation.canClose ? (
              <AppBadge
                label={lang.table.canCloseBadge}
                tone="success"
                variant="solid"
                size="sm"
              />
            ) : (
              <AppBadge
                label={`${lang.table.unmeldedPointsLabel}: ${handAnalysis.evaluation.unmeldedPoints}`}
                tone="neutral"
                variant="soft"
                size="sm"
              />
            )}
          </View>
        </View>

        {/* Interactive Fan Hand (`useInteractiveHand` from `alambre`) */}
        <InteractiveCardHand
          cards={displayHandCards}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          onReorderCards={handleReorderCards}
          onPlayCard={handlePlayCard}
          canPlayCards={canDiscard}
          canCloseRound={canCloseRound}
          meldMap={handAnalysis.meldMap}
          closableCardIds={handAnalysis.closableSet}
          size="md"
          onHoverZoneChange={setHoveredZone}
        />

        {/* Action Toolbar */}
        <View style={styles.actionToolbar}>
          <AppButton
            variant="outline"
            tone="neutral"
            size="sm"
            label={lang.table.autoSort}
            disabled={myHand.length <= 1}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            onPress={handleAutoSort}
          />

          {canDraw && (
            <View style={styles.turnButtonsGroup}>
              <AppButton
                variant="solid"
                tone="primary"
                size="sm"
                label={lang.table.drawFromStock}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                onPress={handleDrawStock}
              />
              <AppButton
                variant="soft"
                tone="primary"
                size="sm"
                label={lang.table.drawFromDiscard}
                disabled={gameState.discard.length === 0}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                onPress={handleDrawDiscard}
              />
            </View>
          )}

          {canDiscard && (
            <View style={styles.turnButtonsGroup}>
              <AppButton
                variant="solid"
                tone="primary"
                size="sm"
                label={lang.table.discardSelected}
                disabled={!selectedCardId}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                onPress={() => {
                  const card = myHand.find((c) => c.id === selectedCardId);
                  if (card) handleDiscardCard(card);
                }}
              />
              {canCloseRound && (
                <AppButton
                  variant="solid"
                  tone="danger"
                  size="sm"
                  label={lang.table.closeWithSelected}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  onPress={() => handleCloseRound()}
                />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Round Summary / Match Over Dialog */}
      <AppDialog
        visible={showSummaryModal}
        onClose={() => {}}
        dismissOnBackdropPress={false}
        title={
          gameState.phase === 'match_over'
            ? lang.table.matchOverTitle
            : `${lang.table.roundSummaryTitle} #${gameState.lastRoundSummary?.roundNumber ?? gameState.roundNumber}`
        }
        tone={gameState.phase === 'match_over' ? 'primary' : 'neutral'}
      >
        {gameState.lastRoundSummary && (
          <View style={styles.summaryContent}>
            <AppText style={{ color: theme.color, fontWeight: '700' }}>
              {lang.table.closedByLabel} {gameState.lastRoundSummary.closerName}
            </AppText>

            {gameState.phase === 'match_over' && gameState.winnerId && (
              <AppBadge
                label={`${lang.table.winnerBanner} ${
                  gameState.players.find((p) => p.id === gameState.winnerId)?.name ??
                  gameState.winnerId
                }`}
                tone="success"
                variant="solid"
                size="md"
              />
            )}

            {gameState.lastRoundSummary.isChinChon && (
              <AppBadge
                label={lang.table.chinChonWinBanner}
                tone="warning"
                variant="solid"
                size="md"
              />
            )}

            <ScrollView style={styles.breakdownScroll}>
              {gameState.lastRoundSummary.breakdowns.map((item) => (
                <View
                  key={item.playerId}
                  style={[
                    styles.breakdownCard,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: item.isCloser ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View style={styles.breakdownHeader}>
                    <AppText style={[styles.breakdownName, { color: theme.color }]}>
                      {item.playerName}
                    </AppText>
                    <View style={styles.scorePills}>
                      <AppBadge
                        label={`${lang.table.roundPointsCol}: ${
                          item.roundDelta > 0 ? `+${item.roundDelta}` : item.roundDelta
                        }`}
                        tone={item.roundDelta <= 0 ? 'success' : 'neutral'}
                        variant="soft"
                        size="sm"
                      />
                      <AppBadge
                        label={`${lang.table.totalPointsCol}: ${item.newScore}`}
                        tone={item.newlyEliminated ? 'danger' : 'primary'}
                        variant="solid"
                        size="sm"
                      />
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.revealedCardsRow}
                  >
                    {item.hand.map((c) => (
                      <SpanishPlayingCard
                        key={c.id}
                        suit={c.suit}
                        rank={c.rank}
                        faceUp={true}
                        size="sm"
                      />
                    ))}
                  </ScrollView>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dialogActions}>
              {gameState.phase === 'round_summary' && session.isHost && (
                <AppButton
                  variant="solid"
                  tone="primary"
                  size="md"
                  label={lang.table.nextRoundAction}
                  onPress={() =>
                    dispatch({
                      type: 'NEXT_ROUND',
                      seed: `${session.roomCode}-${Date.now()}`,
                    })
                  }
                  fullWidth
                />
              )}

              {gameState.phase === 'match_over' && (
                <>
                  {session.isHost && (
                    <AppButton
                      variant="solid"
                      tone="primary"
                      size="md"
                      label={lang.table.rematchAction}
                      onPress={() =>
                        dispatch({
                          type: 'REMATCH',
                          seed: `${session.roomCode}-${Date.now()}`,
                        })
                      }
                      fullWidth
                    />
                  )}
                  <AppButton
                    variant="outline"
                    tone="neutral"
                    size="md"
                    label={lang.table.backToLobby}
                    onPress={() => navigate('home', { subpage: 'lobby' })}
                    fullWidth
                  />
                </>
              )}
            </View>
          </View>
        )}
      </AppDialog>

      {activeFlight && (
        <TableCardFlight
          key={activeFlight.id}
          card={activeFlight.card}
          from={activeFlight.from}
          to={activeFlight.to}
          faceUp={activeFlight.faceUp}
          durationMs={currentTimings.flightDurationMs}
          onComplete={() => setActiveFlight(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-between',
    gap: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  topBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handPanel: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  handHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  meldBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  turnButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryContent: {
    gap: 10,
    maxHeight: 420,
  },
  breakdownScroll: {
    maxHeight: 270,
  },
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  scorePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revealedCardsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  dialogActions: {
    gap: 8,
    marginTop: 4,
  },
});
