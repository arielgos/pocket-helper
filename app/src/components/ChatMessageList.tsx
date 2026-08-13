import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Linking,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { ChatMessage } from "../types/chat";
import { t } from "../i18n";
import { SYSTEM_USER_ID } from "../constants/chat";

type ChatMessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
};

export function ChatMessageList({
  messages,
  currentUserId,
}: ChatMessageListProps) {
  const isImageUrl = (text: string): boolean => {
    const trimmedText = text.trim();
    return (
      (trimmedText.startsWith("http://") ||
        trimmedText.startsWith("https://")) &&
      (trimmedText.includes("firebasestorage.googleapis.com") ||
        trimmedText.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) !== null)
    );
  };

  const getMarkdownStyles = (isMine: boolean) => ({
    body: {
      color: "#00ff00",
      fontSize: 15,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 4,
      color: "#00ff00",
    },
    strong: {
      color: "#00ff00",
      fontWeight: "bold" as const,
    },
    em: {
      color: "#00ff00",
      fontStyle: "italic" as const,
    },
    link: {
      color: "#00dd00",
      textDecorationLine: "underline" as const,
    },
    code_inline: {
      backgroundColor: "#001100",
      color: "#00ff00",
      borderWidth: 1,
      borderColor: "#003300",
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    code_block: {
      backgroundColor: "#001100",
      color: "#00ff00",
      borderWidth: 1,
      borderColor: "#003300",
      borderRadius: 3,
      padding: 8,
      marginVertical: 4,
    },
    fence: {
      backgroundColor: "#001100",
      color: "#00ff00",
      borderWidth: 1,
      borderColor: "#003300",
      borderRadius: 3,
      padding: 8,
      marginVertical: 4,
    },
    blockquote: {
      backgroundColor: "#001100",
      borderLeftColor: "#00ff00",
      borderLeftWidth: 3,
      paddingLeft: 8,
      marginVertical: 4,
      color: "#00ff00",
    },
    list_item: {
      color: "#00ff00",
    },
    bullet_list: {
      color: "#00ff00",
    },
    ordered_list: {
      color: "#00ff00",
    },
    heading1: {
      color: "#00ff00",
      fontWeight: "bold" as const,
      fontSize: 20,
      marginVertical: 4,
    },
    heading2: {
      color: "#00ff00",
      fontWeight: "bold" as const,
      fontSize: 18,
      marginVertical: 4,
    },
    heading3: {
      color: "#00ff00",
      fontWeight: "bold" as const,
      fontSize: 16,
      marginVertical: 4,
    },
  });

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messagesList}
      inverted
      renderItem={({ item }) => {
        const isMine = item.userId === currentUserId;
        const isSystemMessage = item.userId === SYSTEM_USER_ID;
        const isImage = isSystemMessage && isImageUrl(item.text);

        return (
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.myMessage : styles.otherMessage,
            ]}
          >
            {isImage ? (
              <Pressable
                onPress={() => Linking.openURL(item.text.trim())}
                style={({ pressed }) => [
                  styles.imagePressable,
                  pressed && styles.imagePressablePressed,
                ]}
              >
                <Image
                  source={{ uri: item.text.trim() }}
                  style={styles.messageImage}
                  resizeMode="contain"
                />
              </Pressable>
            ) : (
              <Markdown style={getMarkdownStyles(isMine)}>{item.text}</Markdown>
            )}
            <View style={styles.metaContainer}>
              <Text style={styles.messageType}>
                [{item.type.toUpperCase()}]
              </Text>
              <Text
                style={[styles.messageMeta, isMine && styles.myMessageMeta]}
              >
                {new Date(item.createdAt).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.emptyState}>{t("labels.emptyState")}</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  messagesList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 12,
    gap: 10,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#002200",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#00ff00",
  },
  imagePressable: {
    borderRadius: 4,
  },
  imagePressablePressed: {
    opacity: 0.7,
  },
  messageImage: {
    width: "100%",
    minWidth: "100%",
    minHeight: 200,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  messageType: {
    fontSize: 11,
    color: "#004400",
  },
  messageMeta: {
    fontSize: 11,
    color: "#00ff00",
  },
  myMessageMeta: {
    color: "#00ff00",
  },
  emptyState: {
    textAlign: "center",
    color: "#00ff00",
    paddingVertical: 30,
  },
});
