// src/modules/properties/domain/entities/MediaAsset.ts
// Media con org, orden y metadatos.

import type { MediaType } from "../enums";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";

export type MediaAssetProps = {
  id: UniqueEntityID;
  orgId: UniqueEntityID;
  propertyId: UniqueEntityID | null;
  type: MediaType;
  position: number; // 0-based
  s3Key?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export class MediaAsset {
  readonly id: UniqueEntityID;
  readonly orgId: UniqueEntityID;
  readonly propertyId: UniqueEntityID | null;

  readonly type: MediaType;
  private _position: number;
  readonly s3Key?: string | null;
  readonly url?: string | null;
  readonly metadata?: Record<string, unknown> | null;

  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(p: MediaAssetProps) {
    if (p.position < 0 || !Number.isInteger(p.position)) throw new Error("Invalid position");
    this.id = p.id; this.orgId = p.orgId; this.propertyId = p.propertyId ?? null;
    this.type = p.type; this._position = p.position;
    this.s3Key = p.s3Key ?? null; this.url = p.url ?? null; this.metadata = p.metadata ?? null;
    this.createdAt = p.createdAt ?? new Date(); this._updatedAt = p.updatedAt ?? this.createdAt;
  }

  get position() { return this._position; }
  get updatedAt() { return this._updatedAt; }

  moveTo(pos: number) {
    if (pos < 0 || !Number.isInteger(pos)) throw new Error("Invalid position");
    this._position = pos; this.touch();
  }

  private touch() { this._updatedAt = new Date(); }
}
