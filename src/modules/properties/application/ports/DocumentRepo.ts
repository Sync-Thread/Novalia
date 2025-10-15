import type { AttachDocumentDTO } from "../dto/DocumentDTO";
import type { Result } from "../_shared/result";

export interface DocumentRepo {
  attach(propertyId: string, input: AttachDocumentDTO): Promise<Result<{ id: string }>>;
  verifyRpp(
    propertyId: string,
    docId: string,
    status: "pending" | "verified" | "rejected",
  ): Promise<Result<void>>;
}
