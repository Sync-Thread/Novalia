// Hook: Acciones para el módulo de contracts
import { useCallback, useState } from "react";
import { createContractsContainer } from "../../contracts.container";
import type { PropertySummaryDTO, Page } from "../../application/dto/PropertyDTO";
import type { ClientSummaryDTO } from "../../application/dto/ClientDTO";
import type { ContractListItemDTO } from "../../application/dto/ContractDTO";

const container = createContractsContainer();

interface UseContractsActionsState {
  loading: {
    properties: boolean;
    clients: boolean;
    contracts: boolean;
  };
  errors: {
    properties: string | null;
    clients: string | null;
    contracts: string | null;
  };
  listPropertiesForSelector: (params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<Page<PropertySummaryDTO> | null>;
  listClientsForSelector: (params?: {
    search?: string;
    pageSize?: number;
  }) => Promise<ClientSummaryDTO[] | null>;
  listContracts: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<Page<ContractListItemDTO> | null>;
}

export function useContractsActions(): UseContractsActionsState {
  const [loading, setLoading] = useState({
    properties: false,
    clients: false,
    contracts: false,
  });

  const [errors, setErrors] = useState<{
    properties: string | null;
    clients: string | null;
    contracts: string | null;
  }>({
    properties: null,
    clients: null,
    contracts: null,
  });

  const listPropertiesForSelector = useCallback(
    async (params?: {
      search?: string;
      page?: number;
      pageSize?: number;
    }): Promise<Page<PropertySummaryDTO> | null> => {
      setLoading((prev) => ({ ...prev, properties: true }));
      setErrors((prev) => ({ ...prev, properties: null }));

      try {
        const result =
          await container.useCases.listPropertiesForSelector.execute({
            search: params?.search,
            page: params?.page ?? 1,
            pageSize: params?.pageSize ?? 100,
          });

        if (result.isOk()) {
          return result.value;
        } else {
          const error = result.error as any;
          const errorMessage =
            error?.message || "Error al cargar propiedades";
          setErrors((prev) => ({ ...prev, properties: errorMessage }));
          console.error("Error loading properties:", result.error);
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error inesperado al cargar propiedades";
        setErrors((prev) => ({ ...prev, properties: errorMessage }));
        console.error("Unexpected error loading properties:", error);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, properties: false }));
      }
    },
    []
  );

  const listClientsForSelector = useCallback(
    async (params?: {
      search?: string;
      pageSize?: number;
    }): Promise<ClientSummaryDTO[] | null> => {
      setLoading((prev) => ({ ...prev, clients: true }));
      setErrors((prev) => ({ ...prev, clients: null }));

      try {
        const result =
          await container.useCases.listClientsForSelector.execute({
            search: params?.search,
            pageSize: params?.pageSize ?? 200,
          });

        if (result.isOk()) {
          return result.value;
        } else {
          const error = result.error as any;
          const errorMessage =
            error?.message || "Error al cargar clientes";
          setErrors((prev) => ({ ...prev, clients: errorMessage }));
          console.error("Error loading clients:", result.error);
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error inesperado al cargar clientes";
        setErrors((prev) => ({ ...prev, clients: errorMessage }));
        console.error("Unexpected error loading clients:", error);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, clients: false }));
      }
    },
    []
  );

  const listContracts = useCallback(
    async (params?: {
      search?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }): Promise<Page<ContractListItemDTO> | null> => {
      setLoading((prev) => ({ ...prev, contracts: true }));
      setErrors((prev) => ({ ...prev, contracts: null }));

      try {
        const result = await container.useCases.listContracts.execute({
          search: params?.search,
          status: params?.status,
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 50,
        });

        if (result.isOk()) {
          return result.value;
        } else {
          const error = result.error as any;
          const errorMessage =
            error?.message || "Error al cargar contratos";
          setErrors((prev) => ({ ...prev, contracts: errorMessage }));
          console.error("Error loading contracts:", result.error);
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error inesperado al cargar contratos";
        setErrors((prev) => ({ ...prev, contracts: errorMessage }));
        console.error("Unexpected error loading contracts:", error);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, contracts: false }));
      }
    },
    []
  );

  return {
    loading,
    errors,
    listPropertiesForSelector,
    listClientsForSelector,
    listContracts,
  };
}
