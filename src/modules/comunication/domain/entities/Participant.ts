import type { ParticipantType } from "../enums";
import { UniqueEntityID } from "../value-objects";

export type ParticipantProps = {
  id: UniqueEntityID;
  type: ParticipantType;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  lastSeenAt?: Date | null;
};

export type ParticipantSnapshot = {
  id: string;
  type: ParticipantType;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  lastSeenAt: string | null;
};

export class Participant {
  private readonly idValue: UniqueEntityID;
  private readonly typeValue: ParticipantType;
  private readonly displayNameValue: string | null;
  private readonly avatarUrlValue: string | null;
  private readonly emailValue: string | null;
  private readonly phoneValue: string | null;
  private lastSeenAtValue: Date | null;

  constructor(props: ParticipantProps) {
    this.idValue = props.id;
    this.typeValue = props.type;
    this.displayNameValue = props.displayName ?? null;
    this.avatarUrlValue = props.avatarUrl ?? null;
    this.emailValue = props.email ?? null;
    this.phoneValue = props.phone ?? null;
    this.lastSeenAtValue = props.lastSeenAt ?? null;
  }

  get id(): UniqueEntityID {
    return this.idValue;
  }

  get type(): ParticipantType {
    return this.typeValue;
  }

  get displayName(): string | null {
    return this.displayNameValue;
  }

  get avatarUrl(): string | null {
    return this.avatarUrlValue;
  }

  get email(): string | null {
    return this.emailValue;
  }

  get phone(): string | null {
    return this.phoneValue;
  }

  get lastSeenAt(): Date | null {
    return this.lastSeenAtValue;
  }

  markSeen(at: Date): void {
    this.lastSeenAtValue = at;
  }

  toSnapshot(): ParticipantSnapshot {
    return {
      id: this.idValue.toString(),
      type: this.typeValue,
      displayName: this.displayNameValue,
      avatarUrl: this.avatarUrlValue,
      email: this.emailValue,
      phone: this.phoneValue,
      lastSeenAt: this.lastSeenAtValue ? this.lastSeenAtValue.toISOString() : null,
    };
  }

  static restore(snapshot: ParticipantSnapshot): Participant {
    return new Participant({
      id: new UniqueEntityID(snapshot.id),
      type: snapshot.type,
      displayName: snapshot.displayName,
      avatarUrl: snapshot.avatarUrl ?? undefined,
      email: snapshot.email ?? undefined,
      phone: snapshot.phone ?? undefined,
      lastSeenAt: snapshot.lastSeenAt ? new Date(snapshot.lastSeenAt) : null,
    });
  }
}
