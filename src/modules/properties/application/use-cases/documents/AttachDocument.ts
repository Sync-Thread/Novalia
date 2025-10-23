// Caso de uso: adjuntar un documento a una propiedad.
// Valida el payload y delega en el repositorio de documentos.
import { attachDocumentSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

export class AttachDocument {
  constructor(private readonly deps: { documents: DocumentRepo; properties: PropertyRepo }) {}

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const parsedInput = parseWith(attachDocumentSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.properties.getById(parsedInput.value.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const attachResult = await this.deps.documents.attach(parsedInput.value.propertyId, {
      docType: parsedInput.value.docType,
      url: parsedInput.value.url ?? null,
      s3Key: parsedInput.value.s3Key ?? null,
      metadata: parsedInput.value.metadata,
    });

    return attachResult.isErr() ? Result.fail(attachResult.error) : Result.ok(attachResult.value);
  }
}
