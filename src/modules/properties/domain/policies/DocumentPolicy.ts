// src/modules/properties/domain/policies/DocumentPolicy.ts
// Tipos válidos y checks mínimos de documentos.

import type { DocumentType, VerificationStatus } from "../enums";
import { DOC_TYPES } from "../enums";

export const ALLOWED_DOC_TYPES: readonly DocumentType[] = DOC_TYPES;

export type DocumentLite = {
  docType: DocumentType;
  verification: VerificationStatus;
  s3Key?: string | null;
  url?: string | null;
};

export function isAllowedType(t: DocumentType): boolean {
  // Permitimos extensión futura (string & {}), pero favorecemos tipos conocidos
  return ALLOWED_DOC_TYPES.includes(t as any) || typeof t === "string";
}

export function hasValidLocator(d: DocumentLite): boolean {
  return Boolean((d.s3Key && d.s3Key.trim()) || (d.url && d.url.trim()));
}

export function rppStatusFromDocs(docs: DocumentLite[]): VerificationStatus | null {
  const rpp = docs.filter(d => d.docType === "rpp_certificate");
  if (!rpp.length) return null;
  // Prioridad: rejected > pending > verified? — negocio: si hay algún rejected, tomamos rejected.
  if (rpp.some(d => d.verification === "rejected")) return "rejected";
  if (rpp.some(d => d.verification === "pending")) return "pending";
  if (rpp.some(d => d.verification === "verified")) return "verified";
  return null;
}
