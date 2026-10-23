import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { AppButton, AppCard, AppText, AppTextInput, AppTitle } from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { SpanishSuitGlyph } from '../cards/SpanishPlayingCard';

export interface NicknameSetupProps {
  onSave: (nickname: string) => void;
}

export default function NicknameSetup({ onSave }: NicknameSetupProps) {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = alias.trim();
    if (trimmed.length < 2) {
      setError(lang.nicknameModal.errorMinLength);
      return;
    }
    setError('');
    onSave(trimmed);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
        style={styles.content}
      >
        <View
          style={styles.suitsRow}
          accessible={true}
          accessibilityRole="image"
          accessibilityLabel="Baraja española"
        >
          <SpanishSuitGlyph suit="oros" size={28} color={theme.suitOros} />
          <SpanishSuitGlyph suit="copas" size={28} color={theme.suitCopas} />
          <SpanishSuitGlyph suit="espadas" size={28} color={theme.suitEspadas} />
          <SpanishSuitGlyph suit="bastos" size={28} color={theme.suitBastos} />
          <SpanishSuitGlyph suit="joker" size={28} color={theme.suitJoker} />
        </View>

        <AppCard variant="outlined" style={styles.card}>
          <View style={styles.header}>
            <AppTitle level={2} style={[styles.title, { color: theme.color }]}>
              {lang.nicknameModal.title}
            </AppTitle>
            <AppText variant="muted" style={styles.subtitle}>
              {lang.nicknameModal.subtitle}
            </AppText>
          </View>

          <AppTextInput
            label={lang.nicknameModal.inputLabel}
            placeholder={lang.nicknameModal.inputPlaceholder}
            value={alias}
            onChangeText={(val) => {
              setAlias(val);
              if (error) setError('');
            }}
            errorMessage={error}
            autoFocus
            clearable
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
            containerStyle={styles.inputContainer}
          />

          <View style={styles.buttonContainer}>
            <AppButton
              variant="solid"
              tone="primary"
              size="lg"
              label={lang.nicknameModal.confirmAction}
              accessibilityRole="button"
              accessibilityLabel={lang.nicknameModal.confirmAction}
              onPress={handleConfirm}
              fullWidth
            />
          </View>
        </AppCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    gap: 16,
  },
  suitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  card: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
    gap: 6,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
});
