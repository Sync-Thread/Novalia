// Repositorio: Clientes usando Supabase para el módulo de contracts
import type { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "../../../properties/application/_shared/result";
import type { ClientRepo, ClientListFilters } from "../../application/ports/ClientRepo";
import type { ClientSummaryDTO } from "../../application/dto/ClientDTO";

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export class SupabaseClientRepo implements ClientRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listForSelector(
    filters: ClientListFilters
  ): Promise<Result<ClientSummaryDTO[]>> {
    try {
      const pageSize = Math.max(filters.pageSize ?? 200, 1);

      // Query base: todos los contactos
      // TODO: Filtrar por aquellos que hayan interactuado con propiedades del usuario
      let query = this.client
        .from("lead_contacts")
        .select("id, full_name, email, phone")
        .order("created_at", { ascending: false })
        .limit(pageSize);

      // Búsqueda opcional
      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim().replace(/[%_]/g, "\\$&");
        query = query.or(
          `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail({
          code: "DATABASE_ERROR",
          message: error.message,
        });
      }

      // Mapear a DTOs
      const items: ClientSummaryDTO[] = (data || []).map(
        (row: ClientRow) => ({
          id: row.id,
          fullName: row.full_name || "Sin nombre",
          email: row.email,
          phone: row.phone,
        })
      );

      return Result.ok(items);
    } catch (error) {
      return Result.fail({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
