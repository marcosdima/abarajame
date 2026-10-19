import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlambreIcons, useConfirm, useNavigator, useToast } from 'alambre';
import { useLang } from '../../providers/lang';
import { useConfig } from '../../providers/config';
import { useLightDark, light as lightTokens, dark as darkTokens } from '../../providers/theme';
import { AppCard, AppButton, ToggleLightDark } from '@some-alambre/ui';

const GITHUB_URL = 'https://github.com/marcosdima';
const CAFECITO_URL = 'https://cafecito.app/marcosdima';

export const FONTS = [
  'Inter',
  'Nunito',
  'PlayfairDisplay',
  'SpaceMono',
  'Kranky',
  'sans-serif',
  'serif',
  'monospace',
];

export default () => {
  const { theme, toggleTheme, currThemeName } = useLightDark();
  const { lang, currentLang, changeLang } = useLang();
  const { config, saveField } = useConfig();
  const { navigate } = useNavigator();
  const { show } = useToast();
  const { confirm } = useConfirm();

  const handleOpenCafecito = () => {
    void Linking.openURL(CAFECITO_URL);
  };

  const handleOpenGithub = () => {
    void Linking.openURL(GITHUB_URL);
  };

  const handleCopyDiagnostics = () => {
    show({
      payload: {
        title: lang.settings.diagnosticsCopied,
        tone: 'success',
      },
      duration: 2500,
    });
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: lang.settings.resetConfirmTitle,
      message: lang.settings.resetConfirmMessage,
      tone: 'danger',
      confirmLabel: lang.settings.resetAction,
      cancelLabel: lang.common.back,
    });

    if (confirmed) {
      await changeLang('es');
      await saveField('fontFamily', 'Inter');
      if (currThemeName !== 'light') {
        toggleTheme();
      }
      show({
        payload: {
          title: lang.settings.resetSuccess,
          tone: 'success',
        },
        duration: 3000,
      });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Idioma / Language */}
      <AppCard
        variant="outlined"
        title={lang.settings.language}
        style={styles.card}
      >
        <View
          style={[
            styles.segmentedContainer,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          {(['es', 'en'] as const).map((code) => {
            const active = currentLang === code;
            const label = code === 'es' ? 'Español' : 'English';
            return (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => void changeLang(code)}
                style={[
                  styles.segmentedButton,
                  active && [
                    styles.segmentedButtonActive,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.primary,
                    },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    {
                      color: active ? theme.primary : theme.muted,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      {/* Tema / Theme */}
      <AppCard
        variant="outlined"
        title={lang.settings.theme}
        subtitle={
          currThemeName === 'light'
            ? lang.settings.themeSubtitleLight
            : lang.settings.themeSubtitleDark
        }
        style={styles.card}
      >
        <View style={styles.toggleRow}>
          <ToggleLightDark
            toggle={toggleTheme}
            setLeft={currThemeName === 'light'}
            style={styles.toggle}
            colors={{
              light: {
                background: lightTokens.surfaceAlt,
                border: lightTokens.border,
                circle: lightTokens.primary,
                sun: '#f59e0b',
                moon: lightTokens.muted,
              },
              dark: {
                background: darkTokens.surfaceAlt,
                border: darkTokens.border,
                circle: '#9eebce',
                sun: '#ffc266',
                moon: darkTokens.muted,
              },
            }}
          />
        </View>
      </AppCard>

      {/* Tipografía / Typography */}
      <AppCard
        variant="outlined"
        title={lang.settings.typography}
        subtitle={lang.settings.typographySubtitle}
        style={styles.card}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fontsScroll}
        >
          {FONTS.map((font) => {
            const active = config.fontFamily === font;
            const displayLabel =
              font === 'PlayfairDisplay' ? 'Playfair' : font === 'SpaceMono' ? 'Space Mono' : font;
            return (
              <Pressable
                key={font}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => void saveField('fontFamily', font)}
                style={[
                  styles.fontChip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontChipText,
                    {
                      color: active ? theme.primary : theme.color,
                      fontFamily: font,
                    },
                  ]}
                >
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </AppCard>

      {/* Permisos del sistema / Permissions subpage */}
      <AppCard
        variant="outlined"
        title={lang.settings.permissionsTitle}
        subtitle={lang.settings.permissionsSubtitle}
        badge={lang.settings.permissionsBadge}
        badgeTone="neutral"
        style={styles.card}
      >
        <AppButton
          variant="outline"
          tone="primary"
          size="md"
          label={lang.settings.permissionsTitle}
          rightIcon={
            <AlambreIcons.Arrow
              drawIt
              color={theme.primary}
              lineWidth={16}
              style={styles.arrowIcon}
            />
          }
          onPress={() => navigate('settings', { subpage: 'permissions' })}
          fullWidth
        />
      </AppCard>

      {/* Apoyar el proyecto / Support */}
      <AppCard
        variant="outlined"
        title={lang.settings.supportTitle}
        subtitle={lang.settings.supportHint}
        style={styles.card}
      >
        <AppButton
          variant="soft"
          tone="primary"
          size="md"
          label={lang.settings.supportAction}
          rightIcon={
            <AlambreIcons.Coffee
              color={theme.primary}
              lineWidth={2.2}
              style={styles.coffeeIcon}
            />
          }
          onPress={handleOpenCafecito}
          fullWidth
        />
      </AppCard>

      {/* Acerca de / About & Diagnostics */}
      <AppCard
        variant="outlined"
        title={lang.settings.aboutTitle}
        style={styles.card}
      >
        <View style={styles.aboutContent}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: theme.muted }]}>
              {lang.settings.version}
            </Text>
            <Text style={[styles.aboutValue, { color: theme.color }]}>
                1.0.0
            </Text>
          </View>
          <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: theme.muted }]}>
              {lang.settings.framework}
            </Text>
            <Text style={[styles.aboutValue, { color: theme.color }]}>
                alambre v1.2.0
            </Text>
          </View>
          <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: theme.muted }]}>
              {lang.settings.developer}
            </Text>
            <Text style={[styles.aboutValue, { color: theme.primary }]}>
                @marcosdima
            </Text>
          </View>

          <View style={styles.aboutActions}>
            <AppButton
              variant="outline"
              tone="primary"
              size="md"
              label={lang.settings.copyDiagnostics}
              onPress={handleCopyDiagnostics}
              rightIcon={
                <AlambreIcons.Documents
                  color={theme.primary}
                  lineWidth={2.2}
                  style={styles.actionIcon}
                />
              }
              fullWidth
            />
            <AppButton
              variant="ghost"
              tone="neutral"
              size="md"
              label={lang.settings.viewGithub}
              onPress={handleOpenGithub}
              rightIcon={
                <AlambreIcons.Arrow
                  drawIt
                  color={theme.color}
                  lineWidth={16}
                  style={styles.arrowIcon}
                />
              }
              fullWidth
            />
          </View>
        </View>
      </AppCard>

      {/* Restablecer ajustes / Reset */}
      <AppCard
        variant="outlined"
        title={lang.settings.resetTitle}
        subtitle={lang.settings.resetSubtitle}
        style={styles.card}
      >
        <AppButton
          variant="outline"
          tone="danger"
          size="md"
          label={lang.settings.resetAction}
          rightIcon={
            <AlambreIcons.Refresh
              color="#ef4444"
              lineWidth={2.2}
              style={styles.actionIcon}
            />
          }
          onPress={() => void handleReset()}
          fullWidth
        />
      </AppCard>
    </ScrollView>
  );
};

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
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 4,
    gap: 6,
    marginTop: 4,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  segmentedButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  segmentedText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggle: {
    height: 60,
    aspectRatio: 3.2,
  },
  aboutContent: {
    gap: 10,
    marginTop: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  aboutActions: {
    marginTop: 6,
    gap: 8,
  },
  coffeeIcon: {
    width: 18,
    height: 18,
  },
  actionIcon: {
    width: 18,
    height: 18,
  },
  arrowIcon: {
    width: 20,
    height: 14,
  },
  fontsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  fontChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
  },
  fontChipText: {
    fontSize: 15,
  },
});

