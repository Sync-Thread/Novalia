// src/modules/properties/domain/value-objects/UniqueEntityID.ts
// UUID value object with format validation.

import type { UUID } from "../enums";
import { InvalidValueError } from "../errors/InvalidValueError";

// Regex más permisiva que acepta cualquier UUID con formato válido
// Incluye versión 0 (nil UUID) y otros UUIDs especiales
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UniqueEntityID {
  public readonly value: UUID;

  constructor(value: UUID) {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidValueError("Invalid UUID", { details: { value } });
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }
}

