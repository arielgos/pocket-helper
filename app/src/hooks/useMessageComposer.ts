import { useCallback, useMemo, useState } from "react";
import { t } from "../i18n";
import { validateMessageUnderstandability } from "../messageValidation";
import {
  sendChatMessage,
  clearMessagesBySession,
} from "../services/chatService";
import {
  createSession,
  deleteSession,
} from "../services/sessionService";
import { useSession } from "../context/SessionContext";

export function useMessageComposer(userId: string) {
  const [inputValue, setInputValue] = useState("");
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCommandHelp, setShowCommandHelp] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const { currentSessionId, sessions, switchSession, refreshSessions } = useSession();
  const sessionsList = sessions;

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
          await sendChatMessage({
            text: echoMessage,
            userId,
            sessionId: currentSessionId,
            type: 'echo',
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
          await clearMessagesBySession(currentSessionId);
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
          await refreshSessions();
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
            // Switch to the newly created session
            await switchSession(newSession.id);
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

      // Handle /remove command
      if (command === "/remove" || command.startsWith("/remove ")) {
        try {
          // Prevent deletion of default session
          if (currentSessionId === "default") {
            setErrorMessage(t("errors.cannotDeleteDefaultSession"));
            setInputValue("");
            return;
          }

          // Delete the current session (this also handles switching to default)
          await deleteSession(currentSessionId);
          
          // Refresh sessions list and switch to default session
          await switchSession("default");
          
          setErrorMessage(t("errors.sessionDeleted"));
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
              await sendChatMessage({
                text: formattedMessage,
                userId,
                sessionId: currentSessionId,
                type: 'post',
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

      await sendChatMessage({
        text,
        userId,
        sessionId: currentSessionId,
        type: 'message',
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
  }, [inputValue, userId, currentSessionId, switchSession, refreshSessions]);

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
  };
}
