import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { AlambreIcons } from 'alambre';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { AppCard, AppButton, AppText } from '@some-alambre/ui';

export default function Permissions() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const [, setLastActiveTime] = useState<number>(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setLastActiveTime(Date.now());
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  return (
    <View style={[styles.container, styles.content, { backgroundColor: theme.background }]}>
      {/* Intro / Transparency Card */}
      <AppCard
        variant="elevated"
        title={lang.permissions.introTitle}
        style={styles.card}
      >
        <AppText style={[styles.bodyText, { color: theme.muted }]}>
          {lang.permissions.introDescription}
        </AppText>
      </AppCard>

      {/* Notifications Card */}
      <AppCard
        variant="outlined"
        title={lang.permissions.notificationsTitle}
        subtitle={lang.permissions.notificationsDescription}
        badge={lang.permissions.statusReview}
        badgeTone="neutral"
        style={styles.card}
      >
        <AppButton
          variant="outline"
          tone="primary"
          size="md"
          label={lang.permissions.openSystemSettings}
          rightIcon={
            <AlambreIcons.Arrow
              drawIt
              color={theme.primary}
              lineWidth={16}
              style={styles.arrowIcon}
            />
          }
          onPress={handleOpenSettings}
          fullWidth
        />
      </AppCard>

      {/* Battery Optimization Card */}
      <AppCard
        variant="outlined"
        title={lang.permissions.batteryTitle}
        subtitle={lang.permissions.batteryDescription}
        style={styles.card}
      >
        <AppButton
          variant="soft"
          tone="neutral"
          size="md"
          label={lang.permissions.openSystemSettings}
          rightIcon={
            <AlambreIcons.Arrow
              drawIt
              color={theme.color}
              lineWidth={16}
              style={styles.arrowIcon}
            />
          }
          onPress={handleOpenSettings}
          fullWidth
        />
      </AppCard>

      {/* System Settings Footer Notice */}
      <View style={styles.footerNotice}>
        <AppText style={[styles.footerText, { color: theme.muted }]}>
          {lang.permissions.statusNotice}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  card: {
    borderWidth: 1.5,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  arrowIcon: {
    width: 20,
    height: 14,
  },
  footerNotice: {
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
