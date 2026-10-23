import React, { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { useConfig } from '../../providers/config';
import type { MeldType, SpanishRank, SpanishSuit } from '../../engine';

export interface SpanishPlayingCardProps {
  suit: SpanishSuit;
  rank: SpanishRank;
  faceUp?: boolean;
  selected?: boolean;
  meldType?: MeldType | null;
  canCloseWith?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
}

export const CARD_DIMENSIONS = {
  sm: { width: 52, height: 78, radius: 7, fontSize: 11, suitSize: 11, centerSize: 22 },
  md: { width: 72, height: 108, radius: 9, fontSize: 14, suitSize: 13, centerSize: 32 },
  lg: { width: 88, height: 132, radius: 11, fontSize: 17, suitSize: 15, centerSize: 40 },
} as const;

export const SpanishPlayingCard = memo(function SpanishPlayingCard({
  suit,
  rank,
  faceUp = true,
  selected = false,
  meldType = null,
  canCloseWith = false,
  size = 'md',
  style,
  accessible = true,
}: SpanishPlayingCardProps) {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const dim = CARD_DIMENSIONS[size];

  const suitColor =
    suit === 'oros'
      ? theme.suitOros
      : suit === 'copas'
        ? theme.suitCopas
        : suit === 'espadas'
          ? theme.suitEspadas
          : suit === 'bastos'
            ? theme.suitBastos
            : theme.suitJoker;

  if (!faceUp) {
    return (
      <View
        accessible={accessible}
        accessibilityRole={accessible ? 'image' : undefined}
        accessibilityLabel={accessible ? lang.table.faceDownCard : undefined}
        style={[
          styles.cardBase,
          {
            width: dim.width,
            height: dim.height,
            borderRadius: dim.radius,
            backgroundColor: theme.cardBack,
            borderColor: selected ? theme.primary : theme.cardBackAccent,
            borderWidth: selected ? 2 : 1,
            padding: 0,
          },
          style,
        ]}
      >
        <SpanishCardBack
          width={dim.width}
          height={dim.height}
          radius={dim.radius}
          bg={theme.cardBack}
          accent={theme.cardBackAccent}
        />
      </View>
    );
  }

  const rankDisplay = suit === 'joker' || rank === 0 ? '★' : String(rank);
  const suitLabel = lang.table.suits[suit];
  const borderColor = selected
    ? theme.primary
    : canCloseWith
      ? theme.warning
      : meldType
        ? theme.success
        : theme.cardBorder;

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={
        accessible
          ? suit === 'joker'
            ? suitLabel
            : `${rankDisplay} ${lang.table.cardOf} ${suitLabel}`
          : undefined
      }
      style={[
        styles.cardBase,
        {
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          backgroundColor: theme.cardFace,
          borderColor,
          borderWidth: selected || canCloseWith || meldType ? 2 : 1,
          shadowColor: theme.color,
        },
        selected && styles.cardSelected,
        style,
      ]}
    >
      {/* Top-Left Index */}
      <View style={styles.topLeftCorner}>
        <Text
          style={[
            styles.rankText,
            { fontSize: dim.fontSize, color: suitColor, fontFamily: config.fontFamily },
          ]}
        >
          {rankDisplay}
        </Text>
        <SpanishSuitGlyph suit={suit} size={dim.suitSize} color={suitColor} />
      </View>

      {/* Optional Meld / Close Pill Indicator */}
      {(meldType || canCloseWith) && size !== 'sm' && (
        <View
          style={[
            styles.meldPill,
            {
              backgroundColor: canCloseWith ? theme.warning : theme.success,
            },
          ]}
        >
          <Text
            style={[
              styles.meldPillText,
              { color: theme.onPrimary, fontFamily: config.fontFamily },
            ]}
          >
            {canCloseWith
              ? lang.table.closePill
              : meldType === 'escalera'
                ? lang.table.escaleraPill
                : lang.table.piernaPill}
          </Text>
        </View>
      )}

      {/* Center Suit Emblem */}
      <View style={styles.centerContainer}>
        <SpanishSuitGlyph suit={suit} size={dim.centerSize} color={suitColor} />
      </View>

      {/* Bottom-Right Index (Inverted) */}
      <View style={styles.bottomRightCorner}>
        <Text
          style={[
            styles.rankText,
            { fontSize: dim.fontSize, color: suitColor, fontFamily: config.fontFamily },
          ]}
        >
          {rankDisplay}
        </Text>
        <SpanishSuitGlyph suit={suit} size={dim.suitSize} color={suitColor} />
      </View>
    </View>
  );
});

export function SpanishSuitGlyph({
  suit,
  size = 18,
  color,
}: {
  suit: SpanishSuit;
  size?: number;
  color: string;
}) {
  switch (suit) {
    case 'oros':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} fill="none" />
          <Circle cx={12} cy={12} r={4.5} fill={color} />
        </Svg>
      );

    case 'copas':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6 4h12v4.5c0 3.3-2.7 6-6 6s-6-2.7-6-6V4z"
            fill={color}
          />
          <Path
            d="M12 14.5v5M8 19.5h8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'espadas':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.5L14.2 13H9.8L12 2.5z"
            fill={color}
          />
          <Path
            d="M7 13.5h10M12 13.5v6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={20.5} r={1.2} fill={color} />
        </Svg>
      );

    case 'bastos':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3c-2.4 0-4 1.8-3.7 5.2.3 2.5 1.5 5.8 2.2 7.8h3c.7-2 1.9-5.3 2.2-7.8.3-3.4-1.3-5.2-3.7-5.2z"
            fill={color}
          />
          <Path
            d="M12 16v4.5M10 20.5h4"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'joker':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.5l2.6 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.3 6.5 19.5l1.3-6.2-4.7-4.3 6.3-.7L12 2.5z"
            fill={color}
          />
        </Svg>
      );
  }
}

function SpanishCardBack({
  width,
  height,
  radius,
  bg,
  accent,
}: {
  width: number;
  height: number;
  radius: number;
  bg: string;
  accent: string;
}) {
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const cx = innerW / 2;
  const cy = innerH / 2;
  const maxRx = (innerW - 10) / 2;
  const maxRy = (innerH - 10) / 2;

  const diamondPath = (rx: number, ry: number) =>
    `M ${cx} ${cy - ry} L ${cx + rx} ${cy} L ${cx} ${cy + ry} L ${cx - rx} ${cy} Z`;

  return (
    <View style={[styles.cardBackInner, { width: innerW, height: innerH }]}>
      <Svg width={innerW} height={innerH} viewBox={`0 0 ${innerW} ${innerH}`}>
        <Rect
          x={0}
          y={0}
          width={innerW}
          height={innerH}
          fill={bg}
          rx={Math.max(3, radius - 2)}
        />
        <Rect
          x={3}
          y={3}
          width={innerW - 6}
          height={innerH - 6}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.75}
          rx={Math.max(2, radius - 3)}
        />
        <G stroke={accent} strokeWidth={0.9} opacity={0.65}>
          <Path d={diamondPath(maxRx, maxRy)} fill="none" />
          <Path d={diamondPath(maxRx * 0.65, maxRy * 0.65)} fill="none" />
        </G>
        <Circle cx={cx} cy={cy} r={3.5} fill={accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'space-between',
    padding: 5,
  },
  cardSelected: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 7,
    elevation: 7,
  },
  cardBackInner: {
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 2,
  },
  topLeftCorner: {
    alignItems: 'center',
    width: 20,
    gap: 1,
  },
  bottomRightCorner: {
    alignItems: 'center',
    width: 20,
    gap: 1,
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontWeight: '800',
    lineHeight: 15,
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  meldPill: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  meldPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
