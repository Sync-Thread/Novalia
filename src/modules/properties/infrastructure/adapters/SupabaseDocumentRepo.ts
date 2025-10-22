import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { DocumentRepo } from "../../application/ports/DocumentRepo";
import type { AttachDocumentDTO, DocumentDTO } from "../../application/dto/DocumentDTO";
import { Result } from "../../application/_shared/result";
import type { AuthService } from "../../application/ports/AuthService";
import {
  mapAttachDocumentToInsertPayload,
  mapDocumentRowToDTO,
  mapVerificationToDb,
} from "../mappers/document.mappers";
import type { DocumentRow } from "../types/supabase-rows";
import { scopeByContext } from "./scopeByContext";

type DocumentErrorCode = "AUTH" | "NOT_FOUND" | "CONFLICT" | "UNKNOWN";

export type DocumentInfraError = {
  scope: "documents";
  code: DocumentErrorCode;
  message: string;
  cause?: unknown;
};

function docError(code: DocumentErrorCode, message: string, cause?: unknown): DocumentInfraError {
  return { scope: "documents", code, message, cause };
}

function mapPostgrestError(error: PostgrestError): DocumentInfraError {
  if (error.message.includes("duplicate key")) {
    return docError("CONFLICT", error.message, error);
  }
  if (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows")) {
    return docError("NOT_FOUND", "Document not found", error);
  }
  return docError("UNKNOWN", error.message, error);
}

const DOCUMENT_COLUMNS = [
  "id",
  "org_id",
  "related_type",
  "related_id",
  "doc_type",
  "verification",
  "source",
  "hash_sha256",
  "s3_key",
  "url",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

export class SupabaseDocumentRepo implements DocumentRepo {
  private readonly client: SupabaseClient;
  private readonly auth: AuthService;

  constructor(deps: { client: SupabaseClient; auth: AuthService }) {
    this.client = deps.client;
    this.auth = deps.auth;
  }

  async attach(propertyId: string, input: AttachDocumentDTO): Promise<Result<{ id: string }>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(docError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const { orgId } = authResult.value;
    const id = crypto.randomUUID();
    const payload = mapAttachDocumentToInsertPayload({
      id,
      orgId,
      propertyId,
      input,
    });

    const { error } = await this.client.from("documents").insert(payload);
    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok({ id });
  }

  async listByProperty(propertyId: string): Promise<Result<DocumentDTO[]>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(docError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const { orgId, userId } = authResult.value;

    let listQuery = this.client
      .from("documents")
      .select(DOCUMENT_COLUMNS)
      .eq("related_type", "property")
      .eq("related_id", propertyId);

    listQuery = scopeByContext(listQuery, { orgId, userId, listerColumn: null });

    const { data, error } = await listQuery.order("created_at", { ascending: true });

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    try {
      const documents = (data ?? []).map(row =>
        mapDocumentRowToDTO(row as unknown as DocumentRow),
      );
      return Result.ok(documents);
    } catch (cause) {
      return Result.fail(docError("UNKNOWN", "Failed to map document rows", cause));
    }
  }

  async delete(documentId: string): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(docError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const { orgId, userId } = authResult.value;

    let lookupQuery = this.client
      .from("documents")
      .select("related_id")
      .eq("id", documentId)
      .eq("related_type", "property");

    lookupQuery = scopeByContext(lookupQuery, { orgId, userId, listerColumn: null });

    const lookup = await lookupQuery.maybeSingle();

    if (lookup.error) {
      return Result.fail(mapPostgrestError(lookup.error));
    }

    const propertyId = lookup.data?.related_id;
    if (!propertyId) {
      return Result.fail(docError("NOT_FOUND", "Document not found"));
    }

    let deleteQuery = this.client
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("related_type", "property")
      .eq("related_id", propertyId);

    deleteQuery = scopeByContext(deleteQuery, { orgId, userId, listerColumn: null });

    const { error } = await deleteQuery.select("id").single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }

  async verifyRpp(
    propertyId: string,
    docId: string,
    status: "pending" | "verified" | "rejected",
  ): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(docError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const { orgId, userId } = authResult.value;

    const dbStatus = mapVerificationToDb(status);
    let verifyQuery = this.client
      .from("documents")
      .update({ verification: dbStatus })
      .eq("id", docId)
      .eq("related_id", propertyId)
      .eq("related_type", "property");

    verifyQuery = scopeByContext(verifyQuery, { orgId, userId, listerColumn: null });

    const { error } = await verifyQuery.select("id").single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }
}
