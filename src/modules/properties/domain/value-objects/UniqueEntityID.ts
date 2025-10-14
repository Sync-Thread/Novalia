// src/modules/properties/domain/value-objects/UniqueEntityID.ts
// V.O: Identidad única con validación UUID v4/v5
import type { UUID } from "../enums";

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

export class UniqueEntityID {
  public readonly value: UUID;

  constructor(value: UUID) {
    if (!UUID_REGEX.test(value as unknown as string)) {
      throw new Error("Invalid UUID");
    }
    this.value = value;
  }

  toString() {
    return this.value as unknown as string;
  }
}
