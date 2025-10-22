// Caso de uso: eliminar un documento adjunto.
// Estandariza el parse con Result.
import { z } from "zod";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

const deleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export class DeleteDocument {
  constructor(private readonly deps: { documents: DocumentRepo }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(deleteDocumentSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const result = await this.deps.documents.delete(parsedInput.value.documentId);
    return result.isErr() ? Result.fail(result.error) : Result.ok(undefined);
  }
}
