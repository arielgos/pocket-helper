import { StyleSheet, Text, View, Modal, Pressable } from "react-native";
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

          <View style={styles.commandList}>
            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.help.usage")} - {t("commands.help.description")}
              </Text>
            </View>

            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.echo.usage")} - {t("commands.echo.description")}
              </Text>
            </View>
            
            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.clear.usage")} - {t("commands.clear.description")}
              </Text>
            </View>
            
            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.sessions.usage")} - {t("commands.sessions.description")}
              </Text>
            </View>
            
            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.session.usage")} - {t("commands.session.description")}
              </Text>
            </View>
            
            <View style={styles.commandItem}>
              <Text style={styles.commandText}>
                {t("commands.post.usage")} - {t("commands.post.description")}
              </Text>
            </View>
          </View>

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
  commandList: {
    width: "100%",
    marginBottom: 20,
  },
  commandItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#001a00",
    borderRadius: 4,
  },
  commandText: {
    fontSize: 16,
    textAlign: "left",
    color: "#00ff00",
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
