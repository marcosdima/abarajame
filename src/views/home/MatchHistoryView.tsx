import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useConfirm, useStagger, useToast } from 'alambre';
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

export default function MatchHistoryView() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { confirm } = useConfirm();
  const { show } = useToast();
  const { records, remove, reorder } = useMatchHistory();
  const { getDelay } = useStagger({ initialDelay: 40, staggerMs: 45 });

  const playerWins = records.filter(
    (r) => r.winnerName?.trim().toLowerCase() === config.playerName?.trim().toLowerCase(),
  ).length;

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: lang.history.clearConfirmTitle,
      message: lang.history.clearConfirmMessage,
      confirmLabel: lang.common.confirm,
      cancelLabel: lang.common.cancel,
      tone: 'danger',
    });

    if (confirmed) {
      await reorder([]);
      show({
        payload: {
          title: lang.history.clearAllAction,
          tone: 'info',
        },
      });
    }
  };

  const reversed = [...records].reverse();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}>
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <AppTitle level={2} style={{ color: theme.color }}>
              {lang.history.title}
            </AppTitle>
            <AppText variant="muted">{lang.history.subtitle}</AppText>
          </View>
        </View>
      </Animated.View>

      {/* Stats Summary Card */}
      <Animated.View entering={FadeInDown.duration(260).delay(40).easing(Easing.out(Easing.cubic))}>
        <AppCard variant="outlined" style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <AppText variant="muted" style={styles.statLabel}>
                {lang.history.totalRecorded}
              </AppText>
              <AppTitle level={2} style={{ color: theme.primary }}>
                {records.length}
              </AppTitle>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.borderSoft }]} />

            <View style={styles.statBox}>
              <AppText variant="muted" style={styles.statLabel}>
                {lang.history.winner} ({config.playerName})
              </AppText>
              <AppTitle level={2} style={{ color: theme.primary }}>
                {playerWins}
              </AppTitle>
            </View>
          </View>

          {records.length > 0 && (
            <AppButton
              variant="outline"
              tone="danger"
              size="sm"
              label={lang.history.clearAllAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              onPress={handleClearAll}
            />
          )}
        </AppCard>
      </Animated.View>

      {/* Match Records List */}
      {records.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(260).delay(80).easing(Easing.out(Easing.cubic))}>
          <AppCard variant="outlined" style={styles.card}>
            <AppText variant="muted" style={styles.emptyText}>
              {lang.history.emptyNotice}
            </AppText>
          </AppCard>
        </Animated.View>
      ) : (
        <View style={styles.listContainer}>
          {reversed.map((rec, index) => {
            const isPlayerWinner =
              rec.winnerName?.trim().toLowerCase() === config.playerName?.trim().toLowerCase();

            return (
              <Animated.View
                key={rec.id}
                entering={FadeInDown.duration(260).delay(getDelay(index)).easing(Easing.out(Easing.cubic))}
              >
                <View
                  style={[
                    styles.matchRow,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: isPlayerWinner ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View style={styles.matchMainCol}>
                    <View style={styles.matchWinnerRow}>
                      <AppText style={[styles.winnerTitle, { color: theme.color }]}>
                        {lang.history.winner}: {rec.winnerName}
                      </AppText>
                      {isPlayerWinner && (
                        <AppBadge label={lang.history.victory} tone="success" variant="solid" size="sm" />
                      )}
                    </View>

                    <AppText variant="muted" style={styles.matchMetaText}>
                      {lang.history.room} #{rec.roomCode} • {rec.roundsPlayed} {lang.history.rounds}
                      {rec.finishedAt ? ` • ${new Date(rec.finishedAt).toLocaleDateString()}` : ''}
                    </AppText>
                  </View>

                  <AppButton
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    label="×"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${lang.common.delete} #${rec.roomCode}`}
                    onPress={() => remove(rec.id)}
                  />
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
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
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  listContainer: {
    gap: 10,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  matchMainCol: {
    flex: 1,
    gap: 4,
  },
  matchWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchMetaText: {
    fontSize: 12,
  },
});
