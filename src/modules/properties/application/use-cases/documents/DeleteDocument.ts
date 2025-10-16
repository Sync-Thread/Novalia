import { z } from "zod";

import type { DocumentRepo } from "../../ports/DocumentRepo";
import { Result } from "../../_shared/result";

const deleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export class DeleteDocument {
  private readonly documents: DocumentRepo;

  constructor(deps: { documents: DocumentRepo }) {
    this.documents = deps.documents;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = deleteDocumentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const result = await this.documents.delete(parsed.data.documentId);
    if (result.isErr()) {
      return Result.fail(result.error);
    }

    return Result.ok(undefined);
  }
}

