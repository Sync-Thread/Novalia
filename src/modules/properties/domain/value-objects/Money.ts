// src/modules/properties/domain/value-objects/Money.ts
// Money value object with currency and amount > 0 validation.

import type { Currency } from "../enums";
import { CURRENCY } from "../enums";
import { requirePositiveNumber } from "../utils/invariants";

export class Money {
  public readonly amount: number;
  public readonly currency: Currency;

  constructor(amount: number, currency: Currency = CURRENCY.MXN) {
    this.amount = requirePositiveNumber(amount, "amount");
    this.currency = currency;
  }
}

