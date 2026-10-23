import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { generateStackJitter } from 'alambre';
import { AppBadge, AppText } from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { SpanishPlayingCard } from './SpanishPlayingCard';
import type { PlayerSeat, SpanishCard } from '../../engine';

export interface OpponentSummary {
  seat: PlayerSeat;
  cardCount: number;
  isCurrentTurn: boolean;
}

export interface TableFeltMatProps {
  opponents: readonly OpponentSummary[];
  stockCount: number;
  discardPile: readonly SpanishCard[];
  closeCard: SpanishCard | null;
  canDrawStock: boolean;
  canDrawDiscard: boolean;
  canDiscardToPile: boolean;
  canCloseRound: boolean;
  onPressStock: () => void;
  onPressDiscard: () => void;
  onPressCloseZone: () => void;
  statusPrompt: string;
  hoveredZone?: 'discard' | 'close' | null;
}

export const TableFeltMat = memo(function TableFeltMat({
  opponents,
  stockCount,
  discardPile,
  closeCard,
  canDrawStock,
  canDrawDiscard,
  canDiscardToPile,
  canCloseRound,
  onPressStock,
  onPressDiscard,
  onPressCloseZone,
  statusPrompt,
  hoveredZone,
}: TableFeltMatProps) {
  const { theme } = useLightDark();
  const { lang } = useLang();

  const topDiscard = discardPile[discardPile.length - 1] ?? null;
  const previousDiscard =
    discardPile.length > 1 ? discardPile[discardPile.length - 2] ?? null : null;

  return (
    <View
      style={[
        styles.feltContainer,
        {
          backgroundColor: theme.feltSurface,
          borderColor: theme.feltBorder,
        },
      ]}
    >
      {/* Opponents Row (1 to 3 opponents) */}
      <View style={styles.opponentsRow}>
        {opponents.map(({ seat, cardCount, isCurrentTurn }) => (
          <View
            key={seat.id}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={`${seat.name}, ${seat.totalScore} ${lang.common.points}, ${
              seat.isEliminated
                ? lang.table.eliminatedBadge
                : `${cardCount} ${lang.table.cardsCount}`
            }${isCurrentTurn ? `, ${lang.table.waitingTurn}` : ''}`}
            style={[
              styles.opponentSeat,
              {
                backgroundColor: theme.overlay,
                borderColor: isCurrentTurn ? theme.warning : theme.feltBorder,
              },
            ]}
          >
            <View style={styles.opponentHeader}>
              <AppText
                numberOfLines={1}
                style={[styles.opponentName, { color: theme.onFelt }]}
              >
                {seat.name}
              </AppText>
              <AppBadge
                label={`${seat.totalScore} ${lang.common.points}`}
                tone={seat.isEliminated ? 'danger' : isCurrentTurn ? 'warning' : 'neutral'}
                variant={isCurrentTurn ? 'solid' : 'soft'}
                size="sm"
              />
            </View>
            <View style={styles.opponentMetaRow}>
              <View style={styles.miniCardRow}>
                {Array.from({ length: Math.min(cardCount, 4) }).map((_, idx) => (
                  <View
                    key={`${seat.id}-c-${idx}`}
                    style={[
                      styles.miniCardBack,
                      {
                        backgroundColor: theme.cardBack,
                        borderColor: theme.cardBackAccent,
                        marginLeft: idx === 0 ? 0 : -6,
                      },
                    ]}
                  />
                ))}
              </View>
              <AppText style={[styles.opponentCardCount, { color: theme.onFeltMuted }]}>
                {seat.isEliminated
                  ? lang.table.eliminatedBadge
                  : `${cardCount} ${lang.table.cardsCount}`}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      {/* Center Zones: Stock (Mazo) | Discard (Pozo) | Close (Cortar) */}
      <View style={styles.zonesRow}>
        {/* 1. Stock Zone (Mazo) */}
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${lang.table.stockLabel}, ${stockCount} ${lang.table.cardsCount}`}
          accessibilityState={{ disabled: !canDrawStock }}
          disabled={!canDrawStock}
          onPress={onPressStock}
          style={[
            styles.zoneSlot,
            {
              borderColor: canDrawStock ? theme.primary : theme.feltBorder,
              backgroundColor: theme.overlayBar,
            },
          ]}
        >
          <AppText style={[styles.zoneLabel, { color: theme.onFeltMuted }]}>
            {lang.table.stockLabel.toUpperCase()} ({stockCount})
          </AppText>

          <View style={styles.cardStackFrame}>
            {stockCount > 2 && (
              <View style={[styles.stackUnderlay, { transform: [{ translateX: -3 }, { translateY: -3 }] }]}>
                <SpanishPlayingCard suit="oros" rank={1} faceUp={false} size="md" accessible={false} />
              </View>
            )}
            {stockCount > 0 ? (
              <SpanishPlayingCard
                suit="oros"
                rank={1}
                faceUp={false}
                selected={canDrawStock}
                size="md"
                accessible={false}
              />
            ) : (
              <View
                style={[
                  styles.emptySlotPlaceholder,
                  { borderColor: theme.onFeltMuted },
                ]}
              />
            )}
          </View>
        </Pressable>

        {/* 2. Discard Zone (Pozo) */}
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${lang.table.discardLabel}, ${discardPile.length} ${lang.table.cardsCount}${
            topDiscard
              ? `, ${topDiscard.rank} ${lang.table.cardOf} ${lang.table.suits[topDiscard.suit]}`
              : ''
          }`}
          accessibilityState={{ disabled: !canDrawDiscard && !canDiscardToPile }}
          disabled={!canDrawDiscard && !canDiscardToPile}
          onPress={onPressDiscard}
          style={[
            styles.zoneSlot,
            {
              borderColor:
                hoveredZone === 'discard'
                  ? theme.primary
                  : canDrawDiscard || canDiscardToPile
                    ? theme.primary
                    : theme.feltBorder,
              backgroundColor:
                hoveredZone === 'discard' ? theme.overlay : theme.overlayBar,
              transform: [{ scale: hoveredZone === 'discard' ? 1.05 : 1 }],
            },
          ]}
        >
          <AppText
            style={[
              styles.zoneLabel,
              { color: hoveredZone === 'discard' ? theme.primary : theme.onFeltMuted },
            ]}
          >
            {lang.table.discardLabel.toUpperCase()} ({discardPile.length})
          </AppText>

          <View style={styles.cardStackFrame}>
            {previousDiscard && (
              <View
                style={[
                  styles.stackUnderlay,
                  {
                    transform: [
                      {
                        rotate: `${generateStackJitter(previousDiscard.id, 6, 8).rotation}deg`,
                      },
                    ],
                  },
                ]}
              >
                <SpanishPlayingCard
                  suit={previousDiscard.suit}
                  rank={previousDiscard.rank}
                  faceUp={true}
                  size="md"
                  accessible={false}
                />
              </View>
            )}
            {topDiscard ? (
              <SpanishPlayingCard
                suit={topDiscard.suit}
                rank={topDiscard.rank}
                faceUp={true}
                selected={canDrawDiscard || canDiscardToPile || hoveredZone === 'discard'}
                size="md"
                accessible={false}
              />
            ) : (
              <View
                style={[
                  styles.emptySlotPlaceholder,
                  { borderColor: hoveredZone === 'discard' ? theme.primary : theme.onFeltMuted },
                ]}
              />
            )}
          </View>
        </Pressable>

        {/* 3. Close Slot (Cortar) */}
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${lang.table.closeZoneLabel}: ${
            canCloseRound ? lang.table.closeZoneReady : lang.table.closeZoneLocked
          }`}
          accessibilityState={{ disabled: !canCloseRound }}
          disabled={!canCloseRound}
          onPress={onPressCloseZone}
          style={[
            styles.zoneSlot,
            {
              borderColor:
                hoveredZone === 'close'
                  ? theme.warning
                  : canCloseRound
                    ? theme.warning
                    : theme.feltBorder,
              backgroundColor:
                hoveredZone === 'close'
                  ? theme.dangerSoft
                  : canCloseRound
                    ? theme.dangerSoft
                    : theme.overlayBar,
              transform: [{ scale: hoveredZone === 'close' ? 1.05 : 1 }],
            },
          ]}
        >
          <AppText
            style={[
              styles.zoneLabel,
              {
                color:
                  hoveredZone === 'close' || canCloseRound
                    ? theme.warning
                    : theme.onFeltMuted,
              },
            ]}
          >
            {lang.table.closeZoneLabel.toUpperCase()}
          </AppText>

          <View style={styles.cardStackFrame}>
            {closeCard ? (
              <SpanishPlayingCard
                suit={closeCard.suit}
                rank={closeCard.rank}
                faceUp={false}
                selected={true}
                size="md"
                accessible={false}
              />
            ) : (
              <View
                style={[
                  styles.emptySlotPlaceholder,
                  {
                    borderColor: canCloseRound ? theme.warning : theme.onFeltMuted,
                  },
                ]}
              >
                <AppText
                  style={[
                    styles.closePlaceholderText,
                    { color: canCloseRound ? theme.warning : theme.onFeltMuted },
                  ]}
                >
                  {canCloseRound
                    ? lang.table.closeZoneReady
                    : lang.table.closeZoneLocked}
                </AppText>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Active Table Prompt */}
      <View style={[styles.promptPill, { backgroundColor: theme.overlay }]}>
        <AppText numberOfLines={1} style={[styles.promptText, { color: theme.onFelt }]}>
          {statusPrompt}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  feltContainer: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 12,
    gap: 10,
  },
  opponentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  opponentSeat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  opponentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  opponentName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  opponentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  miniCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniCardBack: {
    width: 12,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
  },
  opponentCardCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  zonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  zoneSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
    minHeight: 144,
  },
  zoneLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardStackFrame: {
    width: 76,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stackUnderlay: {
    position: 'absolute',
  },
  emptySlotPlaceholder: {
    width: 70,
    height: 104,
    borderRadius: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  closePlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptPill: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
