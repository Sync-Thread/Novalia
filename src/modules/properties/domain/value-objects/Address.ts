// src/modules/properties/domain/value-objects/Address.ts
// V.O: Dirección con control de privacidad (displayAddress=false por defecto)
export type AddressProps = {
  addressLine?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country: string;
  displayAddress?: boolean; // false = no mostrar completa
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
    if (!props.city?.trim()) throw new Error("City required");
    if (!props.state?.trim()) throw new Error("State required");
    if (!props.country?.trim()) throw new Error("Country required");

    this.addressLine   = props.addressLine ?? null;
    this.neighborhood  = props.neighborhood ?? null;
    this.city          = props.city.trim();
    this.state         = props.state.trim();
    this.postalCode    = props.postalCode ?? null;
    this.country       = props.country.trim();
    this.displayAddress = props.displayAddress ?? false;
  }
}
