// Repositorio: Propiedades usando Supabase para el módulo de contracts
import type { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "../../../properties/application/_shared/result";
import type { PropertyRepo, PropertyListFilters } from "../../application/ports/PropertyRepo";
import type { PropertySummaryDTO, Page } from "../../application/dto/PropertyDTO";

interface PropertyRow {
  id: string;
  title: string | null;
  internal_id: string | null;
  address_line: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

interface MediaRow {
  property_id: string;
  s3_key: string;
}

export class SupabasePropertyRepo implements PropertyRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listForSelector(
    filters: PropertyListFilters
  ): Promise<Result<Page<PropertySummaryDTO>>> {
    try {
      const page = Math.max(filters.page ?? 1, 1);
      const pageSize = Math.max(filters.pageSize ?? 100, 1);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Query base: propiedades (sin filtro inicial)
      let query = this.client
        .from("properties")
        .select(
          "id, title, internal_id, address_line, neighborhood, city, state",
          { count: "exact" }
        )
        .is("deleted_at", null);

      // Filtro por org O por usuario dueño
      if (filters.orgId) {
        // Usuario con organización: mostrar propiedades del org
        query = query.eq("org_id", filters.orgId);
      } else {
        // Usuario sin organización: mostrar solo sus propiedades
        query = query
          .is("org_id", null)
          .eq("lister_user_id", filters.userId);
      }

      // Búsqueda opcional
      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim().replace(/[%_]/g, "\\$&");
        query = query.or(
          `title.ilike.%${term}%,internal_id.ilike.%${term}%,city.ilike.%${term}%`
        );
      }

      // Ordenar y paginar
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return Result.fail({
          code: "DATABASE_ERROR",
          message: error.message,
        });
      }

      const propertyIds = (data || []).map((p) => p.id);

      // Obtener imágenes de portada
      let coverMap = new Map<string, string>();
      if (propertyIds.length > 0) {
        const { data: mediaData } = await this.client
          .from("media_assets")
          .select("property_id, s3_key, metadata")
          .in("property_id", propertyIds)
          .eq("metadata->>isCover", "true");

        if (mediaData) {
          coverMap = new Map(
            mediaData.map((m: MediaRow) => [m.property_id, m.s3_key])
          );
        }
      }

      // Mapear a DTOs
      const items: PropertySummaryDTO[] = (data || []).map(
        (row: PropertyRow) => ({
          id: row.id,
          title: row.title || "Sin título",
          internalId: row.internal_id,
          addressLine: row.address_line,
          neighborhood: row.neighborhood,
          city: row.city,
          state: row.state,
          coverImageS3Key: coverMap.get(row.id) || null,
        })
      );

      return Result.ok({
        items,
        total: count ?? items.length,
        page,
        pageSize,
      });
    } catch (error) {
      return Result.fail({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
