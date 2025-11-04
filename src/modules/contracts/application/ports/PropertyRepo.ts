// Port: Repositorio de propiedades para el módulo de contracts
import { Result } from "../../../properties/application/_shared/result";
import type { PropertySummaryDTO, Page } from "../dto/PropertyDTO";

export interface PropertyListFilters {
  orgId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PropertyRepo {
  /**
   * Lista propiedades del usuario para selector de contratos
   */
  listForSelector(filters: PropertyListFilters): Promise<Result<Page<PropertySummaryDTO>>>;
}
