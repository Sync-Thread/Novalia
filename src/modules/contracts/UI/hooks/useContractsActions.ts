// Hook: Acciones para el módulo de contracts
import { useCallback, useState } from "react";
import { createContractsContainer } from "../../contracts.container";
import type { PropertySummaryDTO, Page } from "../../application/dto/PropertyDTO";
import type { ClientSummaryDTO } from "../../application/dto/ClientDTO";
import type { ContractListItemDTO } from "../../application/dto/ContractDTO";
import { SupabaseDocumentStorage } from "../../../properties/infrastructure/adapters/SupabaseDocumentStorage";
import { SupabaseAuthService } from "../../../properties/infrastructure/adapters/SupabaseAuthService";
import { supabase } from "../../../../core/supabase/client";

const container = createContractsContainer();

// Instanciar servicios para descarga de documentos
const authService = new SupabaseAuthService({ client: supabase });
const documentStorage = new SupabaseDocumentStorage({ supabase, authService });

interface UseContractsActionsState {
  loading: {
    properties: boolean;
    clients: boolean;
    contracts: boolean;
    download: boolean;
  };
  errors: {
    properties: string | null;
    clients: string | null;
    contracts: string | null;
    download: string | null;
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
  downloadContract: (s3Key: string, fileName: string) => Promise<void>;
}

export function useContractsActions(): UseContractsActionsState {
  const [loading, setLoading] = useState({
    properties: false,
    clients: false,
    contracts: false,
    download: false,
  });

  const [errors, setErrors] = useState<{
    properties: string | null;
    clients: string | null;
    contracts: string | null;
    download: string | null;
  }>({
    properties: null,
    clients: null,
    contracts: null,
    download: null,
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
    [],
  );

  const downloadContract = useCallback(
    async (s3Key: string, fileName: string): Promise<void> => {
      if (!s3Key) {
        console.error("No s3Key provided for download");
        return;
      }

      setLoading((prev) => ({ ...prev, download: true }));
      setErrors((prev) => ({ ...prev, download: null }));

      try {
        // 1. Obtener presigned URL
        const urlResult = await documentStorage.getDownloadUrl(s3Key);

        if (urlResult.isErr()) {
          const error = urlResult.error as any;
          const errorMessage = error?.message || "Error al obtener URL de descarga";
          setErrors((prev) => ({ ...prev, download: errorMessage }));
          console.error("Error getting download URL:", urlResult.error);
          return;
        }

        const presignedUrl = urlResult.value;

        // 2. Descargar el archivo desde S3
        const response = await fetch(presignedUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const blob = await response.blob();

        // 3. Crear enlace de descarga y hacer click automático
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 4. Limpiar blob URL después de un tiempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error inesperado al descargar contrato";
        setErrors((prev) => ({ ...prev, download: errorMessage }));
        console.error("Unexpected error downloading contract:", error);
      } finally {
        setLoading((prev) => ({ ...prev, download: false }));
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
    downloadContract,
  };
}
