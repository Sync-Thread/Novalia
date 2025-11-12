const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UniqueEntityID {
  readonly value: string;

  constructor(value: string | UniqueEntityID) {
    // Si ya es un UniqueEntityID, extraer el valor
    if (value instanceof UniqueEntityID) {
      this.value = value.value;
      return;
    }
    
    if (!UUID_REGEX.test(value)) {
      throw new Error(`Invalid UUID value: ${value}`);
    }
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: UniqueEntityID): boolean {
    return this.value === other.value;
  }
}
