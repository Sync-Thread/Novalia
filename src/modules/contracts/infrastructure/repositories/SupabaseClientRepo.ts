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

      console.log("🔍 SupabaseClientRepo.listForSelector - filters:", filters);

      // Si se proporciona propertyId, filtrar por usuarios que han interactuado con esa propiedad
      if (filters.propertyId) {
        console.log("✅ Filtrando por propertyId:", filters.propertyId);
        
        // Usar RPC function que omite RLS para obtener perfiles de usuarios interesados
        // Esta función valida que el usuario actual tenga acceso a la propiedad
        const { data, error } = await this.client
          .rpc('get_interested_profiles', { p_property_id: filters.propertyId });

        console.log("👥 Profiles encontrados (via RPC):", data?.length || 0);

        if (error) {
          console.error("❌ Error loading interested profiles:", error);
          return Result.fail({
            code: "DATABASE_ERROR",
            message: error.message || String(error),
          });
        }

        // Si hay búsqueda, filtrar en cliente (ya que RPC no soporta parámetros adicionales)
        let filteredData = data || [];
        if (filters.search && filters.search.trim()) {
          const term = filters.search.trim().toLowerCase();
          filteredData = filteredData.filter((row: ClientRow) => 
            row.full_name?.toLowerCase().includes(term) ||
            row.email?.toLowerCase().includes(term) ||
            row.phone?.includes(term)
          );
        }

        // Limitar resultados
        filteredData = filteredData.slice(0, pageSize);

        // Mapear a DTOs
        const items: ClientSummaryDTO[] = (filteredData || []).map(
          (row: ClientRow) => ({
            id: row.id,
            fullName: row.full_name || "Sin nombre",
            email: row.email,
            phone: row.phone,
          })
        );

        return Result.ok(items);
      }

      // Si NO hay propertyId, cargar todos los contactos
      console.log("📋 No hay propertyId, cargando todos los contactos");
      
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
