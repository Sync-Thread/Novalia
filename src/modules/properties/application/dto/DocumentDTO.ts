export type DocumentTypeDTO =
  | "rpp_certificate"
  | "deed"
  | "id_doc"
  | "floorplan"
  | "other";

export type VerificationStatusDTO = "pending" | "verified" | "rejected";

export interface DocumentDTO {
  id: string;
  orgId?: string | null;
  propertyId?: string;
  docType: DocumentTypeDTO;
  url?: string | null;
  s3Key?: string | null;
  verification: VerificationStatusDTO;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AttachDocumentDTO {
  docType: DocumentTypeDTO;
  url?: string | null;
  s3Key?: string | null;
  metadata?: Record<string, unknown>;
}
