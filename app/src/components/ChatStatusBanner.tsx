import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";

type ChatStatusBannerProps = {
  loading: boolean;
  loadingMessage?: string | null;
  validationMessage?: string | null;
  errorMessage?: string | null;
};

export function ChatStatusBanner({
  loading,
  loadingMessage,
  validationMessage,
  errorMessage,
}: ChatStatusBannerProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
        <Text style={styles.loadingText}>
          {loadingMessage ?? t("labels.loadingMessages")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {validationMessage ? (
        <Text style={styles.validationInfo}>{validationMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingTop: 8,
  },
  error: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 10,
    backgroundColor: "#000000",
    color: "#ff0000",
    borderRadius: 8,
    borderColor: "#ff0000",
    borderWidth: 1,
  },
  validationInfo: {
    marginHorizontal: 12,
    marginTop: 8,
    color: "#00ff00",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#00ff00",
  },
});
