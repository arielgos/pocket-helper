import { useCallback, useMemo, useState } from "react";
import { t } from "../i18n";
import { validateMessageUnderstandability } from "../messageValidation";
import {
  sendChatMessage,
  clearAllMessages,
  clearMessagesBySession,
} from "../services/chatService";
import {
  getAllSessions,
  createSession,
  setCurrentSession,
  getCurrentSessionId,
} from "../services/sessionService";

export function useMessageComposer(userId: string) {
  const [inputValue, setInputValue] = useState("");
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCommandHelp, setShowCommandHelp] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);

  const canSend = useMemo(
    () => inputValue.trim().length > 0 && !validatingMessage,
    [inputValue, validatingMessage],
  );

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (text.length === 0) {
      setErrorMessage(t("errors.messageCannotBeEmpty"));
      return;
    }

    // Check if this is a command
    if (text.startsWith("/")) {
      const command = text.trim().toLowerCase();

      // Handle /help command
      if (command === "/help") {
        setShowCommandHelp(true);
        setInputValue("");
        return;
      }

      // Handle /echo command
      if (command.startsWith("/echo ")) {
        const echoMessage = command.substring(6).trim(); // Remove "/echo " and trim
        if (echoMessage) {
          // Get current session ID and pass it to sendChatMessage
          const currentSessionId = await getCurrentSessionId();
          await sendChatMessage({
            text: echoMessage,
            userId,
            sessionId: currentSessionId ?? undefined,
          });
          setInputValue("");
          setErrorMessage(null);
          return;
        } else {
          setErrorMessage(t("errors.commandNotFound", { command: text }));
          return;
        }
      }

      // Handle /clear command
      if (command === "/clear") {
        try {
          // Get current session ID to clear only messages from that session
          const currentSessionId = await getCurrentSessionId();
          if (currentSessionId) {
            // In a real implementation, this would clear only messages from the current session
            await clearMessagesBySession(currentSessionId);
          } else {
            // If no session is set, clear all messages (backward compatibility)
            await clearAllMessages();
          }
          setInputValue("");
          setErrorMessage(null);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("errors.unknownValidationSend");
          setErrorMessage(t("errors.failedValidateSend", { message }));
        }
        return;
      }

      // Handle /sessions command
      if (command === "/sessions") {
        try {
          const sessions = await getAllSessions();
          console.log("Sessions retrieved:", sessions); // Debug log
          setSessionsList(sessions);
          setShowSessionsList(true);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("errors.unknownValidationSend");
          setErrorMessage(t("errors.failedValidateSend", { message }));
        }
        setInputValue("");
        return;
      }

      // Handle /session command
      if (command.startsWith("/session ")) {
        const sessionName = command.substring(9).trim(); // Remove "/session " and trim
        if (sessionName) {
          try {
            const newSession = await createSession(sessionName);
            // Set the newly created session as current
            await setCurrentSession(newSession.id);
            // Show feedback about session creation or switching
            setErrorMessage(t("errors.sessionSwitched", { name: sessionName }));
            setInputValue("");
            return;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : t("errors.unknownValidationSend");
            setErrorMessage(t("errors.failedValidateSend", { message }));
          }
          return;
        } else {
          setErrorMessage(t("errors.sessionNameRequired"));
          setInputValue("");
          return;
        }
      }

      // Handle /post command
      if (command.startsWith("/post ")) {
        const postCommand = command.substring(6).trim(); // Remove "/post " and trim
        if (postCommand) {
          // Parse topic and link from the command
          const parts = postCommand.split(" ");
          if (parts.length >= 2) {
            const topic = parts[0];
            const link = parts.slice(1).join(" ");
            console.log("Parsed topic:", topic, "Parsed link:", link); // Debug log

            // Validate that link looks like a URL (basic validation)
            if (link.startsWith("http://") || link.startsWith("https://")) {
              const formattedMessage = `${topic} [${link}]`;
              const currentSessionId = await getCurrentSessionId();
              await sendChatMessage({
                text: formattedMessage,
                userId,
                sessionId: currentSessionId ?? undefined,
              });
              setInputValue("");
              setErrorMessage(null);
              return;
            } else {
              setErrorMessage(t("errors.invalidLinkFormat"));
              return;
            }
          } else {
            setErrorMessage(t("errors.postCommandFormat"));
            return;
          }
        } else {
          setErrorMessage(t("errors.postCommandFormat"));
          return;
        }
      }

      // Handle unknown command
      setErrorMessage(t("errors.commandNotFound", { command: text }));
      return;
    }

    setValidatingMessage(true);

    try {
      const validation = await validateMessageUnderstandability(text);

      if (!validation.understandable) {
        setErrorMessage(
          t("errors.messageNotClearEnough", { reason: validation.reason }),
        );
        return;
      }

      // Get current session ID and pass it to sendChatMessage
      const currentSessionId = await getCurrentSessionId();
      await sendChatMessage({
        text,
        userId,
        sessionId: currentSessionId ?? undefined,
      });
      setInputValue("");
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("errors.unknownValidationSend");
      setErrorMessage(t("errors.failedValidateSend", { message }));
    } finally {
      setValidatingMessage(false);
    }
  }, [inputValue, userId]);

  return {
    inputValue,
    setInputValue,
    validatingMessage,
    errorMessage,
    canSend,
    sendMessage,
    showCommandHelp,
    setShowCommandHelp,
    showSessionsList,
    setShowSessionsList,
    sessionsList,
    setSessionsList,
  };
}
