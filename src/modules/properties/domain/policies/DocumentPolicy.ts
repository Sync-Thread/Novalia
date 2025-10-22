// src/modules/properties/domain/policies/DocumentPolicy.ts
// Valid document types and minimal checks (keeps UI <-> DB aliases in sync).

import type { DocumentType, VerificationStatus } from "../enums";
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_ALIASES,
  DOCUMENT_TYPE_VALUES,
} from "../enums";

export const ALLOWED_DOC_TYPES: readonly DocumentType[] = DOCUMENT_TYPE_VALUES;

export type DocumentLite = {
  docType: DocumentType;
  verification: VerificationStatus;
  s3Key?: string | null;
  url?: string | null;
};

export type DocumentTypeInput = DocumentType | string;

export function normalizeDocumentType(input: DocumentTypeInput): DocumentType | null {
  const raw = (typeof input === "string" ? input : input).toLowerCase();
  if (ALLOWED_DOC_TYPES.includes(raw as DocumentType)) {
    return raw as DocumentType;
  }
  return DOCUMENT_TYPE_ALIASES[raw] ?? null;
}

export function isAllowedType(input: DocumentTypeInput): boolean {
  return normalizeDocumentType(input) !== null;
}

export function hasValidLocator(d: DocumentLite): boolean {
  return Boolean((d.s3Key && d.s3Key.trim()) || (d.url && d.url.trim()));
}

export function rppStatusFromDocs(docs: DocumentLite[]): VerificationStatus | null {
  const rpp = docs.filter(d => normalizeDocumentType(d.docType) === DOCUMENT_TYPE.RppCertificate);
  if (!rpp.length) return null;
  if (rpp.some(d => d.verification === "rejected")) return "rejected";
  if (rpp.some(d => d.verification === "pending")) return "pending";
  if (rpp.some(d => d.verification === "verified")) return "verified";
  return null;
}
