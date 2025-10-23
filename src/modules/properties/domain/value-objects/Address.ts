// src/modules/properties/domain/value-objects/Address.ts
// Address value object with privacy flag (displayAddress defaults to false).

import { requireNonEmpty } from "../utils/invariants";

export type AddressProps = {
  addressLine?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country: string;
  displayAddress?: boolean;
};

export class Address {
  readonly addressLine?: string | null;
  readonly neighborhood?: string | null;
  readonly city: string;
  readonly state: string;
  readonly postalCode?: string | null;
  readonly country: string;
  readonly displayAddress: boolean;

  constructor(props: AddressProps) {
    this.city = requireNonEmpty(props.city, "city");
    this.state = requireNonEmpty(props.state, "state");
    this.country = requireNonEmpty(props.country, "country");

    this.addressLine = props.addressLine?.trim() || null;
    this.neighborhood = props.neighborhood?.trim() || null;
    this.postalCode = props.postalCode?.trim() || null;
    this.displayAddress = props.displayAddress ?? false;
  }
}

