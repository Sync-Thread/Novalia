// src/modules/properties/domain/entities/MediaAsset.ts
// Media item with ordering and metadata.

import type { MediaType } from "../enums";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";
import type { DomainClock } from "../clock";
import { requireNonNegativeInteger } from "../utils/invariants";

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
  private readonly clock: DomainClock;

  constructor(p: MediaAssetProps, deps: { clock: DomainClock }) {
    this.id = p.id;
    this.orgId = p.orgId;
    this.propertyId = p.propertyId ?? null;
    this.type = p.type;
    this._position = requireNonNegativeInteger(p.position, "position");
    this.s3Key = p.s3Key ?? null;
    this.url = p.url ?? null;
    this.metadata = p.metadata ?? null;
    this.clock = deps.clock;
    const createdAt = p.createdAt ?? this.clock.now();
    this.createdAt = createdAt;
    this._updatedAt = p.updatedAt ?? createdAt;
  }

  get position() { return this._position; }
  get updatedAt() { return this._updatedAt; }

  moveTo(pos: number) {
    this._position = requireNonNegativeInteger(pos, "position");
    this.touch();
  }

  private touch() { this._updatedAt = this.clock.now(); }
}

