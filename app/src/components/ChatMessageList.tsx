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
            <Text style={[styles.messageMeta, isMine && styles.myMessageMeta]}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    color: '#111827',
    fontSize: 15,
  },
  myMessageText: {
    color: '#ffffff',
  },
  messageMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'right',
  },
  myMessageMeta: {
    color: '#dbeafe',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 30,
  },
});
