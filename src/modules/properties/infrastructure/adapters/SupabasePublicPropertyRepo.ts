import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type {
  PublicPropertyListFiltersDTO,
  PublicPropertyPage,
  PublicPropertySummaryDTO,
} from "../../application/dto/PublicPropertyDTO";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { PublicPropertyRepo } from "../../application/ports/PublicPropertyRepo";
import { CURRENCY_VALUES, type Currency } from "../../domain/enums";
import { mapPropertyRowToDTO } from "../../application/mappers/property.mapper";
import type { PropertyRow } from "../types/supabase-rows";

type PublicPropertyErrorCode = "UNKNOWN";

export type PublicPropertyInfraError = {
  scope: "properties_public";
  code: PublicPropertyErrorCode;
  message: string;
  cause?: unknown;
};

type PublicPropertyRow = {
  id: string;
  title: string | null;
  description: string | null;
  price: string | number | null;
  currency: string | null;
  property_type: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  bedrooms: number | null;
  bathrooms: string | number | null;
  construction_m2: string | number | null;
  land_m2: string | number | null;
  parking_spots: number | null;
  levels: number | null;
  published_at: string | null;
};

const PUBLIC_COLUMNS = [
  "id",
  "title",
  "description",
  "price",
  "currency",
  "property_type",
  "neighborhood",
  "city",
  "state",
  "bedrooms",
  "bathrooms",
  "construction_m2",
  "land_m2",
  "parking_spots",
  "levels",
  "published_at",
].join(",");

// Columnas completas para obtener detalle de una propiedad pública
const PROPERTY_DETAIL_COLUMNS = [
  "id",
  "org_id",
  "lister_user_id",
  "status",
  "property_type",
  "operation_type",
  "title",
  "description",
  "price",
  "currency",
  "bedrooms",
  "bathrooms",
  "parking_spots",
  "construction_m2",
  "land_m2",
  "amenities",
  "address_line",
  "neighborhood",
  "city",
  "state",
  "postal_code",
  "display_address",
  "location",
  "normalized_address",
  "rpp_verified",
  "completeness_score",
  "trust_score",
  "tags_cached",
  "internal_id",
  "levels",
  "year_built",
  "floor",
  "hoa_fee",
  "condition",
  "furnished",
  "pet_friendly",
  "orientation",
  "published_at",
  "sold_at",
  "deleted_at",
  "created_at",
  "updated_at",
].join(",");

function publicError(code: PublicPropertyErrorCode, message: string, cause?: unknown): PublicPropertyInfraError {
  return { scope: "properties_public", code, message, cause };
}

function mapPostgrestError(error: PostgrestError): PublicPropertyInfraError {
  return publicError("UNKNOWN", error.message, error);
}

function escapeIlike(term: string): string {
  return term.replace(/[%_]/g, char => `\\${char}`).replace(/,/g, "\\,");
}

function parsePrice(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCurrency(value: string | null | undefined): Currency {
  if (!value) return "MXN";
  const upper = value.toUpperCase();
  return (CURRENCY_VALUES as string[]).includes(upper) ? (upper as Currency) : "MXN";
}

function normalizePropertyType(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function mapRowToSummary(row: PublicPropertyRow): PublicPropertySummaryDTO {
  return {
    id: row.id,
    title: row.title ?? "Propiedad sin título",
    description: row.description ?? null,
    price: {
      amount: parsePrice(row.price),
      currency: normalizeCurrency(row.currency),
    },
    propertyType: normalizePropertyType(row.property_type),
    neighborhood: row.neighborhood ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: parseOptionalNumber(row.bathrooms),
    constructionSizeM2: parseOptionalNumber(row.construction_m2),
    landSizeM2: parseOptionalNumber(row.land_m2),
    parkingSpots: parseOptionalNumber(row.parking_spots),
    levels: parseOptionalNumber(row.levels),
    publishedAt: row.published_at ?? null,
    coverImageUrl: null,
  };
}

export class SupabasePublicPropertyRepo implements PublicPropertyRepo {
  private readonly client: SupabaseClient;

  constructor(deps: { client: SupabaseClient }) {
    this.client = deps.client;
  }

  async listPublished(filters: PublicPropertyListFiltersDTO): Promise<Result<PublicPropertyPage>> {
    const {
      page,
      pageSize,
      sortBy = "recent",
      city,
      state,
      q,
      propertyType,
      priceMin,
      priceMax,
      bedroomsMin,
      bathroomsMin,
      parkingSpotsMin,
      levelsMin,
      areaMin,
      areaMax,
    } = filters;
    const offset = (page - 1) * pageSize;
    const limit = offset + pageSize - 1;

    let query = this.client
      .from("properties")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null);

    if (city) {
      query = query.ilike("city", `%${escapeIlike(city)}%`);
    }

    if (state) {
      query = query.ilike("state", `%${escapeIlike(state)}%`);
    }

    if (propertyType) {
      query = query.eq("property_type", propertyType);
    }

    if (typeof priceMin === "number") {
      query = query.gte("price", priceMin);
    }

    if (typeof priceMax === "number") {
      query = query.lte("price", priceMax);
    }

    if (typeof bedroomsMin === "number") {
      query = query.gte("bedrooms", bedroomsMin);
    }

    if (typeof bathroomsMin === "number") {
      query = query.gte("bathrooms", bathroomsMin);
    }

    if (typeof parkingSpotsMin === "number") {
      query = query.gte("parking_spots", parkingSpotsMin);
    }

    if (typeof levelsMin === "number") {
      query = query.gte("levels", levelsMin);
    }

    if (typeof areaMin === "number") {
      query = query.gte("construction_m2", areaMin);
    }

    if (typeof areaMax === "number") {
      query = query.lte("construction_m2", areaMax);
    }

    if (q) {
      const term = escapeIlike(q.trim());
      if (term) {
        query = query.or(`title.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%`);
      }
    }

    if (sortBy === "price_asc") {
      query = query.order("price", { ascending: true, nullsFirst: true });
    } else if (sortBy === "price_desc") {
      query = query.order("price", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("published_at", { ascending: false, nullsFirst: false });
    }

    const { data, error, count } = await query.range(offset, limit);

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    const items = (data ?? []).map(row => mapRowToSummary(row as unknown as PublicPropertyRow));

    return Result.ok({
      items,
      total: count ?? items.length,
      page,
      pageSize,
    });
  }

  async getPublishedById(id: string): Promise<Result<PropertyDTO>> {
    const { data, error } = await this.client
      .from("properties")
      .select(PROPERTY_DETAIL_COLUMNS)
      .eq("id", id)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows")) {
        return Result.fail(publicError("UNKNOWN", "Propiedad no encontrada o no publicada", error));
      }
      return Result.fail(mapPostgrestError(error));
    }

    if (!data) {
      return Result.fail(publicError("UNKNOWN", "Propiedad no encontrada"));
    }

    try {
      return Result.ok(mapPropertyRowToDTO(data as unknown as PropertyRow));
    } catch (cause) {
      return Result.fail(publicError("UNKNOWN", "Error al mapear datos de la propiedad", cause));
    }
  }
}
