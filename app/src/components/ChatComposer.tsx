import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { t } from '../i18n';

type ChatComposerProps = {
  inputValue: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  validatingMessage: boolean;
};

export function ChatComposer({
  inputValue,
  onChangeText,
  onSend,
  canSend,
  validatingMessage,
}: ChatComposerProps) {
  return (
    <View style={styles.composer}>
      <TextInput
        value={inputValue}
        onChangeText={onChangeText}
        placeholder={t('labels.messagePlaceholder')}
        style={styles.input}
        autoCorrect
        editable={!validatingMessage}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <Pressable
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Text style={styles.sendButtonText}>
          {validatingMessage ? t('labels.checking') : t('labels.send')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
