import type { PropertyDTO } from "../../../../../../application/dto/PropertyDTO";

export type VerificationState = "pending" | "verified" | "rejected";

export const PROPERTY_TYPE_LABEL: Record<PropertyDTO["propertyType"], string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  office: "Oficina",
  commercial: "Comercial",
  industrial: "Industrial",
  other: "Otro",
};

export const OPERATION_LABEL: Record<PropertyDTO["operationType"], string> = {
  sale: "Venta",
  rent: "Renta",
};

export const STATUS_BADGE: Record<PropertyDTO["status"], "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  sold: "success",
  archived: "neutral",
};

export const RPP_BADGE: Record<VerificationState, { label: string; tone: "success" | "warning" | "danger" }> = {
  pending: { label: "RPP pendiente", tone: "warning" },
  verified: { label: "RPP verificado", tone: "success" },
  rejected: { label: "RPP rechazado", tone: "danger" },
};

export const CHECKLIST_LABELS = {
  kycOk: "KYC del publicador verificado",
  completenessOk: "Completitud ≥ 80%",
  rppOk: "RPP cargado",
  coreOk: "Precio, tipo y ubicación definidos",
};

export const STORAGE_KEY_COPY = "property-quickview-id";

export const focusableSelectors = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface ChecklistState {
  kycOk: boolean;
  completenessOk: boolean;
  rppOk: boolean;
  coreOk: boolean;
}

export const STEP_LINKS: Array<{ key: keyof ChecklistState; step: string }> = [
  { key: "kycOk", step: "basics" },
  { key: "completenessOk", step: "publish" },
  { key: "rppOk", step: "publish" },
  { key: "coreOk", step: "location" },
];
