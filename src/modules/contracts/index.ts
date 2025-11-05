// Exportaciones centralizadas del módulo contracts
export { createContractsContainer } from "./contracts.container";
export type { ContractsContainer, ContractsUseCases } from "./contracts.container";

// Use Cases
export { ListPropertiesForSelector } from "./application/use-cases/ListPropertiesForSelector";
export { ListClientsForSelector } from "./application/use-cases/ListClientsForSelector";

// DTOs
export type { PropertySummaryDTO, Page } from "./application/dto/PropertyDTO";
export type { ClientSummaryDTO } from "./application/dto/ClientDTO";

// Ports
export type { PropertyRepo } from "./application/ports/PropertyRepo";
export type { ClientRepo } from "./application/ports/ClientRepo";
export type { AuthService, AuthProfile } from "./application/ports/AuthService";

// Hooks
export { useContractsActions } from "./UI/hooks/useContractsActions";
