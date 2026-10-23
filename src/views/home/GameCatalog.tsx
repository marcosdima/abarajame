import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useNavigator, useStagger } from 'alambre';
import {
  AppBadge,
  AppButton,
  AppCard,
  AppText,
  AppTitle,
} from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { useConfig } from '../../providers/config';
import { useTableSession } from '../../providers/table-session';
import { GAME_CATALOG } from '../../engine';
import { SpanishSuitGlyph } from '../../components/cards/SpanishPlayingCard';

export default function GameCatalog() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { navigate } = useNavigator();
  const { getDelay } = useStagger({ initialDelay: 40, staggerMs: 60 });
  const { createHostTable, addBotSeat } = useTableSession();

  const handlePlaySolo = () => {
    createHostTable({
      playerName: config.playerName,
      mode: 'simulated',
      serverUrl: config.wsServerUrl,
    });
    // Add 1 default bot so table is ready immediately
    addBotSeat();
    navigate('home', { subpage: 'lobby' });
  };

  const handleCreateMultiplayer = () => {
    navigate('home', { subpage: 'multiplayer' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Catalog Header */}
      <Animated.View entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}>
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <AppTitle level={2} style={{ color: theme.color }}>
              {lang.catalog.title}
            </AppTitle>
            <AppText variant="muted">{lang.catalog.subtitle}</AppText>
          </View>
        </View>
      </Animated.View>

      {/* Catalog Cards */}
      {GAME_CATALOG.map((entry, index) => {
        const gameCopy = lang.home.games[entry.id];
        const isAvailable = entry.availability === 'available';
        const badgeLabel =
          entry.availability === 'available'
            ? lang.catalog.availableBadge
            : entry.availability === 'coming_soon'
              ? lang.catalog.comingSoonBadge
              : lang.catalog.labBadge;

        const badgeTone =
          entry.availability === 'available'
            ? 'success'
            : entry.availability === 'coming_soon'
              ? 'neutral'
              : 'primary';

        return (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(280).delay(getDelay(index)).easing(Easing.out(Easing.cubic))}
          >
            <AppCard
              variant="outlined"
              title={gameCopy.name}
              subtitle={gameCopy.description}
              badge={badgeLabel}
              badgeTone={badgeTone}
              style={styles.card}
            >
              <View style={styles.metaRow}>
                <AppBadge
                  label={`${entry.minPlayers}–${entry.maxPlayers} ${lang.catalog.playersBadge}`}
                  tone="neutral"
                  variant="soft"
                  size="sm"
                />
                <AppBadge
                  label={
                    entry.deckSpec.includeEightsAndNines
                      ? lang.home.deck50Label
                      : lang.home.deck40Label
                  }
                  tone="primary"
                  variant="soft"
                  size="sm"
                />
              </View>

              {entry.id === 'chinchon' && (
                <View
                  style={styles.suitsRow}
                  accessible={true}
                  accessibilityRole="image"
                  accessibilityLabel="Baraja española con comodines"
                >
                  <SpanishSuitGlyph suit="oros" size={18} color={theme.suitOros} />
                  <SpanishSuitGlyph suit="copas" size={18} color={theme.suitCopas} />
                  <SpanishSuitGlyph suit="espadas" size={18} color={theme.suitEspadas} />
                  <SpanishSuitGlyph suit="bastos" size={18} color={theme.suitBastos} />
                  <SpanishSuitGlyph suit="joker" size={18} color={theme.suitJoker} />
                </View>
              )}

              {isAvailable && (
                <View style={styles.actionsRow}>
                  <View style={styles.actionCol}>
                    <AppButton
                      variant="outline"
                      tone="primary"
                      size="md"
                      label={lang.catalog.playSoloAction}
                      accessibilityRole="button"
                      onPress={handlePlaySolo}
                      fullWidth
                    />
                  </View>
                  <View style={styles.actionCol}>
                    <AppButton
                      variant="solid"
                      tone="primary"
                      size="md"
                      label={lang.catalog.createTableAction}
                      accessibilityRole="button"
                      onPress={handleCreateMultiplayer}
                      fullWidth
                    />
                  </View>
                </View>
              )}
            </AppCard>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerCol: {
    gap: 4,
  },
  card: {
    borderWidth: 1.5,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionCol: {
    flex: 1,
  },
});
