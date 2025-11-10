// Caso de uso: listar clientes para selector de contratos
import { Result } from "../../../properties/application/_shared/result";
import type { ClientSummaryDTO } from "../dto/ClientDTO";
import type { ClientRepo, ClientListFilters } from "../ports/ClientRepo";

export class ListClientsForSelector {
  private readonly deps: {
    clientRepo: ClientRepo;
  };

  constructor(deps: {
    clientRepo: ClientRepo;
  }) {
    this.deps = deps;
  }

  async execute(filters: ClientListFilters): Promise<Result<ClientSummaryDTO[]>> {
    const result = await this.deps.clientRepo.listForSelector(filters);
    return result;
  }
}
