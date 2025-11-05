// Caso de uso: listar contratos del usuario
import { Result } from "../../../properties/application/_shared/result";
import type { ContractListItemDTO, Page } from "../dto/ContractDTO";
import type { ContractRepo, ContractListFilters } from "../ports/ContractRepo";
import type { AuthService } from "../ports/AuthService";

export class ListContracts {
  private readonly deps: {
    contractRepo: ContractRepo;
    authService: AuthService;
  };

  constructor(deps: {
    contractRepo: ContractRepo;
    authService: AuthService;
  }) {
    this.deps = deps;
  }

  async execute(filters: Omit<ContractListFilters, "orgId" | "userId">): Promise<Result<Page<ContractListItemDTO>>> {
    // 1. Obtener contexto de autenticación
    const authResult = await this.deps.authService.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }

    const { orgId, userId } = authResult.value;

    // 2. Listar contratos del org (si tiene) o del usuario (si no tiene org)
    const result = await this.deps.contractRepo.listContracts({
      ...filters,
      orgId: orgId || null,
      userId,
    });
    // console.log('execute para cargar usuarios:');
    // result.value.items.map(c => {
    //   console.log('propiedad: ',c.propertyId);
    //   console.log('client bla bla:', c.clientContactId);
    //   console.log('client to to ', c.clientName);    
    //   console.log('no se', c.clientProfileId);
      
    // });
    // console.log(result.value.items);
    
    
    
    return result;
  }
}
