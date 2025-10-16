import { z } from "zod";

import { propertyIdSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { DocumentDTO } from "../../dto/DocumentDTO";
import { Result } from "../../_shared/result";

const listDocumentsSchema = z.object({
  propertyId: propertyIdSchema,
});

export class ListPropertyDocuments {
  private readonly documents: DocumentRepo;

  constructor(deps: { documents: DocumentRepo }) {
    this.documents = deps.documents;
  }

  async execute(rawInput: unknown): Promise<Result<DocumentDTO[]>> {
    const parsed = listDocumentsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const result = await this.documents.listByProperty(parsed.data.propertyId);
    if (result.isErr()) {
      return Result.fail(result.error);
    }

    return Result.ok(result.value);
  }
}

