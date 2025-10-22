import type {
  AttachDocumentDTO,
  DocumentDTO,
  VerificationStatusDTO,
} from "../../application/dto/DocumentDTO";
import type {
  DocumentInsertPayload,
  DocumentRow,
} from "../types/supabase-rows";

const DTO_TO_DB_DOC_TYPE: Record<AttachDocumentDTO["docType"], string> = {
  rpp_certificate: "rpp_certificate",
  deed: "deed",
  id_doc: "ine",
  floorplan: "plan",
  other: "other",
};

const DB_TO_DTO_DOC_TYPE: Record<string, DocumentDTO["docType"]> = {
  rpp_certificate: "rpp_certificate",
  deed: "deed",
  ine: "id_doc",
  plan: "floorplan",
  floorplan: "floorplan",
  other: "other",
};

const DB_TO_DTO_VERIFICATION: Record<string, VerificationStatusDTO> = {
  pending: "pending",
  verified: "verified",
  rejected: "rejected",
};

const DTO_TO_DB_VERIFICATION: Record<VerificationStatusDTO, string> = {
  pending: "pending",
  verified: "verified",
  rejected: "rejected",
};

export function mapDocumentRowToDTO(row: DocumentRow): DocumentDTO {
  if (!row.created_at) {
    throw new Error("Document row missing created_at");
  }
  return {
    id: row.id,
    orgId: row.org_id,
    propertyId: row.related_id,
    docType: DB_TO_DTO_DOC_TYPE[row.doc_type] ?? "other",
    url: row.url,
    s3Key: row.s3_key,
    verification: DB_TO_DTO_VERIFICATION[row.verification] ?? "pending",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

export function mapAttachDocumentToInsertPayload(params: {
  id: string;
  orgId: string | null;
  propertyId: string;
  input: AttachDocumentDTO;
}): DocumentInsertPayload {
  const { id, orgId, propertyId, input } = params;
  return {
    id,
    org_id: orgId,
    related_type: "property",
    related_id: propertyId,
    doc_type: DTO_TO_DB_DOC_TYPE[input.docType] ?? "other",
    verification: DTO_TO_DB_VERIFICATION["pending"],
    source: null,
    hash_sha256: null,
    s3_key: input.s3Key ?? null,
    url: input.url ?? null,
    metadata: (input.metadata ?? null) as DocumentInsertPayload["metadata"],
  };
}

export function mapVerificationToDb(status: VerificationStatusDTO): string {
  return DTO_TO_DB_VERIFICATION[status];
}
