import { Property } from "../../domain/entities/Property";
import { PROPERTY_STATUS } from "../../domain/enums";
import type { DomainClock } from "../../domain/clock";
import { Address } from "../../domain/value-objects/Address";
import { GeoPoint } from "../../domain/value-objects/GeoPoint";
import { Money } from "../../domain/value-objects/Money";
import { UniqueEntityID } from "../../domain/value-objects/UniqueEntityID";
import type { PropertyDTO } from "../dto/PropertyDTO";

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function priceToMoney(price: PropertyDTO["price"] | undefined | null): Money {
  if (!price) {
    throw new Error("Price is required to hydrate Property domain entity");
  }
  const currency = price.currency ?? "MXN";
  return new Money(price.amount, currency);
}

function ensureDateISO(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toISOString?: () => string }).toISOString === "function") {
    return (value as { toISOString: () => string }).toISOString();
  }
  return null;
}

export function toDomain(dto: PropertyDTO, deps: { clock: DomainClock }): Property {
  if (!dto.orgId) {
    throw new Error("PropertyDTO.orgId is required to build domain entity");
  }
  if (!dto.listerUserId) {
    throw new Error("PropertyDTO.listerUserId is required to build domain entity");
  }

  const address = new Address({
    addressLine: dto.address.addressLine ?? null,
    neighborhood: dto.address.neighborhood ?? null,
    city: dto.address.city,
    state: dto.address.state,
    postalCode: dto.address.postalCode ?? null,
    country: dto.address.country,
    displayAddress: dto.address.displayAddress ?? false,
  });

  const location = dto.location
    ? new GeoPoint(dto.location.lat, dto.location.lng)
    : null;

  return new Property(
    {
      id: new UniqueEntityID(dto.id),
      orgId: new UniqueEntityID(dto.orgId),
      listerUserId: new UniqueEntityID(dto.listerUserId),
      status: dto.status ?? PROPERTY_STATUS.Draft,
      operationType: dto.operationType ?? "sale",
      propertyType: dto.propertyType,
      title: dto.title,
      description: dto.description ?? null,
      price: priceToMoney(dto.price),
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
      parkingSpots: dto.parkingSpots ?? null,
      constructionM2: dto.constructionM2 ?? null,
      landM2: dto.landM2 ?? null,
      address,
      location,
      amenities: dto.amenities ?? [],
      amenitiesExtra: dto.amenitiesExtra ?? null,
      tags: dto.tags ?? [],
      internalId: dto.internalId ?? null,
      normalizedStatus: dto.normalizedStatus ?? null,
      trustScore: dto.trustScore ?? null,
      levels: dto.levels ?? null,
      yearBuilt: dto.yearBuilt ?? null,
      floor: dto.floor ?? null,
      hoaFee: dto.hoaFee ? priceToMoney(dto.hoaFee) : null,
      condition: dto.condition ?? null,
      furnished: dto.furnished ?? null,
      petFriendly: dto.petFriendly ?? null,
      orientation: dto.orientation ?? null,
      rppVerified: dto.rppVerification ?? "pending",
      publishedAt: parseDate(dto.publishedAt) ?? null,
      soldAt: parseDate(dto.soldAt) ?? null,
      deletedAt: parseDate(dto.deletedAt) ?? null,
      completenessScore: dto.completenessScore ?? 0,
      createdAt: parseDate(dto.createdAt),
      updatedAt: parseDate(dto.updatedAt),
    },
    { clock: deps.clock },
  );
}

export function fromDomain(entity: Property): PropertyDTO {
  const raw = entity.toDTO();
  return {
    id: raw.id,
    orgId: raw.orgId,
    listerUserId: raw.listerUserId,
    status: raw.status,
    publishedAt: ensureDateISO(raw.publishedAt),
    soldAt: ensureDateISO(raw.soldAt),
    title: raw.title,
    description: raw.description ?? null,
    price: { amount: raw.price.amount, currency: raw.price.currency },
    propertyType: raw.propertyType,
    operationType: raw.operationType,
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    parkingSpots: raw.parkingSpots ?? null,
    constructionM2: raw.constructionM2 ?? null,
    landM2: raw.landM2 ?? null,
    levels: raw.levels ?? null,
    yearBuilt: raw.yearBuilt ?? null,
    floor: raw.floor ?? null,
    hoaFee: raw.hoaFee ? { amount: raw.hoaFee.amount, currency: raw.hoaFee.currency } : null,
    condition: raw.condition ?? null,
    furnished: raw.furnished ?? null,
    petFriendly: raw.petFriendly ?? null,
    orientation: raw.orientation ?? null,
    amenities: raw.amenities,
    amenitiesExtra: raw.amenitiesExtra ?? null,
    address: {
      addressLine: raw.address.addressLine ?? null,
      neighborhood: raw.address.neighborhood ?? null,
      city: raw.address.city,
      state: raw.address.state,
      postalCode: raw.address.postalCode ?? null,
      country: raw.address.country,
      displayAddress: raw.address.displayAddress ?? false,
    },
    location: raw.location ? { lat: raw.location.lat, lng: raw.location.lng } : null,
    tags: raw.tags,
    internalId: raw.internalId ?? null,
    rppVerification: raw.rppVerified ?? "pending",
    completenessScore: raw.completenessScore ?? 0,
    normalizedStatus: raw.normalizedStatus ?? null,
    trustScore: raw.trustScore ?? null,
    deletedAt: ensureDateISO(raw.deletedAt),
    createdAt: ensureDateISO(raw.createdAt),
    updatedAt: ensureDateISO(raw.updatedAt),
  };
}
