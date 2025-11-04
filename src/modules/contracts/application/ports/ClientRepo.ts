// Port: Repositorio de clientes para el módulo de contracts
import { Result } from "../../../properties/application/_shared/result";
import type { ClientSummaryDTO } from "../dto/ClientDTO";

export interface ClientListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ClientRepo {
  /**
   * Lista clientes/contactos para selector de contratos
   * TODO: En el futuro, filtrar solo los que hayan interactuado con propiedades del usuario
   */
  listForSelector(filters: ClientListFilters): Promise<Result<ClientSummaryDTO[]>>;
}
