// Caso de uso: actualización parcial de propiedades.
// No tocar la lógica de dominio; sólo orquestar validaciones y repositorio.
import { propertyIdSchema, updatePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { UpdatePropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

type ParsedPatch = ReturnType<typeof updatePropertySchema.parse>;
type PropertySnapshot = ReturnType<typeof fromDomain>;

const DIRECT_KEYS: Array<keyof UpdatePropertyDTO> = [
  "title",
  "description",
  "propertyType",
  "operationType",
  "bedrooms",
  "bathrooms",
  "parkingSpots",
  "constructionM2",
  "landM2",
  "levels",
  "yearBuilt",
  "floor",
  "condition",
  "furnished",
  "petFriendly",
  "orientation",
  "amenities",
  "amenitiesExtra",
  "tags",
  "internalId",
  "rppVerification",
  "normalizedStatus",
] as const;

export class UpdateProperty {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(params: { id: string; patch: unknown }): Promise<Result<void>> {
    const idResult = parseWith(propertyIdSchema, params.id);
    if (idResult.isErr()) {
      return Result.fail(idResult.error);
    }

    const patchResult = parseWith(updatePropertySchema, params.patch);
    if (patchResult.isErr()) {
      return Result.fail(patchResult.error);
    }

    const repoResult = await this.deps.repo.getById(idResult.value);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const current = toDomain(repoResult.value, { clock: this.deps.clock });
    const baseSnapshot = fromDomain(current);

    const mergedDto = mergeSnapshot(baseSnapshot, patchResult.value);
    const updatedEntity = toDomain(mergedDto, { clock: this.deps.clock });
    const sanitized = fromDomain(updatedEntity);

    const updatePayload = buildUpdatePayload(patchResult.value, sanitized);
    if (Object.keys(updatePayload).length === 0) {
      return Result.ok(undefined);
    }

    const persistResult = await this.deps.repo.update(baseSnapshot.id, updatePayload);
    if (persistResult.isErr()) {
      return Result.fail(persistResult.error);
    }

    return Result.ok(undefined);
  }
}

function mergeSnapshot(base: PropertySnapshot, patch: ParsedPatch): PropertySnapshot {
  return {
    ...base,
    ...patch,
    price: patch.price ?? base.price,
    hoaFee: patch.hoaFee ?? base.hoaFee,
    address: patch.address ? { ...base.address, ...patch.address } : base.address,
    location: patch.location ?? base.location ?? null,
    amenities: patch.amenities ?? base.amenities,
    tags: patch.tags ?? base.tags,
  };
}

function buildUpdatePayload(patch: ParsedPatch, sanitized: PropertySnapshot): UpdatePropertyDTO {
  const payload: UpdatePropertyDTO = {};

  for (const key of DIRECT_KEYS) {
    if (key in patch) {
      payload[key] = sanitized[key] as never;
    }
  }

  if ("price" in patch) {
    payload.price = sanitized.price;
  }
  if ("hoaFee" in patch) {
    payload.hoaFee = sanitized.hoaFee ?? null;
  }
  if ("address" in patch) {
    payload.address = sanitized.address;
  }
  if ("location" in patch) {
    payload.location = sanitized.location ?? null;
  }

  return payload;
}
