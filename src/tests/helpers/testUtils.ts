import { vi } from 'vitest';

/**
 * Mock para generateId que genera UUIDs válidos v4
 */
export function mockGenerateId() {
  return vi.doMock('../../../../modules/properties/application/_shared/id', () => ({
    generateId: () => crypto.randomUUID(),
  }));
}

/**
 * Genera un UUID válido para tests
 */
export function generateTestId(): string {
  return crypto.randomUUID();
}
