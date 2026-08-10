import { useCallback, useMemo, useState } from "react";
import { t } from "../i18n";
import { validateMessageUnderstandability } from "../messageValidation";
import { sendChatMessage, clearAllMessages } from "../services/chatService";

export function useMessageComposer(userId: string) {
  const [inputValue, setInputValue] = useState("");
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCommandHelp, setShowCommandHelp] = useState(false);

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
          await sendChatMessage({ text: echoMessage, userId });
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
          await clearAllMessages();
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

      await sendChatMessage({ text, userId });
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
  };
}
