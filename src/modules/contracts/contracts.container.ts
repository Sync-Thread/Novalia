// Contenedor de dependencias para el módulo de contracts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../core/supabase/client";

// Use Cases
import { ListPropertiesForSelector } from "./application/use-cases/ListPropertiesForSelector";
import { ListClientsForSelector } from "./application/use-cases/ListClientsForSelector";
import { ListContracts } from "./application/use-cases/ListContracts";

// Infrastructure
import { SupabaseAuthService } from "./infrastructure/adapters/SupabaseAuthService";
import { SupabasePropertyRepo } from "./infrastructure/repositories/SupabasePropertyRepo";
import { SupabaseClientRepo } from "./infrastructure/repositories/SupabaseClientRepo";
import { SupabaseContractRepo } from "./infrastructure/repositories/SupabaseContractRepo";

export interface ContractsContainerDeps {
  client?: SupabaseClient;
}

export interface ContractsUseCases {
  listPropertiesForSelector: ListPropertiesForSelector;
  listClientsForSelector: ListClientsForSelector;
  listContracts: ListContracts;
}

export interface ContractsContainer {
  useCases: ContractsUseCases;
}

export function createContractsContainer(
  deps: ContractsContainerDeps = {}
): ContractsContainer {
  const client = deps.client ?? supabase;

  // Instanciar servicios de infraestructura
  const authService = new SupabaseAuthService(client);
  const propertyRepo = new SupabasePropertyRepo(client);
  const clientRepo = new SupabaseClientRepo(client);
  const contractRepo = new SupabaseContractRepo(client);

  return {
    useCases: {
      listPropertiesForSelector: new ListPropertiesForSelector({
        propertyRepo,
        authService,
      }),
      listClientsForSelector: new ListClientsForSelector({
        clientRepo,
      }),
      listContracts: new ListContracts({
        contractRepo,
        authService,
      }),
    },
  };
}
