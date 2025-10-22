import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateProperty } from '../../../../modules/properties/application/use-cases/create/CreateProperty';
import { InMemoryPropertyRepo } from '../../../../modules/properties/application/fakes/InMemoryPropertyRepo';
import type { AuthService } from '../../../../modules/properties/application/ports/AuthService';
import type { Clock } from '../../../../modules/properties/application/ports/Clock';
import { Result } from '../../../../modules/properties/application/_shared/result';

// Mock generateId to return valid UUIDs
vi.mock('../../../../modules/properties/application/_shared/id', () => ({
  generateId: () => crypto.randomUUID(),
}));

// Mock generateId to use crypto.randomUUID()
vi.mock('../../../../modules/properties/application/_shared/id', () => ({
  generateId: () => crypto.randomUUID(),
}));

describe('CreateProperty Use Case', () => {
  let createProperty: CreateProperty;
  let repo: InMemoryPropertyRepo;
  let mockAuth: AuthService;
  let mockClock: Clock;

  beforeEach(() => {
    repo = new InMemoryPropertyRepo();
    
    mockAuth = {
      getCurrent: async () =>
        Result.ok({
          userId: 'user-123',
          orgId: 'org-456',
          kycStatus: 'verified' as const,
          fullName: 'Test User',
          email: 'test@example.com',
          phone: null,
          roleHint: null,
        }),
    };

    mockClock = {
      now: () => new Date('2025-10-22T12:00:00Z'),
    };

    createProperty = new CreateProperty({
      repo,
      auth: mockAuth,
      clock: mockClock,
    });
  });

  describe('CRUD Básico - POST crear propiedad (estado: draft)', () => {
    it('should create a new property in draft status', async () => {
      const input = {
        title: 'Casa en Providencia',
        description: 'Hermosa casa con 3 recámaras',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);

      expect(result.isOk()).toBe(true);
      expect(result.value).toHaveProperty('id');

      const created = await repo.getById(result.value.id);
      expect(created.isOk()).toBe(true);
      expect(created.value?.status).toBe('draft');
      expect(created.value?.title).toBe('Casa en Providencia');
    });

    it('should fail with invalid input - missing title', async () => {
      const input = {
        description: 'Casa sin título',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);

      expect(result.isErr()).toBe(true);
    });

    it('should fail with invalid price (negative)', async () => {
      const input = {
        title: 'Casa en Providencia',
        price: { amount: -100000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);

      expect(result.isErr()).toBe(true);
    });

    it('should fail with missing address', async () => {
      const input = {
        title: 'Casa sin dirección',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
      };

      const result = await createProperty.execute(input);

      expect(result.isErr()).toBe(true);
    });

    it('should set orgId and userId from auth service', async () => {
      const input = {
        title: 'Casa en Providencia',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);
      expect(result.isOk()).toBe(true);

      const created = await repo.getById(result.value.id);
      expect(created.value?.orgId).toBe('org-456');
      expect(created.value?.listerUserId).toBe('user-123');
    });

    it('should fail when auth service returns error', async () => {
      mockAuth.getCurrent = async () => Result.fail('Not authenticated');

      const input = {
        title: 'Casa en Providencia',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);
      
      expect(result.isErr()).toBe(true);
    });

    it('should set timestamps from clock', async () => {
      const input = {
        title: 'Casa en Providencia',
        price: { amount: 3500000, currency: 'MXN' },
        propertyType: 'house',
        address: {
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'México',
        },
      };

      const result = await createProperty.execute(input);
      expect(result.isOk()).toBe(true);

      const created = await repo.getById(result.value.id);
      expect(created.value?.createdAt).toBe('2025-10-22T12:00:00.000Z');
      expect(created.value?.updatedAt).toBe('2025-10-22T12:00:00.000Z');
    });
  });
});
