import type { MessageStatus, SenderType } from "../enums";
import { MESSAGE_STATUS } from "../enums";
import { InvariantViolationError } from "../errors";
import type { DomainClock } from "../clock";
import { systemClock } from "../clock";
import { MessageBody, UniqueEntityID } from "../value-objects";

export type ChatMessageProps = {
  id: UniqueEntityID;
  threadId: UniqueEntityID;
  senderType: SenderType;
  senderId?: UniqueEntityID | null;
  body?: MessageBody | null;
  payload?: Record<string, unknown> | null;
  createdAt?: Date;
  deliveredAt?: Date | null;
  readAt?: Date | null;
};

export type ChatMessageSnapshot = {
  id: string;
  threadId: string;
  senderType: SenderType;
  senderId: string | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

export class ChatMessage {
  private readonly idValue: UniqueEntityID;
  private readonly threadIdValue: UniqueEntityID;
  private readonly senderTypeValue: SenderType;
  private readonly senderIdValue: UniqueEntityID | null;
  private readonly bodyValue: MessageBody | null;
  private readonly payloadValue: Record<string, unknown> | null;
  private readonly createdAtValue: Date;
  private deliveredAtValue: Date | null;
  private readAtValue: Date | null;
  private readonly clock: DomainClock;

  constructor(props: ChatMessageProps, deps?: { clock?: DomainClock }) {
    this.clock = deps?.clock ?? systemClock;
    this.idValue = props.id;
    this.threadIdValue = props.threadId;
    this.senderTypeValue = props.senderType;
    this.senderIdValue = props.senderId ?? null;
    this.bodyValue = props.body ?? null;
    this.payloadValue = props.payload ?? null;
    this.createdAtValue = props.createdAt ?? this.clock.now();
    this.deliveredAtValue = props.deliveredAt ?? null;
    this.readAtValue = props.readAt ?? null;
  }

  get id(): UniqueEntityID {
    return this.idValue;
  }

  get threadId(): UniqueEntityID {
    return this.threadIdValue;
  }

  get senderType(): SenderType {
    return this.senderTypeValue;
  }

  get senderId(): UniqueEntityID | null {
    return this.senderIdValue;
  }

  get body(): MessageBody | null {
    return this.bodyValue;
  }

  get payload(): Record<string, unknown> | null {
    return this.payloadValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get deliveredAt(): Date | null {
    return this.deliveredAtValue;
  }

  get readAt(): Date | null {
    return this.readAtValue;
  }

  get status(): MessageStatus {
    if (this.readAtValue) return MESSAGE_STATUS.Read;
    if (this.deliveredAtValue) return MESSAGE_STATUS.Delivered;
    return MESSAGE_STATUS.Sent;
  }

  markDelivered(at?: Date): void {
    if (this.deliveredAtValue) return;
    const timestamp = at ?? this.clock.now();
    if (timestamp < this.createdAtValue) {
      throw new InvariantViolationError("Delivered timestamp cannot be before creation");
    }
    this.deliveredAtValue = timestamp;
  }

  markRead(at?: Date): void {
    const timestamp = at ?? this.clock.now();
    if (timestamp < this.createdAtValue) {
      throw new InvariantViolationError("Read timestamp cannot be before creation");
    }
    this.readAtValue = timestamp;
    if (!this.deliveredAtValue) {
      this.deliveredAtValue = timestamp;
    }
  }

  toSnapshot(): ChatMessageSnapshot {
    return {
      id: this.idValue.toString(),
      threadId: this.threadIdValue.toString(),
      senderType: this.senderTypeValue,
      senderId: this.senderIdValue ? this.senderIdValue.toString() : null,
      body: this.bodyValue ? this.bodyValue.toString() : null,
      payload: this.payloadValue ? { ...this.payloadValue } : null,
      createdAt: this.createdAtValue.toISOString(),
      deliveredAt: this.deliveredAtValue ? this.deliveredAtValue.toISOString() : null,
      readAt: this.readAtValue ? this.readAtValue.toISOString() : null,
    };
  }

  static restore(snapshot: ChatMessageSnapshot, deps?: { clock?: DomainClock }): ChatMessage {
    return new ChatMessage(
      {
        id: new UniqueEntityID(snapshot.id),
        threadId: new UniqueEntityID(snapshot.threadId),
        senderType: snapshot.senderType,
        senderId: snapshot.senderId ? new UniqueEntityID(snapshot.senderId) : null,
        body: MessageBody.fromPersistence(snapshot.body),
        payload: snapshot.payload ?? null,
        createdAt: new Date(snapshot.createdAt),
        deliveredAt: snapshot.deliveredAt ? new Date(snapshot.deliveredAt) : null,
        readAt: snapshot.readAt ? new Date(snapshot.readAt) : null,
      },
      deps,
    );
  }
}
