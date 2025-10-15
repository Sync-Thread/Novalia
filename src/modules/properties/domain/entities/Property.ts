// src/modules/properties/domain/entities/Property.ts
// Entidad raíz usando Policies (publish/score/transiciones) + errores tipados.

import type {
  Condition,
  Currency,
  NormalizedStatus,
  OperationType,
  Orientation,
  PropertyStatus,
  PropertyType,
  VerificationStatus,
} from "../enums";
import {
  NORMALIZED_STATUS,
  NORMALIZED_STATUS_VALUES,
  OPERATION_TYPE_VALUES,
  PROPERTY_STATUS,
  VERIFICATION_STATUS,
} from "../enums";
import { Address } from "../value-objects/Address";
import { GeoPoint } from "../value-objects/GeoPoint";
import { Money } from "../value-objects/Money";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";
import type { DomainClock } from "../clock";

import { computeScore } from "../policies/CompletenessPolicy";
import { assertPublishable } from "../policies/PublishPolicy";
import { assertTransition } from "../policies/StatusTransitionPolicy";

import { InvariantViolationError } from "../errors/InvariantViolationError";

export type NormalizedAddress = {
  status: NormalizedStatus;
  [key: string]: unknown;
};

type NormalizedAddressInput = (Partial<NormalizedAddress> & { status?: NormalizedStatus | string | null }) | null | undefined;

const NORMALIZED_STATUS_SET = new Set<NormalizedStatus>(NORMALIZED_STATUS_VALUES);

function resolveNormalizedStatus(status: string | null | undefined): NormalizedStatus {
  if (status && NORMALIZED_STATUS_SET.has(status as NormalizedStatus)) {
    return status as NormalizedStatus;
  }
  return NORMALIZED_STATUS.Pending;
}

function sanitizeNormalizedAddress(input: NormalizedAddressInput, fallbackStatus?: string | null): NormalizedAddress | null {
  if (!input && !fallbackStatus) return null;
  const base: Record<string, unknown> = input ? { ...input } : {};
  const statusCandidate = (input?.status ?? fallbackStatus ?? null) as string | null;
  const status = resolveNormalizedStatus(statusCandidate);
  if ("status" in base) {
    delete (base as { status?: unknown }).status;
  }
  return { status, ...base } as NormalizedAddress;
}

export type PropertyProps = {
  // Identidad / dueño
  id: UniqueEntityID;
  orgId: UniqueEntityID;
  listerUserId: UniqueEntityID;

  // Estado y tipo
  status: PropertyStatus;
  operationType: OperationType;      // 'sale'
  propertyType: PropertyType;

  // Datos principales
  title: string;
  description?: string | null;
  price: Money;
  currency?: Currency;

  // Features
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpots?: number | null;
  constructionM2?: number | null;
  landM2?: number | null;

  // Ubicación
  address: Address;
  location?: GeoPoint | null;

  // Otros
  amenities?: string[] | null;
  amenitiesExtra?: string | null;
  internalId?: string | null;
  tags?: string[] | null;
  normalizedAddress?: NormalizedAddressInput;
  normalizedStatus?: NormalizedStatus | string | null;
  trustScore?: number | null;

  // Extras
  levels?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  hoaFee?: Money | null;
  condition?: Condition | null;
  furnished?: boolean | null;
  petFriendly?: boolean | null;
  orientation?: Orientation | null;

  // Estados relacionados
  rppVerified?: VerificationStatus | null;
  publishedAt?: Date | null;
  soldAt?: Date | null;
  deletedAt?: Date | null;

  // Métrica
  completenessScore?: number | null;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublishOptions = {
  now?: Date;
  kycVerified: boolean;
  requireScoreGte?: number;     // default policy
  blockIfRppRejected?: boolean; // default true
};

export type CompletenessInputs = {
  mediaCount: number;
  hasRppDoc?: boolean;
};

export class Property {
  // Identidad
  readonly id: UniqueEntityID;
  readonly orgId: UniqueEntityID;
  readonly listerUserId: UniqueEntityID;

  // Estado
  private _status: PropertyStatus;
  readonly operationType: OperationType;
  private _publishedAt?: Date | null;
  private _soldAt?: Date | null;
  private _deletedAt?: Date | null;
  private _rppVerified: VerificationStatus;

  // Datos principales
  private _propertyType: PropertyType;
  private _title: string;
  private _description?: string | null;
  private _price: Money;
  private _currency: Currency;

  // Features
  private _bedrooms?: number | null;
  private _bathrooms?: number | null;
  private _parkingSpots?: number | null;
  private _constructionM2?: number | null;
  private _landM2?: number | null;

  // Ubicación y otros
  readonly address: Address;
  readonly location?: GeoPoint | null;
  readonly amenities: string[];
  readonly amenitiesExtra?: string | null;
  readonly tags: string[];
  readonly internalId?: string | null;
  readonly normalizedAddress?: NormalizedAddress | null;

  // Extras
  readonly levels?: number | null;
  readonly yearBuilt?: number | null;
  readonly floor?: number | null;
  readonly hoaFee?: Money | null;
  readonly condition?: Condition | null;
  readonly furnished?: boolean | null;
  readonly petFriendly?: boolean | null;
  readonly orientation?: Orientation | null;

  // Métrica y timestamps
  private _completenessScore: number;
  private _trustScore: number;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private readonly clock: DomainClock;

  constructor(p: PropertyProps, deps: { clock: DomainClock }) {
    if (!p.title?.trim()) throw new InvariantViolationError("Title required");
    if (!OPERATION_TYPE_VALUES.includes(p.operationType)) {
      throw new InvariantViolationError("Unsupported operation type");
    }
    if (p.status === PROPERTY_STATUS.Published && !p.publishedAt) {
      throw new InvariantViolationError("publishedAt required when status=published");
    }
    if (p.status === PROPERTY_STATUS.Sold && !p.soldAt) {
      throw new InvariantViolationError("soldAt required when status=sold");
    }

    this.clock = deps.clock;

    // Identidad
    this.id = p.id; this.orgId = p.orgId; this.listerUserId = p.listerUserId;

    // Estado
    this._status = p.status; this.operationType = p.operationType;
    this._publishedAt = p.publishedAt ?? null; this._soldAt = p.soldAt ?? null; this._deletedAt = p.deletedAt ?? null;
    this._rppVerified = p.rppVerified ?? VERIFICATION_STATUS.Pending;

    // Datos principales
    this._propertyType = p.propertyType;
    this._title = p.title.trim(); this._description = p.description ?? null;
    this._price = p.price; this._currency = p.currency ?? p.price.currency;

    // Features
    this._bedrooms = p.bedrooms ?? null; this._bathrooms = p.bathrooms ?? null; this._parkingSpots = p.parkingSpots ?? null;
    this._constructionM2 = p.constructionM2 ?? null; this._landM2 = p.landM2 ?? null;

    // Ubicación / otros
    this.address = p.address;
    this.location = p.location ?? null;
    this.amenities = p.amenities?.slice() ?? [];
    this.amenitiesExtra = p.amenitiesExtra?.trim() || null;
    this.tags = p.tags?.slice() ?? [];
    this.internalId = p.internalId ?? null;
    this.normalizedAddress = sanitizeNormalizedAddress(p.normalizedAddress, p.normalizedStatus);

    // Extras
    this.levels = p.levels ?? null; this.yearBuilt = p.yearBuilt ?? null; this.floor = p.floor ?? null;
    this.hoaFee = p.hoaFee ?? null; this.condition = p.condition ?? null;
    this.furnished = p.furnished ?? null; this.petFriendly = p.petFriendly ?? null; this.orientation = p.orientation ?? null;

    // Métrica / timestamps
    this._completenessScore = p.completenessScore ?? 0;
    this._trustScore = p.trustScore ?? 0;
    const createdAt = p.createdAt ?? this.clock.now();
    this.createdAt = createdAt;
    this._updatedAt = p.updatedAt ?? createdAt;

    this.assertInvariants();
  }

  // Getters esenciales
  get status() { return this._status; }
  get publishedAt() { return this._publishedAt ?? null; }
  get soldAt() { return this._soldAt ?? null; }
  get deletedAt() { return this._deletedAt ?? null; }
  get rppVerified() { return this._rppVerified; }
  get title() { return this._title; }
  get description() { return this._description ?? null; }
  get propertyType() { return this._propertyType; }
  get price() { return this._price; }
  get currency() { return this._currency; }
  get completenessScore() { return this._completenessScore; }
  get updatedAt() { return this._updatedAt; }
  get trustScore() { return this._trustScore; }
  get normalizedStatus(): NormalizedStatus | null { return this.normalizedAddress?.status ?? null; }

  // Mutaciones controladas
  rename(newTitle: string) { if (!newTitle.trim()) throw new InvariantViolationError("Title required"); this._title = newTitle.trim(); this.touch(); }
  retype(newType: PropertyType) { this._propertyType = newType; this.touch(); }
  reprice(money: Money) { this._price = money; this._currency = money.currency; this.touch(); }
  describe(text: string | null) { this._description = text?.trim() || null; this.touch(); }

  setFeatures(partial: {
    bedrooms?: number | null; bathrooms?: number | null; parkingSpots?: number | null;
    constructionM2?: number | null; landM2?: number | null;
  }) {
    const ok = (v: unknown) => v === null || v === undefined || (Number.isFinite(v as number) && (v as number) >= 0);
    if (!ok(partial.bedrooms) || !ok(partial.bathrooms) || !ok(partial.parkingSpots)) {
      throw new InvariantViolationError("Invalid feature int");
    }
    if (!ok(partial.constructionM2) || !ok(partial.landM2)) {
      throw new InvariantViolationError("Invalid area");
    }
    this._bedrooms = partial.bedrooms ?? this._bedrooms;
    this._bathrooms = partial.bathrooms ?? this._bathrooms;
    this._parkingSpots = partial.parkingSpots ?? this._parkingSpots;
    this._constructionM2 = partial.constructionM2 ?? this._constructionM2;
    this._landM2 = partial.landM2 ?? this._landM2;
    this.touch();
  }

  setRppStatus(v: VerificationStatus) { this._rppVerified = v; this.touch(); }

  schedulePublication(at: Date) {
    if (!at || Number.isNaN(+at)) throw new InvariantViolationError("Invalid publication date");
    this._publishedAt = at; this.touch();
  }

  // Publicar usando Policy (KYC/score/RPP) + transición validada.
  publish(opts: PublishOptions) {
    const now = opts.now ?? this.clock.now();
    assertPublishable({
      kycVerified: opts.kycVerified,
      score: this._completenessScore,
      rppStatus: this._rppVerified,
      minScore: opts.requireScoreGte,
      blockIfRppRejected: opts.blockIfRppRejected,
    });
    if (this._status !== PROPERTY_STATUS.Published) {
      assertTransition(this._status, PROPERTY_STATUS.Published);
    }
    this._publishedAt = this._publishedAt ?? now;
    this._status = PROPERTY_STATUS.Published;
    this.assertInvariants(); this.touch();
  }

  // Pausar: published → draft (valida transición).
  pause() {
    if (this._status === PROPERTY_STATUS.Published) {
      assertTransition(this._status, PROPERTY_STATUS.Draft);
      this._status = PROPERTY_STATUS.Draft;
      this.assertInvariants(); this.touch();
    }
  }

  // Vendida: published → sold (valida transición y fecha obligatoria).
  markSold(at: Date) {
    if (!at || Number.isNaN(+at)) throw new InvariantViolationError("Invalid soldAt");
    assertTransition(this._status, PROPERTY_STATUS.Sold);
    this._soldAt = at;
    this._status = PROPERTY_STATUS.Sold;
    this.assertInvariants(); this.touch();
  }

  // Soft delete / restore
  softDelete(at?: Date) {
    this._deletedAt = at ?? this.clock.now();
    this.touch();
  }
  restore() { this._deletedAt = null; this.touch(); }

  // Duplicación segura (draft, limpia fechas/ids volátiles)
  duplicate(newId: UniqueEntityID, listerUserId?: UniqueEntityID, orgId?: UniqueEntityID): Property {
    const now = this.clock.now();
    return new Property({
      id: newId, orgId: orgId ?? this.orgId, listerUserId: listerUserId ?? this.listerUserId,
      status: PROPERTY_STATUS.Draft, operationType: this.operationType, propertyType: this._propertyType,
      title: `${this._title} (copy)`, description: this._description,
      price: this._price, currency: this._currency,
      bedrooms: this._bedrooms, bathrooms: this._bathrooms, parkingSpots: this._parkingSpots,
      constructionM2: this._constructionM2, landM2: this._landM2,
      address: this.address, location: this.location ?? null,
      amenities: [...this.amenities],
      amenitiesExtra: this.amenitiesExtra ?? null,
      tags: [...this.tags],
      internalId: null,
      normalizedAddress: null,
      normalizedStatus: null,
      levels: this.levels ?? null, yearBuilt: this.yearBuilt ?? null, floor: this.floor ?? null,
      hoaFee: this.hoaFee ?? null, condition: this.condition ?? null,
      furnished: this.furnished ?? null, petFriendly: this.petFriendly ?? null, orientation: this.orientation ?? null,
      rppVerified: this._rppVerified, publishedAt: null, soldAt: null, deletedAt: null,
      completenessScore: this._completenessScore,
      trustScore: this._trustScore,
      createdAt: now,
      updatedAt: now,
    }, { clock: this.clock });
  }

  // Score: delega en CompletenessPolicy (sin números mágicos).
  computeCompleteness(inputs: CompletenessInputs): number {
    const featuresFilledCount = [
      this._bedrooms, this._bathrooms, this._parkingSpots, this._constructionM2, this._landM2,
    ].filter(v => v !== null && v !== undefined).length;

    const score = computeScore({
      hasTitle: Boolean(this._title),
      descriptionLength: this._description?.length ?? 0,
      priceAmount: this._price.amount,
      addressFilled: Boolean(this.address.city && this.address.state && this.address.country),
      featuresFilledCount,
      mediaCount: inputs.mediaCount,
      hasRppDoc: inputs.hasRppDoc,
    });

    this._completenessScore = score;
    this.touch();
    return score;
  }

  // DTO plano
  toDTO() {
    return {
      id: this.id.toString(),
      orgId: this.orgId.toString(),
      listerUserId: this.listerUserId.toString(),
      status: this._status,
      operationType: this.operationType,
      propertyType: this._propertyType,
      title: this._title,
      description: this._description ?? null,
      price: { amount: this._price.amount, currency: this._currency },
      bedrooms: this._bedrooms,
      bathrooms: this._bathrooms,
      parkingSpots: this._parkingSpots,
      constructionM2: this._constructionM2,
      landM2: this._landM2,
      address: {
        addressLine: this.address.addressLine ?? null,
        neighborhood: this.address.neighborhood ?? null,
        city: this.address.city,
        state: this.address.state,
        postalCode: this.address.postalCode ?? null,
        country: this.address.country,
        displayAddress: this.address.displayAddress,
      },
      location: this.location ? { lat: this.location.lat, lng: this.location.lng } : null,
      amenities: [...this.amenities],
      amenitiesExtra: this.amenitiesExtra ?? null,
      tags: [...this.tags],
      internalId: this.internalId ?? null,
      normalizedAddress: this.normalizedAddress ? { ...this.normalizedAddress } : null,
      normalizedStatus: this.normalizedAddress?.status ?? null,
      levels: this.levels ?? null,
      yearBuilt: this.yearBuilt ?? null,
      floor: this.floor ?? null,
      hoaFee: this.hoaFee ? { amount: this.hoaFee.amount, currency: this.hoaFee.currency } : null,
      condition: this.condition ?? null,
      furnished: this.furnished ?? null,
      petFriendly: this.petFriendly ?? null,
      orientation: this.orientation ?? null,
      rppVerified: this._rppVerified,
      publishedAt: this._publishedAt ?? null,
      soldAt: this._soldAt ?? null,
      deletedAt: this._deletedAt ?? null,
      completenessScore: this._completenessScore,
      trustScore: this._trustScore,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  private touch() { this._updatedAt = this.clock.now(); }
  private assertInvariants() {
    if (this._status === PROPERTY_STATUS.Published && !this._publishedAt) {
      throw new InvariantViolationError("published requires publishedAt");
    }
    if (this._status === PROPERTY_STATUS.Sold && !this._soldAt) {
      throw new InvariantViolationError("sold requires soldAt");
    }
  }
}
