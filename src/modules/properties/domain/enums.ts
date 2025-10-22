// src/modules/properties/domain/enums.ts
// Const objects + literal unions aligned with DB schema and UI needs.

export type UUID = string;

export const PROPERTY_STATUS = {
  Draft: "draft",
  Published: "published",
  Archived: "archived",
  Sold: "sold",
} as const;
export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS];
export const PROPERTY_STATUS_VALUES = Object.values(PROPERTY_STATUS) as PropertyStatus[];

export const OPERATION_TYPE = {
  Sale: "sale",
  Rent: "rent",
} as const;
export type OperationType = typeof OPERATION_TYPE[keyof typeof OPERATION_TYPE];
export const OPERATION_TYPE_VALUES = Object.values(OPERATION_TYPE) as OperationType[];

export const PROPERTY_TYPE = {
  House: "house",
  Apartment: "apartment",
  Land: "land",
  Office: "office",
  Commercial: "commercial",
  Industrial: "industrial",
  Other: "other",
} as const;
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];
export const PROPERTY_TYPE_VALUES = Object.values(PROPERTY_TYPE) as PropertyType[];

export const CURRENCY = {
  MXN: "MXN",
  USD: "USD",
} as const;
export type Currency = typeof CURRENCY[keyof typeof CURRENCY];
export const CURRENCY_VALUES = Object.values(CURRENCY) as Currency[];

export const MEDIA_TYPE = {
  Image: "image",
  Video: "video",
  Document: "document",
} as const;
export type MediaType = typeof MEDIA_TYPE[keyof typeof MEDIA_TYPE];
export const MEDIA_TYPE_VALUES = Object.values(MEDIA_TYPE) as MediaType[];
export const MEDIA_TYPE_ALIASES: Record<string, MediaType> = {
  document: MEDIA_TYPE.Document,
  floorplan: MEDIA_TYPE.Document,
};

export const CONDITION = {
  New: "new",
  Excellent: "excellent",
  Good: "good",
  NeedsRenovation: "needs_renovation",
  Unknown: "unknown",
} as const;
export type Condition = typeof CONDITION[keyof typeof CONDITION];
export const CONDITION_VALUES = Object.values(CONDITION) as Condition[];

export const ORIENTATION = {
  North: "north",
  NorthEast: "northeast",
  East: "east",
  SouthEast: "southeast",
  South: "south",
  SouthWest: "southwest",
  West: "west",
  NorthWest: "northwest",
} as const;
export type Orientation = typeof ORIENTATION[keyof typeof ORIENTATION];
export const ORIENTATION_VALUES = Object.values(ORIENTATION) as Orientation[];

export const DOCUMENT_TYPE = {
  Deed: "deed",
  NoPredialDebt: "no_predial_debt",
  Ine: "ine",
  RppCertificate: "rpp_certificate",
  Plan: "plan",
  Other: "other",
} as const;
export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];
export const DOCUMENT_TYPE_VALUES = Object.values(DOCUMENT_TYPE) as DocumentType[];
export const DOCUMENT_TYPE_ALIASES: Record<string, DocumentType> = {
  floorplan: DOCUMENT_TYPE.Plan,
  plan: DOCUMENT_TYPE.Plan,
  id_doc: DOCUMENT_TYPE.Ine,
  ine: DOCUMENT_TYPE.Ine,
};

export const VERIFICATION_STATUS = {
  Pending: "pending",
  Verified: "verified",
  Rejected: "rejected",
} as const;
export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];
export const VERIFICATION_STATUS_VALUES = Object.values(VERIFICATION_STATUS) as VerificationStatus[];

export const NORMALIZED_STATUS = {
  Pending: "pending",
  Ok: "ok",
  Error: "error",
} as const;
export type NormalizedStatus = typeof NORMALIZED_STATUS[keyof typeof NORMALIZED_STATUS];
export const NORMALIZED_STATUS_VALUES = Object.values(NORMALIZED_STATUS) as NormalizedStatus[];
