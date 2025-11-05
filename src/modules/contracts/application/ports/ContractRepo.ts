// Port: Repositorio de contratos
import { Result } from "../../../properties/application/_shared/result";
import type { ContractListItemDTO, Page } from "../dto/ContractDTO";

export interface ContractListFilters {
  orgId: string | null;
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export interface ContractRepo {
  /**
   * Lista contratos del usuario
   * - Si tiene org: muestra contratos del org
   * - Si NO tiene org: muestra solo sus contratos (user_id)
   */
  listContracts(filters: ContractListFilters): Promise<Result<Page<ContractListItemDTO>>>;
}
