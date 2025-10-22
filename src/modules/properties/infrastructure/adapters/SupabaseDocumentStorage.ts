import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentDTO, DocumentTypeDTO } from "../../application/dto/DocumentDTO";
import type { AuthService } from "../../application/ports/AuthService";
import { Result } from "../../application/_shared/result";

type DocumentErrorCode = "AUTH" | "NOT_FOUND" | "VALIDATION" | "UNKNOWN";

export type DocumentInfraError = {
  scope: "document";
  code: DocumentErrorCode;
  message: string;
  cause?: unknown;
};

function documentError(
  code: DocumentErrorCode,
  message: string,
  cause?: unknown
): DocumentInfraError {
  return { scope: "document", code, message, cause };
}

/**
 * Adaptador de Supabase para DocumentStorage que guarda registros en documents
 */
export class SupabaseDocumentStorage {
  private readonly supabase: SupabaseClient;
  private readonly authService: AuthService;

  constructor(deps: { supabase: SupabaseClient; authService: AuthService }) {
    this.supabase = deps.supabase;
    this.authService = deps.authService;
  }

  /**
   * Inserta un documento después de subirlo a S3
   */
  async insertDocumentFromS3(params: {
    propertyId: string;
    docType: DocumentTypeDTO;
    s3Key: string;
    url: string;
    fileName: string;
    contentType: string;
    size: number;
  }): Promise<Result<DocumentDTO>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(documentError("AUTH", "Not authenticated", authResult.error));
      }
      
      const profile = authResult.value;

      // Insertar en documents
      const { data, error } = await this.supabase
        .from("documents")
        .insert({
        //   org_id: profile.orgId,
          related_type: "property",
          related_id: params.propertyId,
          doc_type: params.docType,
          s3_key: params.s3Key,
          url: params.url,
          verification: "verified", // Documentos verificados por defecto
          metadata: {
            fileName: params.fileName,
            contentType: params.contentType,
            size: params.size,
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        return Result.fail(
          documentError("UNKNOWN", "Failed to insert document", error)
        );
      }

      const documentDTO: DocumentDTO = {
        id: data.id,
        // orgId: data.org_id,
        propertyId: data.related_id,
        docType: data.doc_type,
        url: data.url,
        s3Key: data.s3_key,
        verification: data.verification,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return Result.ok(documentDTO);
    } catch (error) {
      return Result.fail(
        documentError("UNKNOWN", "Unexpected error inserting document", error)
      );
    }
  }

  /**
   * Lista todos los documentos de una propiedad
   */
  async listDocuments(propertyId: string): Promise<Result<DocumentDTO[]>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(documentError("AUTH", "Not authenticated", authResult.error));
      }
      
      // No requerir org_id
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(documentError("AUTH", "No org context available"));
      // }

      const { data, error } = await this.supabase
        .from("documents")
        .select("*")
        .eq("related_type", "property")
        .eq("related_id", propertyId)
        // .eq("org_id", profile.orgId)
        .order("created_at", { ascending: false });

      if (error) {
        return Result.fail(
          documentError("UNKNOWN", "Failed to list documents", error)
        );
      }

      const documentList: DocumentDTO[] = (data ?? []).map((row) => ({
        id: row.id,
        // orgId: row.org_id,
        propertyId: row.related_id,
        docType: row.doc_type,
        url: row.url,
        s3Key: row.s3_key,
        verification: row.verification,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return Result.ok(documentList);
    } catch (error) {
      return Result.fail(
        documentError("UNKNOWN", "Unexpected error listing documents", error)
      );
    }
  }

  /**
   * Elimina un documento
   */
  async remove(propertyId: string, documentId: string): Promise<Result<void>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(documentError("AUTH", "Not authenticated", authResult.error));
      }
      
      // No requerir org_id
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(documentError("AUTH", "No org context available"));
      // }

      const { error } = await this.supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("related_type", "property")
        .eq("related_id", propertyId);
        // .eq("org_id", profile.orgId);

      if (error) {
        return Result.fail(
          documentError("UNKNOWN", "Failed to delete document", error)
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        documentError("UNKNOWN", "Unexpected error removing document", error)
      );
    }
  }
}
