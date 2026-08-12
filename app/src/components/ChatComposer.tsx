import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { t } from "../i18n";

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
        placeholder={t("labels.messagePlaceholder")}
        placeholderTextColor="#006600"
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
          {validatingMessage ? t("labels.checking") : t("labels.send")}
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
    borderTopColor: "#00ff00",
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#00ff00",
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#000000",
    color: "#00ff00",
  },
  sendButton: {
    backgroundColor: "#003300",
    borderRadius: 0,
    paddingHorizontal: 16,
    minHeight: 94,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#002200",
  },
  sendButtonText: {
    color: "#00ff00",
    fontWeight: "600",
  },
});
