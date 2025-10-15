import { attachDocumentSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import { Result } from "../../_shared/result";

export class AttachDocument {
  private readonly documents: DocumentRepo;
  private readonly properties: PropertyRepo;

  constructor(deps: { documents: DocumentRepo; properties: PropertyRepo }) {
    this.documents = deps.documents;
    this.properties = deps.properties;
  }

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const parsed = attachDocumentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const propertyResult = await this.properties.getById(parsed.data.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const attachResult = await this.documents.attach(parsed.data.propertyId, {
      docType: parsed.data.docType,
      url: parsed.data.url ?? null,
      s3Key: parsed.data.s3Key ?? null,
      metadata: parsed.data.metadata,
    });

    if (attachResult.isErr()) {
      return Result.fail(attachResult.error);
    }

    return Result.ok(attachResult.value);
  }
}
