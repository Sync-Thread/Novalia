// Port: Repositorio de propiedades para el módulo de contracts
import { Result } from "../../../properties/application/_shared/result";
import type { PropertySummaryDTO, Page } from "../dto/PropertyDTO";

export interface PropertyListFilters {
  orgId: string | null; // Ahora puede ser null para usuarios sin org
  userId: string; // Usuario autenticado (para filtrar si no tiene org)
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PropertyRepo {
  /**
   * Lista propiedades del usuario para selector de contratos
   * - Si tiene org: muestra propiedades del org
   * - Si NO tiene org: muestra solo sus propiedades (lister_user_id)
   */
  listForSelector(filters: PropertyListFilters): Promise<Result<Page<PropertySummaryDTO>>>;
}
