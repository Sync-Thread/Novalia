import type { DocumentRepo } from "../ports/DocumentRepo";
import type { AttachDocumentDTO, DocumentDTO } from "../dto/DocumentDTO";
import { Result } from "../_shared/result";
import { generateId } from "../_shared/id";

export class InMemoryDocumentRepo implements DocumentRepo {
  private readonly documents: DocumentDTO[] = [];

  constructor(seed: DocumentDTO[] = []) {
    this.documents = seed.map(doc => ({ ...doc }));
  }

  async attach(propertyId: string, input: AttachDocumentDTO): Promise<Result<{ id: string }>> {
    const id = generateId();
    const now = new Date().toISOString();
    this.documents.push({
      id,
      propertyId,
      docType: input.docType,
      url: input.url ?? null,
      s3Key: input.s3Key ?? null,
      verification: "pending",
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? null,
    });
    return Result.ok({ id });
  }

  async verifyRpp(
    propertyId: string,
    docId: string,
    status: "pending" | "verified" | "rejected",
  ): Promise<Result<void>> {
    const document = this.documents.find(doc => doc.id === docId && doc.propertyId === propertyId);
    if (!document) {
      return Result.fail(new Error("Document not found"));
    }
    document.verification = status;
    document.updatedAt = new Date().toISOString();
    return Result.ok(undefined);
  }
}
