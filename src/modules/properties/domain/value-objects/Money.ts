// src/modules/properties/domain/value-objects/Money.ts
// V.O: Dinero con moneda (default MXN usando valor runtime).
import type { Currency } from "../enums";
import { CURRENCY } from "../enums";

export class Money {
  public readonly amount: number;
  public readonly currency: Currency;

  constructor(amount: number, currency: Currency = CURRENCY.MXN) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
    this.amount = amount;
    this.currency = currency;
  }
}
