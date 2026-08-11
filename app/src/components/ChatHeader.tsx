import { StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { useSession } from "../context/SessionContext";

export function ChatHeader() {
  const { currentSessionId, sessions } = useSession();
  const currentSessionName =
    sessions.find((s) => s.id === currentSessionId)?.name || "Default Session";

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{t("app.title")}</Text>
      <Text style={styles.subtitle}>{t("app.subtitle")}</Text>
      {currentSessionId ? (
        <Text style={styles.sessionName}>[{currentSessionName}]</Text>
      ) : (
        <Text style={styles.sessionName}>[Default Session]</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#00ff00",
    backgroundColor: "#000000",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00ff00",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#00ff00",
  },
  sessionName: {
    marginTop: 4,
    fontSize: 12,
    color: "#00ff00",
    fontStyle: "italic",
  },
});
