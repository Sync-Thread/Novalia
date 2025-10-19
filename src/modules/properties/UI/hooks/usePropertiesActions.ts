import { useCallback, useMemo, useState } from "react";
import { Result } from "../../application";
import type {
  AttachDocumentInput,
  CreatePropertyInput,
  DeletePropertyInput,
  MarkSoldInput,
  PausePropertyInput,
  PublishPropertyInput,
  RemoveMediaInput,
  ReorderMediaInput,
  SchedulePublishInput,
  SetCoverMediaInput,
  UpdatePropertyInput,
  UploadMediaInput,
  VerifyRppInput,
} from "../../application/validators/property.schema";
import type { ListFiltersInput } from "../../application/validators/filters.schema";
import type { Page, PropertyDTO } from "../../application/dto/PropertyDTO";
import type { MediaDTO } from "../../application/dto/MediaDTO";
import type { DocumentDTO } from "../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../application/ports/AuthService";
import { usePropertiesContext } from "../containers/PropertiesProvider";

const ACTIONS = [
  "listProperties",
  "getProperty",
  "createProperty",
  "updateProperty",
  "publishProperty",
  "pauseProperty",
  "schedulePublish",
  "markSold",
  "deleteProperty",
  "uploadMedia",
  "removeMedia",
  "setCoverMedia",
  "reorderMedia",
  "attachDocument",
  "verifyRpp",
  "listDocuments",
  "deleteDocument",
  "getAuthProfile",
] as const;

type ActionKey = (typeof ACTIONS)[number];

type AsyncResult<T> = Promise<Result<T>>;

type LoadingState = Record<ActionKey, boolean>;
type ErrorState = Record<ActionKey, string | null>;

type ExecuteMessages = {
  success?: string;
  error?: string;
  successTitle?: string;
  errorTitle?: string;
};

type ExecuteOptions = {
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
  onError?: (error: unknown, message: string) => void;
};

const DEFAULT_LOADING = ACTIONS.reduce<LoadingState>((state, action) => {
  state[action] = false;
  return state;
}, {} as LoadingState);

const DEFAULT_ERRORS = ACTIONS.reduce<ErrorState>((state, action) => {
  state[action] = null;
  return state;
}, {} as ErrorState);

function resolveErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("scope" in error && (error as { scope?: unknown }).scope === "properties") {
      const root = error as { cause?: unknown; details?: unknown; message?: string };
      const cause = root.cause as { code?: string; message?: string } | undefined;
      const details = root.details as { code?: string } | undefined;
      const code = details?.code ?? cause?.code;
      if (code === "ORG_MISSING") {
        return "Necesitas unirte a una organizaci\u00F3n o crear una antes de gestionar propiedades.";
      }
      if (cause?.message) {
        return cause.message;
      }
    }
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    if ("details" in error && typeof (error as { details?: unknown }).details === "string") {
      return (error as { details: string }).details;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

export interface PropertiesActionsState {
  loading: LoadingState;
  errors: ErrorState;
  clearError: (action: ActionKey) => void;
  clearAllErrors: () => void;
  listProperties: (filters?: Partial<ListFiltersInput>) => AsyncResult<Page<PropertyDTO>>;
  getProperty: (id: string) => AsyncResult<PropertyDTO>;
  createProperty: (input: CreatePropertyInput) => AsyncResult<{ id: string }>;
  updateProperty: (input: { id: string; patch: UpdatePropertyInput }) => AsyncResult<void>;
  publishProperty: (input: PublishPropertyInput) => AsyncResult<void>;
  pauseProperty: (input: PausePropertyInput) => AsyncResult<void>;
  schedulePublish: (input: SchedulePublishInput) => AsyncResult<void>;
  markSold: (input: MarkSoldInput) => AsyncResult<void>;
  deleteProperty: (input: DeletePropertyInput) => AsyncResult<void>;
  uploadMedia: (input: UploadMediaInput) => AsyncResult<MediaDTO>;
  removeMedia: (input: RemoveMediaInput) => AsyncResult<void>;
  setCoverMedia: (input: SetCoverMediaInput) => AsyncResult<void>;
  reorderMedia: (input: ReorderMediaInput) => AsyncResult<void>;
  attachDocument: (input: AttachDocumentInput) => AsyncResult<{ id: string }>;
  verifyRpp: (input: VerifyRppInput) => AsyncResult<void>;
  listDocuments: (propertyId: string) => AsyncResult<DocumentDTO[]>;
  deleteDocument: (documentId: string) => AsyncResult<void>;
  getAuthProfile: () => AsyncResult<AuthProfile>;
}

export function usePropertiesActions(): PropertiesActionsState {
  const { useCases, toast: toastControls } = usePropertiesContext();
  const { showToast } = toastControls;
  const [loading, setLoading] = useState<LoadingState>(DEFAULT_LOADING);
  const [errors, setErrors] = useState<ErrorState>(DEFAULT_ERRORS);

  const setLoadingFor = useCallback((action: ActionKey, value: boolean) => {
    setLoading(prev => ({ ...prev, [action]: value }));
  }, []);

  const setErrorFor = useCallback((action: ActionKey, message: string | null) => {
    setErrors(prev => ({ ...prev, [action]: message }));
  }, []);

  const notifySuccess = useCallback(
    (description: string, title?: string) => {
      showToast({
        variant: "success",
        description,
        title,
      });
    },
    [showToast],
  );

  const notifyError = useCallback(
    (description: string, title = "Ocurrió un error") => {
      showToast({
        variant: "error",
        description,
        title,
      });
    },
    [showToast],
  );

  const execute = useCallback(
    async <T>(
      action: ActionKey,
      runner: () => Promise<Result<T>>,
      messages?: ExecuteMessages,
      options?: ExecuteOptions,
    ): Promise<Result<T>> => {
      setLoadingFor(action, true);
      setErrorFor(action, null);
      try {
        const result = await runner();
        if (result.isOk()) {
          if (messages?.success && !options?.suppressSuccessToast) {
            notifySuccess(messages.success, messages.successTitle);
          }
          return result;
        }
        const message = messages?.error ?? resolveErrorMessage(result.error);
        setErrorFor(action, message);
        if (!options?.suppressErrorToast) {
          notifyError(message, messages?.errorTitle);
        }
        options?.onError?.(result.error, message);
        return result;
      } catch (error) {
        const message = messages?.error ?? resolveErrorMessage(error);
        setErrorFor(action, message);
        if (!options?.suppressErrorToast) {
          notifyError(message, messages?.errorTitle);
        }
        options?.onError?.(error, message);
        return Result.fail(error);
      } finally {
        setLoadingFor(action, false);
      }
    },
    [notifyError, notifySuccess, setErrorFor, setLoadingFor],
  );

  const listProperties = useCallback(
    (filters?: Partial<ListFiltersInput>) =>
      execute("listProperties", () => useCases.listProperties.execute(filters ?? {}), {
        error: "No pudimos cargar tus propiedades.",
      }, { suppressErrorToast: true }),
    [execute, useCases.listProperties],
  );

  const getProperty = useCallback(
    (id: string) =>
      execute("getProperty", () => useCases.getProperty.execute(id), {
        error: "No pudimos cargar la propiedad seleccionada.",
      }),
    [execute, useCases.getProperty],
  );

  const createProperty = useCallback(
    (input: CreatePropertyInput) =>
      execute("createProperty", () => useCases.createProperty.execute(input), {
        success: "Propiedad creada como borrador.",
        successTitle: "Guardado",
        error: "No pudimos crear la propiedad.",
      }),
    [execute, useCases.createProperty],
  );

  const updateProperty = useCallback(
    (input: { id: string; patch: UpdatePropertyInput }) =>
      execute("updateProperty", () => useCases.updateProperty.execute(input), {
        success: "Cambios guardados.",
        successTitle: "Actualizado",
        error: "No pudimos actualizar la propiedad.",
      }),
    [execute, useCases.updateProperty],
  );

  const publishProperty = useCallback(
    (input: PublishPropertyInput) =>
      execute("publishProperty", () => useCases.publishProperty.execute(input), {
        success: "Propiedad publicada.",
        successTitle: "Listo",
        error: "No pudimos publicar la propiedad.",
      }),
    [execute, useCases.publishProperty],
  );

  const pauseProperty = useCallback(
    (input: PausePropertyInput) =>
      execute("pauseProperty", () => useCases.pauseProperty.execute(input), {
        success: "La propiedad regresó a borradores.",
        successTitle: "Actualizado",
        error: "No pudimos pausar la propiedad.",
      }),
    [execute, useCases.pauseProperty],
  );

  const schedulePublish = useCallback(
    (input: SchedulePublishInput) =>
      execute("schedulePublish", () => useCases.schedulePublish.execute(input), {
        success: "Publicación programada.",
        successTitle: "Programado",
        error: "No pudimos programar la publicación.",
      }),
    [execute, useCases.schedulePublish],
  );

  const markSold = useCallback(
    (input: MarkSoldInput) =>
      execute("markSold", () => useCases.markSold.execute(input), {
        success: "Propiedad marcada como vendida.",
        successTitle: "Actualizado",
        error: "No pudimos marcar la propiedad como vendida.",
      }),
    [execute, useCases.markSold],
  );

  const deleteProperty = useCallback(
    (input: DeletePropertyInput) =>
      execute("deleteProperty", () => useCases.deleteProperty.execute(input), {
        success: "Propiedad eliminada.",
        successTitle: "Eliminado",
        error: "No pudimos eliminar la propiedad.",
      }),
    [execute, useCases.deleteProperty],
  );

  const uploadMedia = useCallback(
    (input: UploadMediaInput) =>
      execute("uploadMedia", () => useCases.uploadMedia.execute(input), {
        success: "Archivo subido.",
        successTitle: "Listo",
        error: "No pudimos subir el archivo.",
      }),
    [execute, useCases.uploadMedia],
  );

  const removeMedia = useCallback(
    (input: RemoveMediaInput) =>
      execute("removeMedia", () => useCases.removeMedia.execute(input), {
        success: "Archivo eliminado.",
        successTitle: "Actualizado",
        error: "No pudimos eliminar el archivo.",
      }),
    [execute, useCases.removeMedia],
  );

  const setCoverMedia = useCallback(
    (input: SetCoverMediaInput) =>
      execute("setCoverMedia", () => useCases.setCoverMedia.execute(input), {
        success: "Portada actualizada.",
        successTitle: "Listo",
        error: "No pudimos actualizar la portada.",
      }),
    [execute, useCases.setCoverMedia],
  );

  const reorderMedia = useCallback(
    (input: ReorderMediaInput) =>
      execute("reorderMedia", () => useCases.reorderMedia.execute(input), {
        success: "Orden guardado.",
        successTitle: "Actualizado",
        error: "No pudimos reordenar la galería.",
      }),
    [execute, useCases.reorderMedia],
  );

  const attachDocument = useCallback(
    (input: AttachDocumentInput) =>
      execute("attachDocument", () => useCases.attachDocument.execute(input), {
        success: "Documento adjuntado.",
        successTitle: "Listo",
        error: "No pudimos adjuntar el documento.",
      }),
    [execute, useCases.attachDocument],
  );

  const verifyRpp = useCallback(
    (input: VerifyRppInput) =>
      execute("verifyRpp", () => useCases.verifyRpp.execute(input), {
        success: "Estado de verificación actualizado.",
        successTitle: "Actualizado",
        error: "No pudimos actualizar la verificación.",
      }),
    [execute, useCases.verifyRpp],
  );

  const listDocuments = useCallback(
    (propertyId: string) =>
      execute("listDocuments", () => useCases.listDocuments.execute({ propertyId }), {
        error: "No pudimos cargar los documentos.",
      }),
    [execute, useCases.listDocuments],
  );

  const deleteDocument = useCallback(
    (documentId: string) =>
      execute("deleteDocument", () => useCases.deleteDocument.execute({ documentId }), {
        success: "Documento eliminado.",
        successTitle: "Actualizado",
        error: "No pudimos eliminar el documento.",
      }),
    [execute, useCases.deleteDocument],
  );

  const getAuthProfile = useCallback(
    () =>
      execute("getAuthProfile", () => useCases.getAuthProfile.execute(), {
        error: "No pudimos obtener la información del perfil.",
      }, { suppressErrorToast: true }),
    [execute, useCases.getAuthProfile],
  );

  const clearError = useCallback(
    (action: ActionKey) => {
      setErrorFor(action, null);
    },
    [setErrorFor],
  );

  const clearAllErrors = useCallback(() => {
    setErrors(DEFAULT_ERRORS);
  }, []);

  return useMemo(
    () => ({
      loading,
      errors,
      clearError,
      clearAllErrors,
      listProperties,
      getProperty,
      createProperty,
      updateProperty,
      publishProperty,
      pauseProperty,
      schedulePublish,
      markSold,
      deleteProperty,
      uploadMedia,
      removeMedia,
      setCoverMedia,
      reorderMedia,
      attachDocument,
      verifyRpp,
      listDocuments,
      deleteDocument,
      getAuthProfile,
    }),
    [
      attachDocument,
      clearAllErrors,
      clearError,
      createProperty,
      deleteDocument,
      deleteProperty,
      errors,
      getProperty,
      listDocuments,
      listProperties,
      loading,
      getAuthProfile,
      markSold,
      pauseProperty,
      publishProperty,
      reorderMedia,
      schedulePublish,
      setCoverMedia,
      updateProperty,
      uploadMedia,
      removeMedia,
      verifyRpp,
    ],
  );
}

