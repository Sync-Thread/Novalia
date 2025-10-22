import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { PropertyRepo } from "../../application/ports/PropertyRepo";
import type { ListFiltersDTO } from "../../application/dto/FiltersDTO";
import type {
  CreatePropertyDTO,
  Page,
  PropertyDTO,
  UpdatePropertyDTO,
} from "../../application/dto/PropertyDTO";
import type { AuthService } from "../../application/ports/AuthService";
import type { Clock } from "../../application/ports/Clock";
import { Result } from "../../application/_shared/result";
import {
  mapPropertyDtoToInsertPayload,
  mapPropertyRowToDTO,
  mapPropertyUpdateToPayload,
} from "../mappers/property.mappers";
import type { PropertyRow } from "../types/supabase-rows";
import { scopeByContext } from "./scopeByContext";

type PropertyErrorCode =
  | "AUTH"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "UNKNOWN";

export type PropertyInfraError = {
  scope: "properties";
  code: PropertyErrorCode;
  message: string;
  cause?: unknown;
  details?: unknown;
};

const PROPERTY_COLUMNS = [
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

function propertyError(
  code: PropertyErrorCode,
  message: string,
  cause?: unknown,
  details?: unknown,
): PropertyInfraError {
  return { scope: "properties", code, message, cause, details };
}

function escapeIlike(term: string): string {
  return term.replace(/[%_]/g, char => `\\${char}`).replace(/,/g, "\\,");
}

function mapPostgrestError(error: PostgrestError): PropertyInfraError {
  if (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows")) {
    return propertyError("NOT_FOUND", "Property not found", error);
  }
  if (error.code === "23505") {
    return propertyError("CONFLICT", error.message, error);
  }
  return propertyError("UNKNOWN", error.message, error, error.details);
}

function orderForSort(sortBy: ListFiltersDTO["sortBy"] | undefined): {
  column: string;
  ascending: boolean;
} {
  switch (sortBy) {
    case "price_asc":
      return { column: "price", ascending: true };
    case "price_desc":
      return { column: "price", ascending: false };
    case "completeness_desc":
      return { column: "completeness_score", ascending: false };
    case "recent":
    default:
      return { column: "updated_at", ascending: false };
  }
}

export class SupabasePropertyRepo implements PropertyRepo {
  private readonly client: SupabaseClient;
  private readonly auth: AuthService;
  private readonly clock: Clock;

  constructor(deps: { client: SupabaseClient; auth: AuthService; clock: Clock }) {
    this.client = deps.client;
    this.auth = deps.auth;
    this.clock = deps.clock;
  }

  async list(filters: ListFiltersDTO): Promise<Result<Page<PropertyDTO>>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.max(filters.pageSize ?? 20, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("properties")
      .select(PROPERTY_COLUMNS, { count: "exact" })
      .is("deleted_at", null);

    query = scopeByContext(query, { orgId, userId, listerColumn: "lister_user_id" });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.propertyType) {
      query = query.eq("property_type", filters.propertyType);
    }
    if (filters.city) {
      query = query.ilike("city", `%${escapeIlike(filters.city)}%`);
    }
    if (filters.state) {
      query = query.ilike("state", `%${escapeIlike(filters.state)}%`);
    }
    if (typeof filters.priceMin === "number") {
      query = query.gte("price", filters.priceMin);
    }
    if (typeof filters.priceMax === "number") {
      query = query.lte("price", filters.priceMax);
    }
    if (filters.q) {
      const term = escapeIlike(filters.q.trim());
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,internal_id.ilike.%${term}%,city.ilike.%${term}%`,
        );
      }
    }

    const { column, ascending } = orderForSort(filters.sortBy);
    const { data, error, count } = await query
      .order(column, { ascending, nullsFirst: false })
      .range(from, to);

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    const items = (data ?? []).map(row => mapPropertyRowToDTO(row as unknown as PropertyRow));
    return Result.ok({
      items,
      total: count ?? items.length,
      page,
      pageSize,
    });
  }

  async getById(id: string): Promise<Result<PropertyDTO>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;
    let query = this.client
      .from("properties")
      .select(PROPERTY_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .limit(1);

    query = scopeByContext(query, { orgId, userId, listerColumn: "lister_user_id" });

    const { data, error } = await query.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }
    if (!data) {
      return Result.fail(propertyError("NOT_FOUND", "Property not found"));
    }

    try {
      return Result.ok(mapPropertyRowToDTO(data as unknown as PropertyRow));
    } catch (cause) {
      return Result.fail(propertyError("UNKNOWN", "Failed to map property row", cause));
    }
  }

  async create(input: CreatePropertyDTO): Promise<Result<{ id: string }>> {
    const authContext = await this.auth.getCurrent();
    if (authContext.isErr()) {
      return Result.fail(
        propertyError("AUTH", "Cannot resolve authenticated context", authContext.error),
      );
    }

    const { orgId, userId , location} = authContext.value;

    try {
      const payload = mapPropertyDtoToInsertPayload(input);
      payload.org_id = orgId ?? null;
      payload.lister_user_id = userId;
      console.log('244, payload',payload);
      const locationString = `POINT(${location?.lng} ${location?.lat})`;
      //hacerlo en json:
      const locationGeoJson = 
        
         {lat: location?.lng, lng:location?.lat}
      ;
      const a = JSON.stringify(locationGeoJson);
      if (location!==null && payload.location){ //que tenga valores
        payload.location=a; //lo agrego al payload
        console.log('payload', payload);
        
      }
      const { error } = await this.client.from("properties").insert(payload);
      if (error) {
        return Result.fail(mapPostgrestError(error));
      }
      return Result.ok({ id: input.id });
    } catch (cause) {
      return Result.fail(propertyError("UNKNOWN", "Failed to map property insert payload", cause));
    }
  }

  async update(id: string, patch: UpdatePropertyDTO): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;

    let payload: Record<string, unknown>;
    try {
      payload = mapPropertyUpdateToPayload(patch);
    } catch (cause) {
      return Result.fail(propertyError("VALIDATION", "Invalid property update payload", cause));
    }

    if (Object.keys(payload).length === 0) {
      return Result.ok(undefined);
    }

    let updateQuery = this.client
      .from("properties")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    updateQuery = scopeByContext(updateQuery, { orgId, userId, listerColumn: "lister_user_id" });

    const { error } = await updateQuery.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }
    return Result.ok(undefined);
  }

  async publish(id: string, at: Date): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;

    const payload = {
      status: "published",
      published_at: at.toISOString(),
      deleted_at: null,
    };

    let publishQuery = this.client
      .from("properties")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    publishQuery = scopeByContext(publishQuery, { orgId, userId, listerColumn: "lister_user_id" });

    const { error } = await publishQuery.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }

  async pause(id: string): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;

    let pauseQuery = this.client
      .from("properties")
      .update({ status: "draft" })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    pauseQuery = scopeByContext(pauseQuery, { orgId, userId, listerColumn: "lister_user_id" });

    const { error } = await pauseQuery.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }

  async markSold(id: string, at: Date): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;

    const payload = {
      status: "sold",
      sold_at: at.toISOString(),
    };

    let markSoldQuery = this.client
      .from("properties")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    markSoldQuery = scopeByContext(markSoldQuery, {
      orgId,
      userId,
      listerColumn: "lister_user_id",
    });

    const { error } = await markSoldQuery.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }

  async softDelete(id: string): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { orgId, userId } = authProfile;

    const deletedAt = this.clock.now().toISOString();
    let softDeleteQuery = this.client
      .from("properties")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    softDeleteQuery = scopeByContext(softDeleteQuery, {
      orgId,
      userId,
      listerColumn: "lister_user_id",
    });

    const { error } = await softDeleteQuery.single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }

  async duplicate(
    id: string,
    opts: { copyMedia?: boolean; copyDocs?: boolean },
  ): Promise<Result<{ id: string }>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(propertyError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const authProfile = authResult.value;
    const { userId, orgId: authOrgId } = authProfile;

    let originalQuery = this.client
      .from("properties")
      .select(PROPERTY_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .limit(1);

    originalQuery = scopeByContext(originalQuery, {
      orgId: authOrgId,
      userId,
      listerColumn: "lister_user_id",
    });

    const originalResult = await originalQuery.single();

    if (originalResult.error) {
      return Result.fail(mapPostgrestError(originalResult.error));
    }
    if (!originalResult.data) {
      return Result.fail(propertyError("NOT_FOUND", "Property not found"));
    }

    let baseDto: PropertyDTO;
    try {
      baseDto = mapPropertyRowToDTO(originalResult.data as unknown as PropertyRow);
    } catch (cause) {
      return Result.fail(propertyError("UNKNOWN", "Failed to map property row", cause));
    }

    const nowIso = this.clock.now().toISOString();
    const newId = crypto.randomUUID();
    const duplicate: CreatePropertyDTO = {
      ...baseDto,
      id: newId,
      orgId: baseDto.orgId,
      listerUserId: userId,
      status: "draft",
      title: `${baseDto.title} (copy)`,
      publishedAt: null,
      soldAt: null,
      deletedAt: null,
      internalId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completenessScore: baseDto.completenessScore ?? 0,
    };

    try {
      const payload = mapPropertyDtoToInsertPayload(duplicate);
      payload.org_id = authOrgId ?? null;
      payload.lister_user_id = userId;
      console.log('484, payload ',payload);
      
      const { error } = await this.client.from("properties").insert(payload);
      if (error) {
        return Result.fail(mapPostgrestError(error));
      }
    } catch (cause) {
      return Result.fail(propertyError("UNKNOWN", "Failed to map duplicate payload", cause));
    }

    // copyMedia/copyDocs flags acknowledged for future implementation
    void opts;

    return Result.ok({ id: newId });
  }
}
