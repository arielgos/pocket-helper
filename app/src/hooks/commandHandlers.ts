import { t } from "../i18n";
import {
  sendChatMessage,
  clearMessagesBySession,
} from "../services/chatService";
import {
  createSession,
  deleteSession,
} from "../services/sessionService";
import { MessageType } from "../types/chat";
import {
  COMMAND_ECHO_LENGTH,
  COMMAND_SESSION_LENGTH,
  COMMAND_POST_LENGTH,
  DEFAULT_SESSION_ID,
} from "../constants/chat";

type CommandHandlerParams = {
  userId: string;
  currentSessionId: string;
  setInputValue: (value: string) => void;
  setErrorMessage: (message: string | null) => void;
  setShowCommandHelp: (show: boolean) => void;
  setShowSessionsList: (show: boolean) => void;
  switchSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : t("errors.unknownValidationSend");
}

export async function handleHelpCommand(
  params: CommandHandlerParams,
): Promise<void> {
  params.setShowCommandHelp(true);
  params.setInputValue("");
}

export async function handleEchoCommand(
  command: string,
  params: CommandHandlerParams,
): Promise<void> {
  const echoMessage = command.substring(COMMAND_ECHO_LENGTH).trim();
  
  if (!echoMessage) {
    params.setErrorMessage(t("errors.commandNotFound", { command }));
    return;
  }

  await sendChatMessage({
    text: echoMessage,
    userId: params.userId,
    sessionId: params.currentSessionId,
    type: MessageType.Echo,
  });
  
  params.setInputValue("");
  params.setErrorMessage(null);
}

export async function handleClearCommand(
  params: CommandHandlerParams,
): Promise<void> {
  try {
    await clearMessagesBySession(params.currentSessionId);
    params.setInputValue("");
    params.setErrorMessage(null);
  } catch (error) {
    const message = getErrorMessage(error);
    params.setErrorMessage(t("errors.failedValidateSend", { message }));
  }
}

export async function handleSessionsCommand(
  params: CommandHandlerParams,
): Promise<void> {
  try {
    await params.refreshSessions();
    params.setShowSessionsList(true);
  } catch (error) {
    const message = getErrorMessage(error);
    params.setErrorMessage(t("errors.failedValidateSend", { message }));
  }
  params.setInputValue("");
}

export async function handleSessionCommand(
  command: string,
  params: CommandHandlerParams,
): Promise<void> {
  const sessionName = command.substring(COMMAND_SESSION_LENGTH).trim();
  
  if (!sessionName) {
    params.setErrorMessage(t("errors.sessionNameRequired"));
    params.setInputValue("");
    return;
  }

  try {
    const newSession = await createSession(sessionName);
    await params.switchSession(newSession.id);
    params.setErrorMessage(t("errors.sessionSwitched", { name: sessionName }));
    params.setInputValue("");
  } catch (error) {
    const message = getErrorMessage(error);
    params.setErrorMessage(t("errors.failedValidateSend", { message }));
  }
}

export async function handleRemoveCommand(
  params: CommandHandlerParams,
): Promise<void> {
  try {
    if (params.currentSessionId === DEFAULT_SESSION_ID) {
      params.setErrorMessage(t("errors.cannotDeleteDefaultSession"));
      params.setInputValue("");
      return;
    }

    await deleteSession(params.currentSessionId);
    await params.switchSession(DEFAULT_SESSION_ID);
    params.setErrorMessage(t("errors.sessionDeleted"));
  } catch (error) {
    const message = getErrorMessage(error);
    params.setErrorMessage(t("errors.failedValidateSend", { message }));
  }
  params.setInputValue("");
}

export async function handlePostCommand(
  command: string,
  params: CommandHandlerParams,
): Promise<void> {
  const postCommand = command.substring(COMMAND_POST_LENGTH).trim();
  
  if (!postCommand) {
    params.setErrorMessage(t("errors.postCommandFormat"));
    return;
  }

  const parts = postCommand.split(" ");
  if (parts.length < 2) {
    params.setErrorMessage(t("errors.postCommandFormat"));
    return;
  }

  const topic = parts[0];
  const link = parts.slice(1).join(" ");

  if (!link.startsWith("http://") && !link.startsWith("https://")) {
    params.setErrorMessage(t("errors.invalidLinkFormat"));
    return;
  }

  const formattedMessage = `${topic} [${link}]`;
  await sendChatMessage({
    text: formattedMessage,
    userId: params.userId,
    sessionId: params.currentSessionId,
    type: MessageType.Post,
  });
  
  params.setInputValue("");
  params.setErrorMessage(null);
}
