import { BaseDomainError } from "./BaseDomainError";

export const CHAT_ERROR_CODE = {
  ACCESS_DENIED: "ACCESS_DENIED",
  THREAD_NOT_FOUND: "THREAD_NOT_FOUND",
  MESSAGE_TOO_LONG: "MESSAGE_TOO_LONG",
  MESSAGE_EMPTY: "MESSAGE_EMPTY",
  PARTICIPANT_MISSING: "PARTICIPANT_MISSING",
  PAYLOAD_INVALID: "PAYLOAD_INVALID",
  UNKNOWN: "UNKNOWN",
} as const;

export type ChatErrorCode = typeof CHAT_ERROR_CODE[keyof typeof CHAT_ERROR_CODE];

export class ChatError<TCode extends ChatErrorCode = ChatErrorCode> extends BaseDomainError<TCode> {
  constructor(code: TCode, message: string, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(code, message, options);
  }
}
