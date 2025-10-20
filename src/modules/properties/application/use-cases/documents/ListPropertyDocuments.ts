// Caso de uso: listar documentos ligados a una propiedad.
// Devuelve DTOs sin modificar.
import { z } from "zod";
import { propertyIdSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { DocumentDTO } from "../../dto/DocumentDTO";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

const listDocumentsSchema = z.object({ propertyId: propertyIdSchema });

export class ListPropertyDocuments {
  constructor(private readonly deps: { documents: DocumentRepo }) {}

  async execute(rawInput: unknown): Promise<Result<DocumentDTO[]>> {
    const parsedInput = parseWith(listDocumentsSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const result = await this.deps.documents.listByProperty(parsedInput.value.propertyId);
    return result.isErr() ? Result.fail(result.error) : Result.ok(result.value);
  }
}
