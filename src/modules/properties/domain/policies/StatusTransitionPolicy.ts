// src/modules/properties/domain/policies/StatusTransitionPolicy.ts
// Guards valid transitions between property statuses.

import { PROPERTY_STATUS, type PropertyStatus } from "../enums";
import { StatusTransitionError } from "../errors/StatusTransitionError";

export const VALID_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  [PROPERTY_STATUS.Draft]: [PROPERTY_STATUS.Published, PROPERTY_STATUS.Archived],
  [PROPERTY_STATUS.Published]: [PROPERTY_STATUS.Draft, PROPERTY_STATUS.Sold, PROPERTY_STATUS.Archived],
  [PROPERTY_STATUS.Archived]: [PROPERTY_STATUS.Draft],
  [PROPERTY_STATUS.Sold]: [PROPERTY_STATUS.Archived],
};

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: PropertyStatus, to: PropertyStatus): void {
  if (!canTransition(from, to)) throw new StatusTransitionError(from, to);
}

