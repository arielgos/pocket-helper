import { useCallback, useMemo, useState } from "react";
import { t } from "../i18n";
import { validateMessageUnderstandability } from "../messageValidation";
import { sendChatMessage } from "../services/chatService";

export function useMessageComposer(userId: string) {
  const [inputValue, setInputValue] = useState("");
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  };
}
