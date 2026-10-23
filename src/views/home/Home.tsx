import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { AlambreIcons, useNavigator, useStagger } from 'alambre';
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
import { useMatchHistory } from '../../providers/history';
import { useTableSession } from '../../providers/table-session';
import { SpanishSuitGlyph } from '../../components/cards/SpanishPlayingCard';

export default function Home() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { navigate } = useNavigator();
  const { getDelay } = useStagger({ initialDelay: 40, staggerMs: 55 });
  const { records: historyRecords } = useMatchHistory();
  const { createHostTable, addBotSeat } = useTableSession();

  const handleStartQuickPlay = () => {
    createHostTable({
      playerName: config.playerName,
      mode: 'simulated',
      serverUrl: config.wsServerUrl,
    });
    addBotSeat();
    navigate('home', { subpage: 'lobby' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero Banner with Spanish Suits */}
      <Animated.View
        entering={FadeInDown.duration(280).delay(getDelay(0)).easing(Easing.out(Easing.cubic))}
      >
        <AppCard variant="outlined" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleCol}>
              <AppTitle level={1} style={{ color: theme.color }}>
                {lang.home.title}
              </AppTitle>
              <AppText variant="muted">{lang.home.heroSubtitle}</AppText>
            </View>
            <AppButton
              variant="outline"
              tone="primary"
              size="sm"
              label={lang.home.openSettings}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={lang.home.openSettings}
              rightIcon={<AlambreIcons.Gear color={theme.primary} lineWidth={1.75} style={styles.iconSm} />}
              onPress={() => navigate('settings')}
            />
          </View>

          <View
            style={styles.suitsRow}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel="Baraja española: Oros, Copas, Espadas, Bastos y Comodín"
          >
            <SpanishSuitGlyph suit="oros" size={24} color={theme.suitOros} />
            <SpanishSuitGlyph suit="copas" size={24} color={theme.suitCopas} />
            <SpanishSuitGlyph suit="espadas" size={24} color={theme.suitEspadas} />
            <SpanishSuitGlyph suit="bastos" size={24} color={theme.suitBastos} />
            <SpanishSuitGlyph suit="joker" size={24} color={theme.suitJoker} />
          </View>
        </AppCard>
      </Animated.View>

      {/* Primary Action 1: Multiplayer Hub (QR + Online/LAN) */}
      <Animated.View
        entering={FadeInDown.duration(280).delay(getDelay(1)).easing(Easing.out(Easing.cubic))}
      >
        <AppCard
          variant="outlined"
          title={lang.home.multiplayerCardTitle}
          subtitle={lang.home.multiplayerCardSubtitle}
          badge={lang.home.multiplayerBadge}
          badgeTone="primary"
          style={styles.card}
        >
          <AppButton
            variant="solid"
            tone="primary"
            size="lg"
            label={lang.home.openMultiplayer}
            leftIcon={<AlambreIcons.Zap color={theme.onPrimary} lineWidth={1.75} style={styles.btnIcon} />}
            onPress={() => navigate('home', { subpage: 'multiplayer' })}
            fullWidth
          />
        </AppCard>
      </Animated.View>

      {/* Primary Action 2: Quick Solo Play vs Bots */}
      <Animated.View
        entering={FadeInDown.duration(280).delay(getDelay(2)).easing(Easing.out(Easing.cubic))}
      >
        <AppCard
          variant="outlined"
          title={lang.home.quickPlayCardTitle}
          subtitle={lang.home.quickPlayCardSubtitle}
          badge={lang.home.onePlayerBadge}
          badgeTone="neutral"
          style={styles.card}
        >
          <AppButton
            variant="outline"
            tone="primary"
            size="md"
            label={lang.home.startQuickPlay}
            onPress={handleStartQuickPlay}
            fullWidth
          />
        </AppCard>
      </Animated.View>

      {/* Secondary Actions Row: Catalog & Match History */}
      <View style={styles.secondaryRow}>
        <Animated.View
          entering={FadeInDown.duration(280).delay(getDelay(3)).easing(Easing.out(Easing.cubic))}
          style={styles.halfCol}
        >
          <AppCard
            variant="outlined"
            title={lang.home.catalogCardTitle}
            subtitle={lang.home.catalogCardSubtitle}
            style={styles.card}
          >
            <AppButton
              variant="soft"
              tone="primary"
              size="sm"
              label={lang.home.openCatalog}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => navigate('home', { subpage: 'catalog' })}
              fullWidth
            />
          </AppCard>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(280).delay(getDelay(4)).easing(Easing.out(Easing.cubic))}
          style={styles.halfCol}
        >
          <AppCard
            variant="outlined"
            title={lang.home.historyCardTitle}
            subtitle={
              historyRecords.length > 0
                ? `${historyRecords.length} ${lang.history.matchesLabel}`
                : lang.home.historyEmpty
            }
            style={styles.card}
          >
            <View style={styles.badgeRow}>
              <AppBadge
                label={`${historyRecords.length} ${lang.history.matchesLabel}`}
                tone={historyRecords.length > 0 ? 'success' : 'neutral'}
                variant="soft"
                size="sm"
              />
            </View>
            <AppButton
              variant="soft"
              tone="neutral"
              size="sm"
              label={lang.home.openHistory}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => navigate('home', { subpage: 'history' })}
              fullWidth
            />
          </AppCard>
        </Animated.View>
      </View>
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
  heroCard: {
    borderWidth: 1.5,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitleCol: {
    flex: 1,
    gap: 4,
  },
  suitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
  },
  iconSm: {
    width: 18,
    height: 18,
  },
  btnIcon: {
    width: 20,
    height: 20,
  },
  card: {
    borderWidth: 1.5,
    gap: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  badgeRow: {
    marginBottom: 4,
  },
});
