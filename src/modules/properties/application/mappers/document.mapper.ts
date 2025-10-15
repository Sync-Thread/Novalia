import { Document } from "../../domain/entities/Document";
import { DOCUMENT_TYPE, VERIFICATION_STATUS } from "../../domain/enums";
import type { DomainClock } from "../../domain/clock";
import { UniqueEntityID } from "../../domain/value-objects/UniqueEntityID";
import type { DocumentDTO } from "../dto/DocumentDTO";

function mapToDomainType(type: DocumentDTO["docType"]): (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE] {
  switch (type) {
    case "rpp_certificate":
      return DOCUMENT_TYPE.RppCertificate;
    case "deed":
      return DOCUMENT_TYPE.Deed;
    case "id_doc":
      return DOCUMENT_TYPE.Ine;
    case "floorplan":
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
    case DOCUMENT_TYPE.Ine:
      return "id_doc";
    case DOCUMENT_TYPE.Plan:
      return "floorplan";
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
