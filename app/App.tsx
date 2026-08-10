import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatComposer } from './src/components/ChatComposer';
import { ChatHeader } from './src/components/ChatHeader';
import { ChatMessageList } from './src/components/ChatMessageList';
import { ChatStatusBanner } from './src/components/ChatStatusBanner';
import { CommandHelpModal } from './src/components/CommandHelpModal';
import { SessionsModal } from './src/components/SessionsModal';
import { t } from './src/i18n';
import { useChatMessages } from './src/hooks/useChatMessages';
import { useMessageComposer } from './src/hooks/useMessageComposer';
import { createCurrentUserId } from './src/services/chatService';

const currentUserId = createCurrentUserId();

export default function App() {
  const { messages, loading, errorMessage: loadErrorMessage } = useChatMessages();
  const {
    inputValue,
    setInputValue,
    validatingMessage,
    errorMessage: composerErrorMessage,
    canSend,
    sendMessage,
    showCommandHelp,
    setShowCommandHelp,
    showSessionsList,
    setShowSessionsList,
    sessionsList,
  } = useMessageComposer(currentUserId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ChatHeader />

        <ChatStatusBanner
          loading={loading}
          errorMessage={loadErrorMessage ?? composerErrorMessage}
          validationMessage={
            validatingMessage
              ? Platform.OS === 'android'
                ? t('labels.checkingMessageClarityOnDevice')
                : t('labels.checkingMessageClarity')
              : null
          }
        />

        {!loading ? (
          <ChatMessageList messages={messages} currentUserId={currentUserId} />
        ) : null}

        <ChatComposer
          inputValue={inputValue}
          onChangeText={setInputValue}
          onSend={sendMessage}
          canSend={canSend}
          validatingMessage={validatingMessage}
        />
        
        <CommandHelpModal
          visible={showCommandHelp}
          onClose={() => setShowCommandHelp(false)}
        />
        
        <SessionsModal
          visible={showSessionsList}
          onClose={() => setShowSessionsList(false)}
          sessions={sessionsList}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
  },
});
