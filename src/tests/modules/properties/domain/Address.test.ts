import { describe, it, expect } from 'vitest';
import { Address } from '../../../../modules/properties/domain/value-objects/Address';

describe('Address Value Object', () => {
  describe('constructor', () => {
    it('should create Address with required fields', () => {
      const address = new Address({
        city: 'Guadalajara',
        state: 'Jalisco',
        country: 'México',
      });

      expect(address.city).toBe('Guadalajara');
      expect(address.state).toBe('Jalisco');
      expect(address.country).toBe('México');
      expect(address.displayAddress).toBe(false);
    });

    it('should create Address with all fields', () => {
      const address = new Address({
        addressLine: 'Av. Américas 1500',
        neighborhood: 'Providencia',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44630',
        country: 'México',
        displayAddress: true,
      });

      expect(address.addressLine).toBe('Av. Américas 1500');
      expect(address.neighborhood).toBe('Providencia');
      expect(address.postalCode).toBe('44630');
      expect(address.displayAddress).toBe(true);
    });

    it('should default displayAddress to false for privacy', () => {
      const address = new Address({
        city: 'CDMX',
        state: 'Ciudad de México',
        country: 'México',
      });

      expect(address.displayAddress).toBe(false);
    });

    it('should throw error for empty city', () => {
      expect(() => new Address({
        city: '',
        state: 'Jalisco',
        country: 'México',
      })).toThrow();
    });

    it('should throw error for empty state', () => {
      expect(() => new Address({
        city: 'Guadalajara',
        state: '',
        country: 'México',
      })).toThrow();
    });

    it('should throw error for empty country', () => {
      expect(() => new Address({
        city: 'Guadalajara',
        state: 'Jalisco',
        country: '',
      })).toThrow();
    });

    it('should trim whitespace from optional fields', () => {
      const address = new Address({
        addressLine: '  Av. Américas 1500  ',
        neighborhood: '  Providencia  ',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '  44630  ',
        country: 'México',
      });

      expect(address.addressLine).toBe('Av. Américas 1500');
      expect(address.neighborhood).toBe('Providencia');
      expect(address.postalCode).toBe('44630');
    });

    it('should convert empty optional strings to null', () => {
      const address = new Address({
        addressLine: '   ',
        city: 'Guadalajara',
        state: 'Jalisco',
        country: 'México',
      });

      expect(address.addressLine).toBeNull();
    });
  });
});
