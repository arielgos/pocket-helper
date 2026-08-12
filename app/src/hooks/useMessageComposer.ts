import { useCallback, useMemo, useState } from "react";
import { t } from "../i18n";
import { validateMessageUnderstandability } from "../messageValidation";
import { sendChatMessage } from "../services/chatService";
import { useSession } from "../context/SessionContext";
import { MessageType } from "../types/chat";
import {
  COMMAND_PREFIX,
  COMMAND_HELP,
  COMMAND_ECHO,
  COMMAND_CLEAR,
  COMMAND_SESSIONS,
  COMMAND_SESSION,
  COMMAND_REMOVE,
  COMMAND_POST,
  COMMAND_PROCESS,
} from "../constants/chat";
import {
  handleHelpCommand,
  handleEchoCommand,
  handleClearCommand,
  handleSessionsCommand,
  handleSessionCommand,
  handleRemoveCommand,
  handlePostCommand,
  handleProcessCommand,
} from "./commandHandlers";

export function useMessageComposer(userId: string) {
  const [inputValue, setInputValue] = useState("");
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCommandHelp, setShowCommandHelp] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const { currentSessionId, sessions, switchSession, refreshSessions } = useSession();

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

    const commandParams = {
      userId,
      currentSessionId,
      setInputValue,
      setErrorMessage,
      setShowCommandHelp,
      setShowSessionsList,
      switchSession,
      refreshSessions,
    };

    // Check if this is a command
    if (text.startsWith(COMMAND_PREFIX)) {
      const command = text.trim().toLowerCase();

      if (command === COMMAND_HELP) {
        await handleHelpCommand(commandParams);
        return;
      }

      if (command.startsWith(COMMAND_ECHO)) {
        await handleEchoCommand(command, commandParams);
        return;
      }

      if (command === COMMAND_CLEAR) {
        await handleClearCommand(commandParams);
        return;
      }

      if (command === COMMAND_SESSIONS) {
        await handleSessionsCommand(commandParams);
        return;
      }

      if (command.startsWith(COMMAND_SESSION)) {
        await handleSessionCommand(command, commandParams);
        return;
      }

      if (command === COMMAND_REMOVE || command.startsWith(`${COMMAND_REMOVE} `)) {
        await handleRemoveCommand(commandParams);
        return;
      }

      if (command.startsWith(COMMAND_POST)) {
        await handlePostCommand(command, commandParams);
        return;
      }

      if (command === COMMAND_PROCESS) {
        await handleProcessCommand(commandParams);
        return;
      }

      // Handle unknown command
      setErrorMessage(t("errors.commandNotFound", { command: text }));
      return;
    }

    // Handle regular message with validation
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
        type: MessageType.Message,
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
    sessions,
  };
}
