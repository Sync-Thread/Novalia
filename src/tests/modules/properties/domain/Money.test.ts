import { describe, it, expect } from 'vitest';
import { Money } from '../../../../modules/properties/domain/value-objects/Money';
import { CURRENCY } from '../../../../modules/properties/domain/enums';

describe('Money Value Object', () => {
  describe('constructor', () => {
    it('should create Money with valid amount and default currency MXN', () => {
      const money = new Money(1000000);
      
      expect(money.amount).toBe(1000000);
      expect(money.currency).toBe(CURRENCY.MXN);
    });

    it('should create Money with custom currency USD', () => {
      const money = new Money(500000, CURRENCY.USD);
      
      expect(money.amount).toBe(500000);
      expect(money.currency).toBe(CURRENCY.USD);
    });

    it('should throw error for negative amount', () => {
      expect(() => new Money(-1000)).toThrow();
    });

    it('should throw error for zero amount', () => {
      expect(() => new Money(0)).toThrow();
    });

    it('should accept decimal amounts', () => {
      const money = new Money(1500000.50);
      
      expect(money.amount).toBe(1500000.50);
    });
  });
});
