import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlambreIcons, useConfirm, useNavigator, useToast } from 'alambre';
import { useLang } from '../../providers/lang';
import { useConfig, type BotSpeed } from '../../providers/config';
import { useSensoryCues } from '../../providers/sensory';
import { useLightDark, light as lightTokens, dark as darkTokens } from '../../providers/theme';
import {
  AppCard,
  AppButton,
  AppSegmentedControl,
  AppSwitch,
  AppTextInput,
  ToggleLightDark,
} from '@some-alambre/ui';

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
  const { hapticsEnabled, setHapticsEnabled } = useSensoryCues();
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
      await saveField('botSpeed', 'slow');
      await setHapticsEnabled(true);
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Perfil de Jugador / Player Profile */}
        <AppCard
          variant="outlined"
          title={lang.settings.profileTitle}
          subtitle={lang.settings.profileSubtitle}
          style={styles.card}
        >
          <AppTextInput
            label={lang.settings.profileNameLabel}
            placeholder={lang.settings.profileNamePlaceholder}
            value={config.playerName}
            onChangeText={(name) => void saveField('playerName', name)}
            helperText={lang.settings.profileNameHelper}
            clearable
            maxLength={20}
            returnKeyType="done"
          />
        </AppCard>

        {/* Idioma / Language */}
        <AppCard
          variant="outlined"
          title={lang.settings.language}
          style={styles.card}
        >
          <AppSegmentedControl
            options={[
              { label: 'Español', value: 'es' },
              { label: 'English', value: 'en' },
            ]}
            value={currentLang}
            onChange={(code) => void changeLang(code as 'es' | 'en')}
          />
        </AppCard>

        {/* Velocidad de Juego & Bots / Game & Bot Speed */}
        <AppCard
          variant="outlined"
          title={lang.settings.botSpeedTitle}
          subtitle={lang.settings.botSpeedSubtitle}
          style={styles.card}
        >
          <AppSegmentedControl
            options={[
              { label: lang.settings.botSpeedVerySlow, value: 'very_slow' },
              { label: lang.settings.botSpeedSlow, value: 'slow' },
              { label: lang.settings.botSpeedNormal, value: 'normal' },
              { label: lang.settings.botSpeedFast, value: 'fast' },
            ]}
            value={config.botSpeed ?? 'slow'}
            onChange={(speed) => void saveField('botSpeed', speed as BotSpeed)}
          />
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
              accessibilityLabel={lang.settings.theme}
              style={styles.toggle}
              colors={{
                light: {
                  background: lightTokens.surfaceAlt,
                  border: lightTokens.border,
                  circle: lightTokens.primary,
                  sun: lightTokens.warning,
                  moon: lightTokens.muted,
                },
                dark: {
                  background: darkTokens.surfaceAlt,
                  border: darkTokens.border,
                  circle: darkTokens.primary,
                  sun: darkTokens.warning,
                  moon: darkTokens.muted,
                },
              }}
            />
          </View>
        </AppCard>

        {/* Respuesta Sensorial / Haptics */}
        <AppCard
          variant="outlined"
          title={lang.settings.sensoryTitle}
          subtitle={lang.settings.sensorySubtitle}
          style={styles.card}
        >
          <AppSwitch
            checked={hapticsEnabled}
            onChange={(val) => void setHapticsEnabled(val)}
            label={lang.settings.hapticsLabel}
          />
        </AppCard>

        {/* Tipografía / Typography */}
        <AppCard
          variant="outlined"
          title={lang.settings.typography}
          subtitle={lang.settings.typographySubtitle}
          style={styles.card}
        >
          <View style={[styles.fontPreviewBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text
              style={[
                styles.fontPreviewSample,
                { color: theme.color, fontFamily: config.fontFamily },
              ]}
            >
              {lang.settings.fontPreviewText}
            </Text>
            <Text
              style={[
                styles.fontPreviewMeta,
                { color: theme.muted, fontFamily: config.fontFamily },
              ]}
            >
              {config.fontFamily} • ABCDEFGHIJKLMNOPQRSTUVWXYZ • 1234567890
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fontsScroll}
          >
            {FONTS.map((font) => {
              const active = config.fontFamily === font;
              const displayLabel =
                font === 'PlayfairDisplay'
                  ? 'Playfair'
                  : font === 'SpaceMono'
                    ? 'Space Mono'
                    : font;
              return (
                <Pressable
                  key={font}
                  accessibilityRole="button"
                  accessibilityLabel={displayLabel}
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
                lineWidth={1.75}
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
              <Text style={[styles.aboutLabel, { color: theme.muted, fontFamily: config.fontFamily }]}>
                {lang.settings.version}
              </Text>
              <Text style={[styles.aboutValue, { color: theme.color, fontFamily: config.fontFamily }]}>
                0.1.0
              </Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.muted, fontFamily: config.fontFamily }]}>
                {lang.settings.framework}
              </Text>
              <Text style={[styles.aboutValue, { color: theme.color, fontFamily: config.fontFamily }]}>
                alambre v1.2.0 • room-relay v1.0.0
              </Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: theme.muted, fontFamily: config.fontFamily }]}>
                {lang.settings.developer}
              </Text>
              <Text style={[styles.aboutValue, { color: theme.primary, fontFamily: config.fontFamily }]}>
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
                    lineWidth={1.75}
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
                color={theme.danger}
                lineWidth={1.75}
                style={styles.actionIcon}
              />
            }
            onPress={() => void handleReset()}
            fullWidth
          />
        </AppCard>
      </View>
    </View>
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
  fontPreviewBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 6,
  },
  fontPreviewSample: {
    fontSize: 15,
    lineHeight: 22,
  },
  fontPreviewMeta: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  fontChip: {
    minHeight: 44,
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
