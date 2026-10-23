import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AppText, AppTitle } from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import {
  SpanishPlayingCard,
  CARD_DIMENSIONS,
} from '../cards/SpanishPlayingCard';
import type { SpanishSuit } from '../../engine';

export interface StartupAceLoaderProps {
  onFinish: () => void;
}

interface FlippingAceProps {
  suit: SpanishSuit;
  delay: number;
  size: 'sm' | 'md';
}

const FlippingAce = ({ suit, delay, size }: FlippingAceProps) => {
  const progress = useSharedValue(0);
  const dim = CARD_DIMENSIONS[size];

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, progress]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = `${progress.value * 180 + 180}deg`;
    const scale = 1 + Math.sin(progress.value * Math.PI) * 0.06;
    return {
      transform: [
        { perspective: 900 },
        { rotateY },
        { scale },
      ],
      opacity: progress.value >= 0.5 ? 1 : 0,
      backfaceVisibility: 'hidden',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = `${progress.value * 180}deg`;
    const scale = 1 + Math.sin(progress.value * Math.PI) * 0.06;
    return {
      transform: [
        { perspective: 900 },
        { rotateY },
        { scale },
      ],
      opacity: progress.value < 0.5 ? 1 : 0,
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <View style={[styles.cardSlot, { width: dim.width, height: dim.height }]}>
      <Animated.View
        style={[
          styles.cardFaceAbsolute,
          { width: dim.width, height: dim.height },
          backStyle,
        ]}
      >
        <SpanishPlayingCard
          suit={suit}
          rank={1}
          faceUp={false}
          size={size}
          accessible={false}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.cardFaceAbsolute,
          { width: dim.width, height: dim.height },
          frontStyle,
        ]}
      >
        <SpanishPlayingCard
          suit={suit}
          rank={1}
          faceUp={true}
          size={size}
          accessible={false}
        />
      </Animated.View>
    </View>
  );
};

const ACES: SpanishSuit[] = ['oros', 'copas', 'espadas', 'bastos'];

export default function StartupAceLoader({ onFinish }: StartupAceLoaderProps) {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { width } = useWindowDimensions();
  const containerOpacity = useSharedValue(1);
  const finishedRef = useRef(false);

  // Responsive card size: use 'sm' on narrow phones (< 380px), 'md' on larger devices
  const cardSize = width < 370 ? 'sm' : 'md';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      containerOpacity.value = withTiming(
        0,
        { duration: 220, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(onFinish)();
        },
      );
    }, 1850);

    return () => clearTimeout(timer);
  }, [containerOpacity, onFinish]);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    containerOpacity.value = withTiming(
      0,
      { duration: 100, easing: Easing.out(Easing.quad) },
      () => {
        runOnJS(onFinish)();
      },
    );
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={handleSkip}
      accessibilityRole="button"
      accessibilityLabel={`${lang.startup.title}. ${lang.startup.tagline}.`}
      accessibilityHint={lang.startup.tapToSkip}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.background },
          containerAnimatedStyle,
        ]}
      >
        {/* Decorative felt accent line */}
        <View style={[styles.feltGlow, { backgroundColor: theme.primarySoft }]} />

        {/* 4 Aces Row */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.acesRow}
        >
          {ACES.map((suit, index) => (
            <FlippingAce
              key={suit}
              suit={suit}
              delay={180 + index * 220}
              size={cardSize}
            />
          ))}
        </Animated.View>

        {/* Title and Brand */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500).easing(Easing.out(Easing.cubic))}
          style={styles.brandingBox}
        >
          <AppTitle level={1} align="center" style={{ color: theme.color }}>
            {lang.startup.title}
          </AppTitle>
          <AppText variant="subtitle" style={[styles.tagline, { color: theme.muted }]}>
            {lang.startup.tagline}
          </AppText>
        </Animated.View>

        {/* Tap to skip hint */}
        <Animated.View
          entering={FadeIn.duration(400).delay(1200)}
          style={styles.skipBox}
        >
          <AppText variant="caption" style={{ color: theme.muted }}>
            {lang.startup.tapToSkip}
          </AppText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  feltGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.18,
  },
  acesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  cardSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFaceAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  brandingBox: {
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  tagline: {
    textAlign: 'center',
    fontSize: 14,
  },
  skipBox: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
});
