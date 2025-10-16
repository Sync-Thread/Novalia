import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { DocumentRepo } from "../../application/ports/DocumentRepo";
import type { AttachDocumentDTO } from "../../application/dto/DocumentDTO";
import { Result } from "../../application/_shared/result";
import type { AuthService } from "../../application/ports/AuthService";
import { mapAttachDocumentToInsertPayload, mapVerificationToDb } from "../mappers/document.mappers";

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

  async verifyRpp(
    propertyId: string,
    docId: string,
    status: "pending" | "verified" | "rejected",
  ): Promise<Result<void>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(docError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const dbStatus = mapVerificationToDb(status);
    const { error } = await this.client
      .from("documents")
      .update({ verification: dbStatus })
      .eq("id", docId)
      .eq("related_id", propertyId)
      .eq("related_type", "property")
      .eq("org_id", authResult.value.orgId)
      .select("id")
      .single();

    if (error) {
      return Result.fail(mapPostgrestError(error));
    }

    return Result.ok(undefined);
  }
}
