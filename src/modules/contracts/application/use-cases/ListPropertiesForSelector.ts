// Caso de uso: listar propiedades para selector de contratos
import { Result } from "../../../properties/application/_shared/result";
import type { PropertySummaryDTO, Page } from "../dto/PropertyDTO";
import type { PropertyRepo, PropertyListFilters } from "../ports/PropertyRepo";
import type { AuthService } from "../ports/AuthService";

export class ListPropertiesForSelector {
  private readonly deps: {
    propertyRepo: PropertyRepo;
    authService: AuthService;
  };

  constructor(deps: {
    propertyRepo: PropertyRepo;
    authService: AuthService;
  }) {
    this.deps = deps;
  }

  async execute(filters: Omit<PropertyListFilters, "orgId">): Promise<Result<Page<PropertySummaryDTO>>> {
    // 1. Obtener contexto de autenticación
    const authResult = await this.deps.authService.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }

    const { orgId } = authResult.value;
    if (!orgId) {
      return Result.fail({
        code: "AUTH",
        message: "No organization found for user",
      });
    }

    // 2. Listar propiedades del mismo org
    const result = await this.deps.propertyRepo.listForSelector({
      ...filters,
      orgId,
    });

    return result;
  }
}
