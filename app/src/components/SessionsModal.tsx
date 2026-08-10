import { StyleSheet, Text, View, Modal, Pressable } from "react-native";
import { t } from "../i18n";

type SessionsModalProps = {
  visible: boolean;
  onClose: () => void;
  sessions: { id: string; name: string; createdAt: number }[];
};

export function SessionsModal({ visible, onClose, sessions }: SessionsModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{t("labels.sessionsListTitle")}</Text>
          <Text style={styles.modalDescription}>
            {t("labels.sessionsListDescription")}
          </Text>
          
          {sessions.length > 0 ? (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSessions}>{t("labels.noSessions")}</Text>
          )}
          
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
  sessionList: {
    width: "100%",
    marginBottom: 20,
  },
  sessionItem: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#001a00",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionName: {
    fontSize: 16,
    color: "#00ff00",
    fontWeight: "500",
  },
  sessionDate: {
    fontSize: 12,
    color: "#00ff00",
    opacity: 0.7,
  },
  noSessions: {
    fontSize: 14,
    color: "#00ff00",
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#001a00",
    borderRadius: 0,
    padding: 10,
    elevation: 2,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00ff00",
  },
  closeButtonText: {
    color: "#00ff00",
    fontWeight: "bold",
  },
});