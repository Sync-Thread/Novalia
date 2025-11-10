// Port: Repositorio de clientes para el módulo de contracts
import { Result } from "../../../properties/application/_shared/result";
import type { ClientSummaryDTO } from "../dto/ClientDTO";

export interface ClientListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  propertyId?: string; // Filtrar por usuarios (profiles) que han interactuado con esta propiedad
}

export interface ClientRepo {
  /**
   * Lista usuarios (profiles) para selector de contratos
   * Si se proporciona propertyId, filtra solo los usuarios que hayan generado eventos en esa propiedad
   * (page_view, property_click, chat_open, first_contact, chat_message)
   * 
   * Flujo: events (filtrar por property_id) → user_ids → profiles (obtener datos completos)
   */
  listForSelector(filters: ClientListFilters): Promise<Result<ClientSummaryDTO[]>>;
}
