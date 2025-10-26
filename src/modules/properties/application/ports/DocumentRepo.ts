import type { AttachDocumentDTO, DocumentDTO } from "../dto/DocumentDTO";
import type { Result } from "../_shared/result";

export interface DocumentRepo {
  attach(propertyId: string, input: AttachDocumentDTO): Promise<Result<{ id: string }>>;
  listByProperty(propertyId: string): Promise<Result<DocumentDTO[]>>;
  delete(documentId: string): Promise<Result<void>>;
  verifyRpp(
    propertyId: string,
    docId: string,
    status: "pending" | "verified" | "rejected",
  ): Promise<Result<void>>;
  getAllS3Keys(propertyId: string): Promise<Result<string[]>>;
}
