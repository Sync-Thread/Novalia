// src/modules/properties/domain/entities/Document.ts
// Documento polimórfico (RPP, etc.) con org, hash y metadatos.

import type { DocumentType, VerificationStatus } from "../enums";
import { VERIFICATION_STATUS } from "../enums";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";

export type DocumentProps = {
  id: UniqueEntityID;
  orgId: UniqueEntityID | null;
  relatedType: "property";
  relatedId: UniqueEntityID;
  docType: DocumentType;
  verification: VerificationStatus;
  source?: string | null;
  s3Key?: string | null;
  url?: string | null;
  hashSha256?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Document {
  readonly id: UniqueEntityID;
  readonly orgId: UniqueEntityID | null;
  readonly relatedType = "property" as const;
  readonly relatedId: UniqueEntityID;

  private _docType: DocumentType;
  private _verification: VerificationStatus;
  readonly source?: string | null;
  readonly s3Key?: string | null;
  readonly url?: string | null;
  readonly hashSha256?: string | null;
  readonly metadata?: Record<string, unknown> | null;

  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(p: DocumentProps) {
    this.id = p.id; this.orgId = p.orgId ?? null; this.relatedId = p.relatedId;
    this._docType = p.docType; this._verification = p.verification;
    this.source = p.source ?? null; this.s3Key = p.s3Key ?? null; this.url = p.url ?? null;
    this.hashSha256 = p.hashSha256 ?? null; this.metadata = p.metadata ?? null;
    this.createdAt = p.createdAt ?? new Date(); this._updatedAt = p.updatedAt ?? this.createdAt;
  }

  get docType() { return this._docType; }
  get verification() { return this._verification; }
  get updatedAt() { return this._updatedAt; }

  setDocType(t: DocumentType) { this._docType = t; this.touch(); }
  verify() { this._verification = VERIFICATION_STATUS.Verified; this.touch(); }
  reject() { this._verification = VERIFICATION_STATUS.Rejected; this.touch(); }
  pend() { this._verification = VERIFICATION_STATUS.Pending; this.touch(); }

  private touch() { this._updatedAt = new Date(); }
}
