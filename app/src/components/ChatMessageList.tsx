import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ChatMessage } from '../types/chat';
import { t } from '../i18n';

type ChatMessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
};

export function ChatMessageList({
  messages,
  currentUserId,
}: ChatMessageListProps) {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messagesList}
      inverted
      renderItem={({ item }) => {
        const isMine = item.userId === currentUserId;

        return (
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.myMessage : styles.otherMessage,
            ]}
          >
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>
              {item.text}
            </Text>
            <View style={styles.metaContainer}>
              <Text style={styles.messageType}>[{item.type.toUpperCase()}]</Text>
              <Text style={[styles.messageMeta, isMine && styles.myMessageMeta]}>
                {new Date(item.createdAt).toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.emptyState}>{t('labels.emptyState')}</Text>
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
    maxWidth: '80%',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#002200',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  messageText: {
    color: '#00ff00',
    fontSize: 15,
  },
  myMessageText: {
    color: '#00ff00',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  messageType: {
    fontSize: 11,
    color: '#004400',
  },
  messageMeta: {
    fontSize: 11,
    color: '#00ff00',
  },
  myMessageMeta: {
    color: '#00ff00',
  },
  emptyState: {
    textAlign: 'center',
    color: '#00ff00',
    paddingVertical: 30,
  },
});
