// src/modules/properties/domain/services/PropertyFactory.ts
// Creador de propiedades draft con defaults coherentes.

import type { PropertyType } from "../enums";
import { OPERATION_TYPE, PROPERTY_STATUS } from "../enums";
import type { Address } from "../value-objects/Address";
import type { Money } from "../value-objects/Money";
import { UniqueEntityID } from "../value-objects/UniqueEntityID";
import { Property } from "../entities/Property";

export type CreateDraftArgs = {
  id: UniqueEntityID;
  orgId: UniqueEntityID;
  listerUserId: UniqueEntityID;
  title: string;
  propertyType: PropertyType;
  price: Money;
  address: Address;
  description?: string | null;
};

export function createDraft(args: CreateDraftArgs): Property {
  return new Property({
    id: args.id,
    orgId: args.orgId,
    listerUserId: args.listerUserId,
    status: PROPERTY_STATUS.Draft,
    operationType: OPERATION_TYPE.Sale,
    propertyType: args.propertyType,
    title: args.title,
    description: args.description ?? null,
    price: args.price,
    currency: args.price.currency,
    address: args.address,
    amenities: [],
    publishedAt: null,
    soldAt: null,
    deletedAt: null,
    completenessScore: 0,
  });
}
