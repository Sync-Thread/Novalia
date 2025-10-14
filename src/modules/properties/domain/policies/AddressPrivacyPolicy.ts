// src/modules/properties/domain/policies/AddressPrivacyPolicy.ts
// Qué campos exponer según displayAddress.

import type { Address } from "../value-objects/Address";

export type PublicAddress = {
  city: string;
  state: string;
  country: string;
  neighborhood?: string | null;
  postalCode?: string | null;
  addressLine?: string | null;
};

export function toPublicAddress(a: Address): PublicAddress {
  if (!a.displayAddress) {
    // Privado: solo nivel ciudad/estado/país
    return { city: a.city, state: a.state, country: a.country };
  }
  // Completo: incluye calle/colonia/CP si existen
  return {
    city: a.city,
    state: a.state,
    country: a.country,
    neighborhood: a.neighborhood ?? null,
    postalCode: a.postalCode ?? null,
    addressLine: a.addressLine ?? null,
  };
}
