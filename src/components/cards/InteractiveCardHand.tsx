import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  calculateResponsiveHandFan,
  reorderHandItems,
  resolveHandReorderIndex,
  type HandFanSlot,
} from 'alambre';
import { useLang } from '../../providers/lang';
import { SpanishPlayingCard } from './SpanishPlayingCard';
import type { MeldType, SpanishCard } from '../../engine';

export interface InteractiveCardHandProps {
  cards: readonly SpanishCard[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  onReorderCards: (orderedCardIds: string[]) => void;
  onPlayCard?: (card: SpanishCard, targetZone: 'discard' | 'close') => void;
  canPlayCards?: boolean;
  canCloseRound?: boolean;
  meldMap?: ReadonlyMap<string, MeldType>;
  closableCardIds?: ReadonlySet<string>;
  size?: 'sm' | 'md' | 'lg';
  onHoverZoneChange?: (zone: 'discard' | 'close' | null) => void;
}

const DIRECT_CARD_SPRING = {
  damping: 38,
  stiffness: 420,
  mass: 0.45,
  overshootClamping: true,
};

export const InteractiveCardHand = memo(function InteractiveCardHand({
  cards,
  selectedCardId,
  onSelectCard,
  onReorderCards,
  onPlayCard,
  canPlayCards = false,
  canCloseRound = false,
  meldMap,
  closableCardIds,
  size = 'md',
  onHoverZoneChange,
}: InteractiveCardHandProps) {
  const [containerWidth, setContainerWidth] = useState<number>(320);
  const [orderedCards, setOrderedCards] = useState<readonly SpanishCard[]>(cards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOriginIndexRef = useRef<number>(-1);
  const initialOrderRef = useRef<readonly string[]>([]);

  // Sync external order changes (e.g. from AUTO_SORT_HAND or dealing) when not dragging
  useEffect(() => {
    if (draggingId === null) {
      setOrderedCards(cards);
    }
  }, [cards, draggingId]);

  const selectedIds = useMemo(
    () => (selectedCardId ? [selectedCardId] : []),
    [selectedCardId],
  );

  const fanOptions = useMemo(
    () => ({
      containerWidth,
      maxSpan: Math.max(240, containerWidth - 36),
      baseSpacing: 36,
      spreadAngle: 4.2,
      arcCurvature: 3,
      selectedLift: 18,
      selectedScale: 1.08,
      selectedIds,
    }),
    [containerWidth, selectedIds],
  );

  const fan = useMemo(() => {
    return calculateResponsiveHandFan(orderedCards, fanOptions);
  }, [orderedCards, fanOptions]);

  const beginDrag = useCallback(
    (id: string) => {
      const idx = orderedCards.findIndex((c) => c.id === id);
      dragOriginIndexRef.current = idx;
      initialOrderRef.current = orderedCards.map((c) => c.id);
      setDraggingId(id);
    },
    [orderedCards],
  );

  const updateDragOffset = useCallback(
    (id: string, translationX: number, translationY: number) => {
      const originIndex = dragOriginIndexRef.current;
      if (originIndex < 0) return;

      const isLiftingToTable = translationY < -75;
      if (isLiftingToTable) {
        // Detect table target zone based on horizontal displacement
        const draggedIndex = orderedCards.findIndex((c) => c.id === id);
        const slot = fan.slots[draggedIndex];
        const currentX = (slot?.translateX ?? 0) + translationX;
        const targetZone = currentX > 45 ? 'close' : 'discard';
        onHoverZoneChange?.(targetZone);
      } else {
        onHoverZoneChange?.(null);
        // Reordering within the hand fan anchored to pickup index
        const targetIndex = resolveHandReorderIndex(
          originIndex,
          translationX,
          fan.effectiveSpacing,
          orderedCards.length,
        );
        const currentIndex = orderedCards.findIndex((c) => c.id === id);
        if (currentIndex >= 0 && targetIndex !== currentIndex) {
          setOrderedCards((prev) => reorderHandItems(prev, currentIndex, targetIndex));
        }
      }
    },
    [fan.effectiveSpacing, fan.slots, onHoverZoneChange, orderedCards],
  );

  const endDrag = useCallback(
    (id: string, translationX: number, translationY: number, velocityY = 0) => {
      const currentIndex = orderedCards.findIndex((c) => c.id === id);
      setDraggingId(null);
      dragOriginIndexRef.current = -1;
      onHoverZoneChange?.(null);

      const isLiftingToTable =
        translationY < -75 || (translationY < -45 && velocityY < -300);

      if (isLiftingToTable && currentIndex >= 0) {
        const item = orderedCards[currentIndex];
        if (item) {
          const slot = fan.slots[currentIndex];
          const currentX = (slot?.translateX ?? 0) + translationX;
          const isOverCloseZone = currentX > 45;

          if (isOverCloseZone) {
            // Dropped in Close zone
            if (canCloseRound && (closableCardIds?.has(item.id) ?? false)) {
              queueMicrotask(() => {
                onPlayCard?.(item, 'close');
              });
              return;
            }
            // If dropped over Close zone but cannot close, do NOT discard accidentally!
            // Card restitutes cleanly back to hand
          } else {
            // Dropped in Discard zone
            if (canPlayCards && onPlayCard) {
              queueMicrotask(() => {
                onPlayCard(item, 'discard');
              });
              return;
            }
          }
        }
      }

      // Reordering commit if dropped within hand
      const initialOrder = initialOrderRef.current;
      const currentOrder = orderedCards.map((c) => c.id);
      const hasChanged =
        initialOrder.length === currentOrder.length &&
        initialOrder.some((val, idx) => val !== currentOrder[idx]);

      if (hasChanged) {
        queueMicrotask(() => {
          onReorderCards(currentOrder);
        });
      }
    },
    [
      canCloseRound,
      canPlayCards,
      closableCardIds,
      fan.slots,
      onHoverZoneChange,
      onPlayCard,
      onReorderCards,
      orderedCards,
    ],
  );

  const toggleSelect = useCallback(
    (id: string) => {
      onSelectCard(selectedCardId === id ? null : id);
    },
    [onSelectCard, selectedCardId],
  );

  return (
    <View
      onLayout={(e) => {
        const nextWidth = Math.round(e.nativeEvent.layout.width);
        if (nextWidth > 0) {
          setContainerWidth((prev) => (Math.abs(prev - nextWidth) > 1 ? nextWidth : prev));
        }
      }}
      style={styles.handContainer}
    >
      {fan.slots.map((slot) => (
        <InteractiveHandSlotItem
          key={slot.card.id}
          slot={slot}
          isSelected={selectedCardId === slot.card.id}
          isDragging={draggingId === slot.card.id}
          meldType={meldMap?.get(slot.card.id) ?? null}
          canCloseWith={closableCardIds?.has(slot.card.id) ?? false}
          size={size}
          onToggleSelect={() => toggleSelect(slot.card.id)}
          onBeginDrag={() => beginDrag(slot.card.id)}
          onUpdateDrag={(tx, ty) => updateDragOffset(slot.card.id, tx, ty)}
          onEndDrag={(tx, ty, vy) => endDrag(slot.card.id, tx, ty, vy)}
        />
      ))}
    </View>
  );
});

interface InteractiveHandSlotItemProps {
  slot: HandFanSlot<SpanishCard>;
  isSelected: boolean;
  isDragging: boolean;
  meldType: MeldType | null;
  canCloseWith: boolean;
  size: 'sm' | 'md' | 'lg';
  onToggleSelect: () => void;
  onBeginDrag: () => void;
  onUpdateDrag: (tx: number, ty: number) => void;
  onEndDrag: (tx: number, ty: number, vy: number) => void;
}

function InteractiveHandSlotItem({
  slot,
  isSelected,
  isDragging,
  meldType,
  canCloseWith,
  size,
  onToggleSelect,
  onBeginDrag,
  onUpdateDrag,
  onEndDrag,
}: InteractiveHandSlotItemProps) {
  const { card } = slot;
  const { lang } = useLang();
  const reducedMotion = useReducedMotion();

  const callbacksRef = useRef({
    onToggleSelect,
    onBeginDrag,
    onUpdateDrag,
    onEndDrag,
  });
  callbacksRef.current = {
    onToggleSelect,
    onBeginDrag,
    onUpdateDrag,
    onEndDrag,
  };

  const handleTapJS = useCallback(() => {
    callbacksRef.current.onToggleSelect();
  }, []);

  const handleBeginDragJS = useCallback(() => {
    callbacksRef.current.onBeginDrag();
  }, []);

  const handleUpdateDragJS = useCallback((tx: number, ty: number) => {
    callbacksRef.current.onUpdateDrag(tx, ty);
  }, []);

  const handleEndDragJS = useCallback((tx: number, ty: number, vy: number) => {
    callbacksRef.current.onEndDrag(tx, ty, vy);
  }, []);

  const transX = useSharedValue(slot.translateX);
  const transY = useSharedValue(slot.translateY);
  const rot = useSharedValue(slot.rotateDeg);
  const sc = useSharedValue(slot.scale);

  // Pure Reanimated shared values to store pickup anchor (zero React refs in worklets)
  const originSlotX = useSharedValue(slot.translateX);
  const originSlotY = useSharedValue(slot.translateY);
  const isDraggingCard = useSharedValue(false);
  const isPanActive = useSharedValue(false);

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      transX.value = slot.translateX;
      transY.value = slot.translateY;
      rot.value = slot.rotateDeg;
      sc.value = slot.scale;
      return;
    }
    // Only spring non-dragged cards to their new slot coordinates
    if (!isDragging) {
      transX.value = withSpring(slot.translateX, DIRECT_CARD_SPRING);
      transY.value = withSpring(slot.translateY, DIRECT_CARD_SPRING);
      rot.value = withSpring(slot.rotateDeg, DIRECT_CARD_SPRING);
      sc.value = withSpring(slot.scale, DIRECT_CARD_SPRING);
    }
  }, [
    isDragging,
    reducedMotion,
    rot,
    sc,
    slot.rotateDeg,
    slot.scale,
    slot.translateX,
    slot.translateY,
    transX,
    transY,
  ]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd(() => {
          'worklet';
          runOnJS(handleTapJS)();
        }),
    [handleTapJS],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(6)
        .onStart(() => {
          'worklet';
          isPanActive.value = true;
          originSlotX.value = transX.value;
          originSlotY.value = transY.value;
          isDraggingCard.value = true;
          dragOffsetX.value = 0;
          dragOffsetY.value = 0;
          runOnJS(handleBeginDragJS)();
        })
        .onUpdate((e) => {
          'worklet';
          dragOffsetX.value = e.translationX;
          dragOffsetY.value = Math.min(30, e.translationY);
          runOnJS(handleUpdateDragJS)(e.translationX, e.translationY);
        })
        .onEnd((e) => {
          'worklet';
          isPanActive.value = false;
          isDraggingCard.value = false;
          // Capture current position and spring smoothly into resting slot
          transX.value = originSlotX.value + dragOffsetX.value;
          transY.value = originSlotY.value + dragOffsetY.value;
          dragOffsetX.value = 0;
          dragOffsetY.value = 0;
          transX.value = withSpring(slot.translateX, DIRECT_CARD_SPRING);
          transY.value = withSpring(slot.translateY, DIRECT_CARD_SPRING);
          runOnJS(handleEndDragJS)(e.translationX, e.translationY, e.velocityY);
        })
        .onFinalize((e, success) => {
          'worklet';
          if (!success && isPanActive.value) {
            isPanActive.value = false;
            isDraggingCard.value = false;
            transX.value = originSlotX.value + dragOffsetX.value;
            transY.value = originSlotY.value + dragOffsetY.value;
            dragOffsetX.value = 0;
            dragOffsetY.value = 0;
            transX.value = withSpring(slot.translateX, DIRECT_CARD_SPRING);
            transY.value = withSpring(slot.translateY, DIRECT_CARD_SPRING);
            runOnJS(handleEndDragJS)(0, 0, 0);
          }
        }),
    [
      dragOffsetX,
      dragOffsetY,
      handleBeginDragJS,
      handleEndDragJS,
      handleUpdateDragJS,
      isDraggingCard,
      isPanActive,
      originSlotX,
      originSlotY,
      slot.translateX,
      slot.translateY,
      transX,
      transY,
    ],
  );

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (isDraggingCard.value) {
      // Anchored strictly to initial pickup coordinates plus translation: zero worklet errors and zero offset jumps
      return {
        transform: [
          { translateX: originSlotX.value + dragOffsetX.value },
          { translateY: originSlotY.value + dragOffsetY.value },
          { rotate: '0deg' },
          { scale: 1.08 },
        ],
      };
    }
    return {
      transform: [
        { translateX: transX.value },
        { translateY: transY.value },
        { rotate: `${rot.value}deg` },
        { scale: sc.value },
      ],
    };
  });

  const meldSuffix = canCloseWith
    ? `, ${lang.table.closePill}`
    : meldType === 'escalera'
      ? `, ${lang.table.escaleraPill}`
      : meldType === 'pierna'
        ? `, ${lang.table.piernaPill}`
        : '';

  const accessibilityCardLabel =
    (card.suit === 'joker'
      ? lang.table.suits.joker
      : `${card.rank} ${lang.table.cardOf} ${lang.table.suits[card.suit]}`) + meldSuffix;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.slotItem,
          { zIndex: isDragging ? 999 : slot.zIndex },
          animatedStyle,
        ]}
      >
        <View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={accessibilityCardLabel}
          accessibilityState={{ selected: isSelected }}
          style={styles.touchTarget}
        >
          <SpanishPlayingCard
            suit={card.suit}
            rank={card.rank}
            faceUp={true}
            selected={isSelected}
            meldType={meldType}
            canCloseWith={canCloseWith}
            size={size}
            accessible={false}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  handContainer: {
    height: 145,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'visible',
    paddingBottom: 10,
  },
  slotItem: {
    position: 'absolute',
    bottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
