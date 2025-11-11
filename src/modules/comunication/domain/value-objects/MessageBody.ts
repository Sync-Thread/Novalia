import { CHAT_ERROR_CODE, ChatError } from "../errors/ChatError";

const MAX_LENGTH = 2000;

export class MessageBody {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): MessageBody {
    const normalized = (raw ?? "").trim();
    if (!normalized) {
      throw new ChatError(CHAT_ERROR_CODE.MESSAGE_EMPTY, "Message body cannot be empty");
    }
    if (normalized.length > MAX_LENGTH) {
      throw new ChatError(CHAT_ERROR_CODE.MESSAGE_TOO_LONG, `Message exceeds ${MAX_LENGTH} characters`, {
        details: { length: normalized.length },
      });
    }
    return new MessageBody(normalized);
  }

  static fromPersistence(raw: string | null | undefined): MessageBody | null {
    if (!raw) {
      return null;
    }
    return new MessageBody(raw);
  }

  toString(): string {
    return this.value;
  }

  valueOf(): string {
    return this.value;
  }
}
