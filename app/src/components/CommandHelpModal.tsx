import { StyleSheet, Text, View, Modal, Pressable, ScrollView } from "react-native";
import { t } from "../i18n";

type CommandHelpModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CommandHelpModal({ visible, onClose }: CommandHelpModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{t("labels.commandHelpTitle")}</Text>
          <Text style={styles.modalDescription}>
            {t("labels.commandHelpDescription")}
          </Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.commandList}>
              {/* General Commands */}
              <Text style={styles.sectionTitle}>General</Text>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.help.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.help.description")}</Text>
              </View>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.clear.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.clear.description")}</Text>
              </View>

              {/* Message Commands */}
              <Text style={styles.sectionTitle}>Message Types</Text>

              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.echo.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.echo.description")}</Text>
              </View>

              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.post.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.post.description")}</Text>
              </View>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.process.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.process.description")}</Text>
              </View>
              
              {/* Session Management */}
              <Text style={styles.sectionTitle}>Session Management</Text>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.sessions.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.sessions.description")}</Text>
              </View>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.session.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.session.description")}</Text>
              </View>
              
              <View style={styles.commandItem}>
                <Text style={styles.commandUsage}>{t("commands.remove.usage")}</Text>
                <Text style={styles.commandDescription}>{t("commands.remove.description")}</Text>
              </View>
            </View>
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>
              {t("labels.commandHelpClose")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "#000000",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    shadowColor: "#00ff00",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
    borderColor: "#00ff00",
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#00ff00",
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    color: "#00ff00",
  },
  scrollView: {
    width: "100%",
    maxHeight: 400,
  },
  commandList: {
    width: "100%",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ff00",
    marginTop: 12,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#003300",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  commandItem: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#001a00",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#00ff00",
  },
  commandUsage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ff00",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  commandDescription: {
    fontSize: 13,
    color: "#00cc00",
    fontFamily: "monospace",
  },
  closeButton: {
    backgroundColor: "#003300",
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00ff00",
  },
  closeButtonText: {
    color: "#00ff00",
    fontWeight: "600",
  },
});
