import { Document } from "../../domain/entities/Document";
import { DOCUMENT_TYPE, VERIFICATION_STATUS } from "../../domain/enums";
import type { DomainClock } from "../../domain/clock";
import { UniqueEntityID } from "../../domain/value-objects/UniqueEntityID";
import type { AttachDocumentDTO, DocumentDTO, VerificationStatusDTO } from "../dto/DocumentDTO";
import type {
  DocumentInsertPayload,
  DocumentRow,
} from "../../infrastructure/types/supabase-rows";

// ============================================================================
// Domain <-> DTO Mapping
// ============================================================================

function mapToDomainType(type: DocumentDTO["docType"]): (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE] {
  switch (type) {
    case "rpp_certificate":
      return DOCUMENT_TYPE.RppCertificate;
    case "deed":
      return DOCUMENT_TYPE.Deed;
    case "plan":
      return DOCUMENT_TYPE.Plan;
    default:
      return DOCUMENT_TYPE.Other;
  }
}

function mapToDtoType(type: (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE]): DocumentDTO["docType"] {
  switch (type) {
    case DOCUMENT_TYPE.RppCertificate:
      return "rpp_certificate";
    case DOCUMENT_TYPE.Deed:
      return "deed";
    case DOCUMENT_TYPE.Plan:
      return "plan";
    case DOCUMENT_TYPE.Ine:
      return "other"; // INE no se usa en este contexto, mapear a "other"
    default:
      return "other";
  }
}

function mapToDomainVerification(
  status: DocumentDTO["verification"] | undefined,
): (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS] {
  switch (status) {
    case "verified":
      return VERIFICATION_STATUS.Verified;
    case "rejected":
      return VERIFICATION_STATUS.Rejected;
    default:
      return VERIFICATION_STATUS.Pending;
  }
}

export function toDomain(
  dto: DocumentDTO,
  deps: { clock: DomainClock; propertyId: string; orgId?: string | null },
): Document {
  return new Document(
    {
      id: new UniqueEntityID(dto.id),
      orgId: deps.orgId ? new UniqueEntityID(deps.orgId) : null,
      relatedType: "property",
      relatedId: new UniqueEntityID(deps.propertyId),
      docType: mapToDomainType(dto.docType),
      verification: mapToDomainVerification(dto.verification),
      s3Key: dto.s3Key ?? null,
      url: dto.url ?? null,
      metadata: dto.metadata ?? null,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
    },
    { clock: deps.clock },
  );
}

export function fromDomain(document: Document): DocumentDTO {
  return {
    id: document.id.toString(),
    orgId: document.orgId?.toString() ?? null,
    propertyId: document.relatedId.toString(),
    docType: mapToDtoType(document.docType),
    url: document.url ?? null,
    s3Key: document.s3Key ?? null,
    verification: document.verification,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    metadata: document.metadata ?? null,
  };
}

// ============================================================================
// Infrastructure DB Row <-> DTO Mapping
// ============================================================================

const DTO_TO_DB_DOC_TYPE: Record<AttachDocumentDTO["docType"], string> = {
  rpp_certificate: "rpp_certificate",
  deed: "deed",
  plan: "plan",  // Cambio: mantener "plan" en BD también
  other: "other",
};

const DB_TO_DTO_DOC_TYPE: Record<string, DocumentDTO["docType"]> = {
  rpp_certificate: "rpp_certificate",
  deed: "deed",
  ine: "other",           // INE no se usa, mapear a "other"
  plan: "plan",           // Cambio: BD "plan" -> DTO "plan"
  floorplan: "plan",      // Cambio: BD "floorplan" (legacy) -> DTO "plan"
  no_predial_debt: "other", // No se usa, mapear a "other"
  other: "other",
};

/**
 * Helper para convertir doc_type de BD a DocumentTypeDTO
 * Maneja tipos legacy como "floorplan" convirtiéndolos a "plan"
 */
export function mapDbDocTypeToDto(dbType: string): DocumentDTO["docType"] {
  return DB_TO_DTO_DOC_TYPE[dbType] ?? "other";
}

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

