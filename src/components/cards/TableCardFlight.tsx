import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFlightTrajectory, type Point2D } from 'alambre';
import { SpanishPlayingCard } from './SpanishPlayingCard';
import type { SpanishCard } from '../../engine';

export interface TableCardFlightProps {
  card: SpanishCard;
  from: Point2D;
  to: Point2D;
  faceUp?: boolean;
  durationMs?: number;
  onComplete: () => void;
}

export const TableCardFlight = memo(function TableCardFlight({
  card,
  from,
  to,
  faceUp = true,
  durationMs = 210,
  onComplete,
}: TableCardFlightProps) {
  const { animatedStyle } = useFlightTrajectory({
    from,
    to,
    liftHeight: 32,
    peakScale: 1.08,
    startScale: 0.95,
    endScale: 1.0,
    durationMs,
    autoStart: true,
    onComplete,
  });

  return (
    <Animated.View style={[styles.flightWrapper, animatedStyle]} pointerEvents="none">
      <SpanishPlayingCard
        suit={card.suit}
        rank={card.rank}
        faceUp={faceUp}
        size="md"
        accessible={false}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  flightWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 104,
    marginLeft: -35,
    marginTop: -52,
    zIndex: 99999,
    elevation: 20,
  },
});
