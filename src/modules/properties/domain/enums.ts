// src/modules/properties/domain/enums.ts
// Erasable-friendly: const objects + literal unions; exporta valores y tipos.

export type UUID = string;

export const PROPERTY_STATUS = { Draft: "draft", Published: "published", Sold: "sold" } as const;
export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS];

export const OPERATION_TYPE = { Sale: "sale" } as const;
export type OperationType = typeof OPERATION_TYPE[keyof typeof OPERATION_TYPE];

export const PROPERTY_TYPE = {
  House: "house", Apartment: "apartment", Land: "land", Townhouse: "townhouse",
  Office: "office", Commercial: "commercial", Industrial: "industrial", Other: "other",
} as const;
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];

export const CURRENCY = { MXN: "MXN", USD: "USD" } as const;
export type Currency = typeof CURRENCY[keyof typeof CURRENCY];

export const MEDIA_TYPE = { Image: "image", Video: "video", Floorplan: "floorplan" } as const;
export type MediaType = typeof MEDIA_TYPE[keyof typeof MEDIA_TYPE];

export const CONDITION = {
  New: "new", Excellent: "excellent", Good: "good", NeedsRenovation: "needs_renovation", Unknown: "unknown",
} as const;
export type Condition = typeof CONDITION[keyof typeof CONDITION];

export const ORIENTATION = {
  North: "north", NorthEast: "northeast", East: "east", SouthEast: "southeast",
  South: "south", SouthWest: "southwest", West: "west", NorthWest: "northwest",
} as const;
export type Orientation = typeof ORIENTATION[keyof typeof ORIENTATION];

export const DOC_TYPES = [
  "rpp_certificate", "deed", "proof_of_address", "tax_receipt", "id_doc", "floorplan", "other",
] as const;
export type DocumentType = typeof DOC_TYPES[number] | (string & {});

export const VERIFICATION_STATUS = { Pending: "pending", Verified: "verified", Rejected: "rejected" } as const;
export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];
