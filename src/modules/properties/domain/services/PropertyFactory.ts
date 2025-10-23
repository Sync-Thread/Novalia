// src/modules/properties/domain/services/PropertyFactory.ts
// Creador de propiedades draft con defaults coherentes.

import type { OperationType, PropertyType } from "../enums";
import { OPERATION_TYPE, PROPERTY_STATUS } from "../enums";
import type { Address } from "../value-objects/Address";
import type { Money } from "../value-objects/Money";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";
import { Property } from "../entities/Property";
import type { DomainClock } from "../clock";

export type CreateDraftArgs = {
  id: UniqueEntityID;
  orgId: UniqueEntityID;
  listerUserId: UniqueEntityID;
  title: string;
  operationType?: OperationType;
  propertyType: PropertyType;
  price: Money;
  address: Address;
  description?: string | null;
  clock: DomainClock;
  createdAt?: Date;
  updatedAt?: Date;
};

export function createDraft(args: CreateDraftArgs): Property {
  return new Property({
    id: args.id,
    orgId: args.orgId,
    listerUserId: args.listerUserId,
    status: PROPERTY_STATUS.Draft,
    operationType: args.operationType ?? OPERATION_TYPE.Sale,
    propertyType: args.propertyType,
    title: args.title,
    description: args.description ?? null,
    price: args.price,
    currency: args.price.currency,
    address: args.address,
    amenities: [],
    amenitiesExtra: null,
    tags: [],
    normalizedAddress: null,
    normalizedStatus: null,
    publishedAt: null,
    soldAt: null,
    deletedAt: null,
    completenessScore: 0,
    trustScore: 0,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  }, { clock: args.clock });
}
