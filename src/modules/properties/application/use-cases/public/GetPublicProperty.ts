// Caso de uso: obtener el detalle de una propiedad pública por ID.
// No requiere autenticación, solo propiedades publicadas.
import { propertyIdSchema } from "../../validators/property.schema";
import type { PublicPropertyRepo } from "../../ports/PublicPropertyRepo";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { PropertyDTO } from "../../dto/PropertyDTO";

export class GetPublicProperty {
  private readonly repo: PublicPropertyRepo;

  constructor(deps: { repo: PublicPropertyRepo }) {
    this.repo = deps.repo;
  }

  async execute(rawId: string): Promise<Result<PropertyDTO>> {
    const idResult = parseWith(propertyIdSchema, rawId);
    if (idResult.isErr()) {
      return Result.fail(idResult.error);
    }

    const propertyId = idResult.value;
    const repoResult = await this.repo.getPublishedById(propertyId);
    
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return Result.ok(repoResult.value);
  }
}
