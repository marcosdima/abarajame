import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppDialog, AppTextInput } from '@some-alambre/ui';
import { useLang } from '../../providers/lang';

export interface NicknameModalProps {
  visible: boolean;
  initialValue?: string;
  onSave: (nickname: string) => void;
}

export default function NicknameModal({
  visible,
  initialValue = '',
  onSave,
}: NicknameModalProps) {
  const { lang } = useLang();
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError(lang.nicknameModal.errorMinLength);
      return;
    }
    setError('');
    onSave(trimmed);
  };

  return (
    <AppDialog
      visible={visible}
      onClose={() => {
        // Enforce nickname creation on initial setup
        if (name.trim().length >= 2) {
          handleConfirm();
        }
      }}
      title={lang.nicknameModal.title}
      description={lang.nicknameModal.subtitle}
      tone="primary"
      confirmLabel={lang.nicknameModal.confirmAction}
      onConfirm={handleConfirm}
      dismissOnBackdropPress={false}
    >
      <View style={styles.content}>
        <AppTextInput
          label={lang.nicknameModal.inputLabel}
          placeholder={lang.nicknameModal.inputPlaceholder}
          value={name}
          onChangeText={(val) => {
            setName(val);
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
      </View>
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  inputContainer: {
    marginTop: 4,
  },
});
