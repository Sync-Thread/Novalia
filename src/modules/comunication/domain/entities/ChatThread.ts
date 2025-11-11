import type { ThreadStatus } from "../enums";
import { THREAD_STATUS } from "../enums";
import type { DomainClock } from "../clock";
import { systemClock } from "../clock";
import { InvariantViolationError } from "../errors";
import { UniqueEntityID } from "../value-objects";
import type { ChatMessage } from "./ChatMessage";
import { Participant, type ParticipantSnapshot } from "./Participant";

export type ThreadPropertySnapshot = {
  id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  state: string | null;
  coverImageUrl: string | null;
  operationType: string | null;
  status: string | null;
};

export type ChatThreadProps = {
  id: UniqueEntityID;
  orgId: UniqueEntityID | null;
  property?: ThreadPropertySnapshot | null;
  contactId?: UniqueEntityID | null;
  createdBy?: UniqueEntityID | null;
  participants?: Participant[];
  createdAt?: Date;
  lastMessageAt?: Date | null;
  unreadCount?: number;
  status?: ThreadStatus;
};

export type ChatThreadSnapshot = {
  id: string;
  orgId: string | null;
  property: ThreadPropertySnapshot | null;
  contactId: string | null;
  createdBy: string | null;
  participants: ParticipantSnapshot[];
  createdAt: string;
  lastMessageAt: string | null;
  unreadCount: number;
  status: ThreadStatus;
};

export class ChatThread {
  private readonly idValue: UniqueEntityID;
  private readonly orgIdValue: UniqueEntityID | null;
  private readonly propertySnapshot: ThreadPropertySnapshot | null;
  private readonly contactIdValue: UniqueEntityID | null;
  private readonly createdByValue: UniqueEntityID | null;
  private readonly createdAtValue: Date;
  private lastMessageAtValue: Date | null;
  private unreadCountValue: number;
  private statusValue: ThreadStatus;
  private readonly participantsMap = new Map<string, Participant>();
  private readonly clock: DomainClock;

  constructor(props: ChatThreadProps, deps?: { clock?: DomainClock }) {
    this.clock = deps?.clock ?? systemClock;
    this.idValue = props.id;
    this.orgIdValue = props.orgId ?? null;
    this.propertySnapshot = props.property ?? null;
    this.contactIdValue = props.contactId ?? null;
    this.createdByValue = props.createdBy ?? null;
    this.createdAtValue = props.createdAt ?? this.clock.now();
    this.lastMessageAtValue = props.lastMessageAt ?? null;
    this.unreadCountValue = props.unreadCount ?? 0;
    this.statusValue = props.status ?? THREAD_STATUS.Open;
    props.participants?.forEach(participant => this.participantsMap.set(participant.id.toString(), participant));
  }

  get id(): UniqueEntityID {
    return this.idValue;
  }

  get orgId(): UniqueEntityID | null {
    return this.orgIdValue;
  }

  get property(): ThreadPropertySnapshot | null {
    return this.propertySnapshot;
  }

  get contactId(): UniqueEntityID | null {
    return this.contactIdValue;
  }

  get createdBy(): UniqueEntityID | null {
    return this.createdByValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get lastMessageAt(): Date | null {
    return this.lastMessageAtValue;
  }

  get unreadCount(): number {
    return this.unreadCountValue;
  }

  get participants(): Participant[] {
    return Array.from(this.participantsMap.values());
  }

  get status(): ThreadStatus {
    return this.statusValue;
  }

  addParticipant(participant: Participant): void {
    this.participantsMap.set(participant.id.toString(), participant);
  }

  recordMessage(message: ChatMessage, options?: { increaseUnread?: boolean }): void {
    if (!message.threadId.equals(this.idValue)) {
      throw new InvariantViolationError("Message does not belong to this thread");
    }
    const createdAt = message.createdAt;
    this.lastMessageAtValue = createdAt;
    if (options?.increaseUnread) {
      this.unreadCountValue += 1;
    }
  }

  resetUnread(): void {
    this.unreadCountValue = 0;
  }

  archive(): void {
    this.statusValue = THREAD_STATUS.Archived;
  }

  reopen(): void {
    this.statusValue = THREAD_STATUS.Open;
  }

  touch(): void {
    this.lastMessageAtValue = this.clock.now();
  }

  toSnapshot(): ChatThreadSnapshot {
    return {
      id: this.idValue.toString(),
      orgId: this.orgIdValue ? this.orgIdValue.toString() : null,
      property: this.propertySnapshot ? { ...this.propertySnapshot } : null,
      contactId: this.contactIdValue ? this.contactIdValue.toString() : null,
      createdBy: this.createdByValue ? this.createdByValue.toString() : null,
      participants: this.participants.map(participant => participant.toSnapshot()),
      createdAt: this.createdAtValue.toISOString(),
      lastMessageAt: this.lastMessageAtValue ? this.lastMessageAtValue.toISOString() : null,
      unreadCount: this.unreadCountValue,
      status: this.statusValue,
    };
  }

  static restore(snapshot: ChatThreadSnapshot, deps?: { clock?: DomainClock }): ChatThread {
    return new ChatThread(
      {
        id: new UniqueEntityID(snapshot.id),
        orgId: snapshot.orgId ? new UniqueEntityID(snapshot.orgId) : null,
        property: snapshot.property ? { ...snapshot.property } : null,
        contactId: snapshot.contactId ? new UniqueEntityID(snapshot.contactId) : null,
        createdBy: snapshot.createdBy ? new UniqueEntityID(snapshot.createdBy) : null,
        participants: snapshot.participants.map(Participant.restore),
        createdAt: new Date(snapshot.createdAt),
        lastMessageAt: snapshot.lastMessageAt ? new Date(snapshot.lastMessageAt) : null,
        unreadCount: snapshot.unreadCount,
        status: snapshot.status,
      },
      deps,
    );
  }
}
