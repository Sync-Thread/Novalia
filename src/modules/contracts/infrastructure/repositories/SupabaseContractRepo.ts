// Repositorio: Contratos usando Supabase
import type { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "../../../properties/application/_shared/result";
import type { ContractRepo, ContractListFilters } from "../../application/ports/ContractRepo";
import type { ContractListItemDTO, Page } from "../../application/dto/ContractDTO";

interface ContractRow {
  id: string;
  title: string | null;
  contract_type: string;
  status: string;
  property_id: string | null;
  client_contact_id: string | null;
  issued_on: string;
  due_on: string | null;
  s3_key: string | null;
  created_at: string;
  properties: {
    title: string | null;
    internal_id: string | null;
  } | null;
  lead_contacts: {
    full_name: string | null;
  } | null;
}

interface MediaRow {
  property_id: string;
  s3_key: string;
}

export class SupabaseContractRepo implements ContractRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listContracts(
    filters: ContractListFilters
  ): Promise<Result<Page<ContractListItemDTO>>> {
    try {
      const page = Math.max(filters.page ?? 1, 1);
      const pageSize = Math.max(filters.pageSize ?? 50, 1);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Query base: contratos (sin filtro inicial)
      let query = this.client
        .from("contracts")
        .select(
          `
            id,
            title,
            contract_type,
            status,
            property_id,
            client_contact_id,
            issued_on,
            due_on,
            s3_key,
            created_at,
            properties:contracts_property_id_fkey (
              title,
              internal_id
            ),
            lead_contacts:contracts_client_contact_id_fkey (
              full_name
            )
          `,
          { count: "exact" }
        );

      // Filtro por org O por usuario creador
      if (filters.orgId) {
        query = query.eq("org_id", filters.orgId);
      } else {
        query = query
          .is("org_id", null)
          .eq("user_id", filters.userId);
      }

      // Filtro por status (opcional)
      if (filters.status && filters.status !== "Todos") {
        if (filters.status === "PendienteDeFirma") {
          query = query.eq("status", "draft");
        } else if (filters.status === "Vigente") {
          query = query.eq("status", "active");
        } else if (filters.status === "Cerrados/Archivados") {
          query = query.in("status", ["cancelled", "expired"]);
        }
      }

      // Búsqueda opcional (por título, ID de contrato, nombre de propiedad o cliente)
      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim().replace(/[%_]/g, "\\$&");
        query = query.or(
          `title.ilike.%${term}%,id.ilike.%${term}%`
        );
      }

      // Ordenar y paginar
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error listing contracts:", error);
        return Result.fail({
          code: "DATABASE_ERROR",
          message: error.message,
        });
      }

      const contractRows = data as unknown as ContractRow[];

      // Obtener property_ids para buscar imágenes de portada
      const propertyIds = contractRows
        .map((c) => c.property_id)
        .filter((id): id is string => id !== null);

      // Obtener imágenes de portada
      let coverMap = new Map<string, string>();
      if (propertyIds.length > 0) {
        const { data: mediaData, error: mediaError } = await this.client
          .from("media_assets")
          .select("property_id, s3_key, metadata")
          .in("property_id", propertyIds)
          .eq("metadata->>isCover", "true");

        if (mediaError) {
          // Las imágenes son opcionales - solo log en dev
          if (import.meta.env.DEV) {
            console.info(
              "No se pudieron cargar algunas imágenes de portada:",
              mediaError.code
            );
          }
        } else if (mediaData) {
          coverMap = new Map(
            mediaData.map((m: MediaRow) => [m.property_id, m.s3_key])
          );
        }
      }

      // Mapear a DTOs
      const items: ContractListItemDTO[] = contractRows.map((row) => ({
        id: row.id,
        title: row.title || "Sin título",
        contractType: row.contract_type as "intermediacion" | "oferta" | "promesa",
        status: row.status as "draft" | "pending_signature" | "signed" | "active" | "expired" | "cancelled",
        propertyId: row.property_id,
        propertyName: row.properties?.title || null,
        propertyInternalId: row.properties?.internal_id || null,
        propertyCoverImageS3Key: row.property_id ? coverMap.get(row.property_id) || null : null,
        clientContactId: row.client_contact_id,
        clientName: row.lead_contacts?.full_name || null,
        issuedOn: row.issued_on,
        dueOn: row.due_on,
        s3Key: row.s3_key,
        createdAt: row.created_at,
      }));

      return Result.ok({
        items,
        total: count ?? items.length,
        page,
        pageSize,
      });
    } catch (error) {
      console.error("Unexpected error listing contracts:", error);
      return Result.fail({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
