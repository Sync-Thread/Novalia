// src/modules/properties/infrastructure/mappers/property.mappers.ts
import type {
  CreatePropertyDTO,
  PropertyDTO,
  UpdatePropertyDTO,
} from "../../application/dto/PropertyDTO";
import type {
  Json,
  PropertyInsertPayload,
  PropertyRow,
  PropertyUpdatePayload,
} from "../types/supabase-rows";

type NormalizedJson = Record<string, Json>;

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureIso(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

function readLocation(point: Json | null | undefined): PropertyDTO["location"] {
  if (!point) return null;
  
  // Si es un objeto JSONB directo con lat/lng
  if (typeof point === "object" && !Array.isArray(point)) {
    const obj = point as any;
    if (typeof obj.lat === "number" && typeof obj.lng === "number") {
      return { lat: obj.lat, lng: obj.lng };
    }
    
    // Soporte para GeoJSON (por si acaso)
    if (obj.type === "Point" && Array.isArray(obj.coordinates)) {
      const [lng, lat] = obj.coordinates;
      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }
    }
  }
  
  // Soporte legacy para formato WKT string (por si acaso)
  if (typeof point === "string") {
    const match = point.match(/POINT\\(([-\\d\\.]+) ([-\\d\\.]+)\\)$/);
    if (!match) return null;
    const [, lng, lat] = match;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
    return { lat: latNum, lng: lngNum };
  }
  
  return null;
}

function toJsonbLocation(location: PropertyDTO["location"] | undefined | null): Json | null {
  if (!location) return null;
  const { lat, lng } = location;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  // Retornar objeto plano que Supabase convertirá a JSONB automáticamente
  return { lat, lng };
}

function readNormalizedStatus(input: unknown): PropertyDTO["normalizedStatus"] | null {
  if (!input || typeof input !== "object") return null;
  const status = (input as { status?: unknown }).status;
  if (typeof status !== "string") return null;
  return status as PropertyDTO["normalizedStatus"];
}

function readCountry(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const country = (input as { country?: unknown }).country;
  return typeof country === "string" ? country : null;
}

function buildNormalizedAddress(
  normalizedStatus: PropertyDTO["normalizedStatus"] | null | undefined,
  current: Json | null | undefined,
): NormalizedJson | null {
  if (!normalizedStatus) return null;
  const base: NormalizedJson =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, Json>) }
      : {};
  return { ...base, status: normalizedStatus };
}

function coerceBoolean(value: boolean | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

export function mapPropertyRowToDTO(row: PropertyRow): PropertyDTO {
  const resolvedOrgId = row.org_id ?? row.lister_user_id ?? "independent"; // TODO(DATOS): Homologar org_id nulo con agentes independientes.
  const priceAmount = parseNumeric(row.price);
  if (priceAmount === null) {
    throw new Error("Property row missing price");
  }
  const currency = (row.currency as PropertyDTO["price"]["currency"]) ?? "MXN";
  return {
    id: row.id,
    orgId: resolvedOrgId,
    listerUserId: row.lister_user_id,
    status: row.status as PropertyDTO["status"],
    publishedAt: ensureIso(row.published_at),
    soldAt: ensureIso(row.sold_at),
    title: row.title,
    description: row.description,
    price: {
      amount: priceAmount,
      currency,
    },
    propertyType: row.property_type as PropertyDTO["propertyType"],
    operationType: row.operation_type as PropertyDTO["operationType"],
    bedrooms: row.bedrooms,
    bathrooms: parseNumeric(row.bathrooms),
    parkingSpots: row.parking_spots,
    constructionM2: parseNumeric(row.construction_m2),
    landM2: parseNumeric(row.land_m2),
    levels: row.levels,
    yearBuilt: row.year_built,
    floor: row.floor,
    hoaFee: row.hoa_fee
      ? {
          amount: parseNumeric(row.hoa_fee) ?? 0,
          currency,
        }
      : null,
    condition: row.condition as PropertyDTO["condition"],
    furnished: coerceBoolean(row.furnished),
    petFriendly: coerceBoolean(row.pet_friendly),
    orientation: row.orientation as PropertyDTO["orientation"],
    amenities: row.amenities ?? [],
    amenitiesExtra: null,
    address: {
      addressLine: row.address_line,
      neighborhood: row.neighborhood,
      city: row.city ?? "",
      state: row.state ?? "",
      postalCode: row.postal_code,
      country: readCountry(row.normalized_address) ?? "MX",
      displayAddress: Boolean(row.display_address),
    },
    location: readLocation(row.location),
    tags: row.tags_cached ?? [],
    internalId: row.internal_id,
    rppVerification: (row.rpp_verified ?? "pending") as PropertyDTO["rppVerification"],
    completenessScore: row.completeness_score ?? 0,
    normalizedStatus: readNormalizedStatus(row.normalized_address),
    trustScore: row.trust_score,
    deletedAt: ensureIso(row.deleted_at),
    createdAt: ensureIso(row.created_at),
    updatedAt: ensureIso(row.updated_at),
  };
}

export function mapPropertyDtoToInsertPayload(dto: CreatePropertyDTO): PropertyInsertPayload {
  return {
    id: dto.id,
    org_id: dto.orgId ?? null,
    lister_user_id: dto.listerUserId,
    status: dto.status,
    property_type: dto.propertyType,
    operation_type: dto.operationType,
    title: dto.title,
    description: dto.description ?? null,
    price: dto.price.amount,
    currency: dto.price.currency,
    bedrooms: dto.bedrooms ?? null,
    bathrooms: dto.bathrooms ?? null,
    parking_spots: dto.parkingSpots ?? null,
    construction_m2: dto.constructionM2 ?? null,
    land_m2: dto.landM2 ?? null,
    amenities: dto.amenities ?? [],
    address_line: dto.address.addressLine ?? null,
    neighborhood: dto.address.neighborhood ?? null,
    city: dto.address.city,
    state: dto.address.state,
    postal_code: dto.address.postalCode ?? null,
    display_address: dto.address.displayAddress ?? false,
    location: toJsonbLocation(dto.location),
    normalized_address: dto.normalizedStatus
      ? { status: dto.normalizedStatus }
      : null,
    rpp_verified: dto.rppVerification ?? "pending",
    completeness_score: dto.completenessScore ?? 0,
    trust_score: dto.trustScore ?? null,
    tags_cached: dto.tags ?? [],
    internal_id: dto.internalId ?? null,
    levels: dto.levels ?? null,
    year_built: dto.yearBuilt ?? null,
    floor: dto.floor ?? null,
    hoa_fee: dto.hoaFee?.amount ?? null,
    condition: dto.condition ?? null,
    furnished: dto.furnished ?? null,
    pet_friendly: dto.petFriendly ?? null,
    orientation: dto.orientation ?? null,
    published_at: dto.publishedAt ?? null,
    sold_at: dto.soldAt ?? null,
    deleted_at: dto.deletedAt ?? null,
  };
}

export function mapPropertyUpdateToPayload(
  patch: UpdatePropertyDTO,
  currentNormalizedAddress?: Json | null,
): PropertyUpdatePayload {
  const payload: PropertyUpdatePayload = {};

  if (patch.title !== undefined) payload.title = patch.title;
  if ("description" in patch) payload.description = patch.description ?? null;
  if (patch.price) {
    payload.price = patch.price.amount;
    payload.currency = patch.price.currency;
  }
  if (patch.propertyType !== undefined) payload.property_type = patch.propertyType;
  if (patch.operationType !== undefined) payload.operation_type = patch.operationType;
  if (patch.bedrooms !== undefined) payload.bedrooms = patch.bedrooms ?? null;
  if (patch.bathrooms !== undefined) payload.bathrooms = patch.bathrooms ?? null;
  if (patch.parkingSpots !== undefined) payload.parking_spots = patch.parkingSpots ?? null;
  if (patch.constructionM2 !== undefined) {
    payload.construction_m2 = patch.constructionM2 ?? null;
  }
  if (patch.landM2 !== undefined) payload.land_m2 = patch.landM2 ?? null;
  if (patch.levels !== undefined) payload.levels = patch.levels ?? null;
  if (patch.yearBuilt !== undefined) payload.year_built = patch.yearBuilt ?? null;
  if (patch.floor !== undefined) payload.floor = patch.floor ?? null;
  if ("hoaFee" in patch) payload.hoa_fee = patch.hoaFee ? patch.hoaFee.amount : null;
  if (patch.condition !== undefined) payload.condition = patch.condition ?? null;
  if (patch.furnished !== undefined) payload.furnished = patch.furnished ?? null;
  if (patch.petFriendly !== undefined) payload.pet_friendly = patch.petFriendly ?? null;
  if (patch.orientation !== undefined) payload.orientation = patch.orientation ?? null;
  if (patch.amenities !== undefined) payload.amenities = patch.amenities ?? [];
  if ("amenitiesExtra" in patch) {
    // Pending concrete storage column; intentionally no-op to avoid data loss.
  }
  if (patch.address) {
    payload.address_line = patch.address.addressLine ?? null;
    payload.neighborhood = patch.address.neighborhood ?? null;
    payload.city = patch.address.city;
    payload.state = patch.address.state;
    payload.postal_code = patch.address.postalCode ?? null;
    payload.display_address = patch.address.displayAddress ?? false;
  }
  if (patch.location !== undefined) {
    payload.location = toJsonbLocation(patch.location);
  }
  if (patch.tags !== undefined) payload.tags_cached = patch.tags ?? [];
  if ("internalId" in patch) payload.internal_id = patch.internalId ?? null;
  if ("rppVerification" in patch) {
    payload.rpp_verified = patch.rppVerification ?? "pending";
  }
  if ("completenessScore" in patch) {
    payload.completeness_score = patch.completenessScore ?? 0;
  }
  if ("normalizedStatus" in patch) {
    payload.normalized_address = buildNormalizedAddress(
      patch.normalizedStatus ?? null,
      currentNormalizedAddress,
    );
  }

  return payload;
}
