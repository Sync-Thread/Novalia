import { propertyIdSchema, updatePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import type { UpdatePropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

export class UpdateProperty {
  private readonly repo: PropertyRepo;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; clock: Clock }) {
    this.repo = deps.repo;
    this.clock = deps.clock;
  }

  async execute(params: { id: string; patch: unknown }): Promise<Result<void>> {
    const idResult = propertyIdSchema.safeParse(params.id);
    if (!idResult.success) {
      return Result.fail(idResult.error);
    }

    const patchResult = updatePropertySchema.safeParse(params.patch);
    if (!patchResult.success) {
      return Result.fail(patchResult.error);
    }

    const repoResult = await this.repo.getById(idResult.data);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const current = toDomain(repoResult.value, { clock: this.clock });
    const baseDto = fromDomain(current);

    const merged = {
      ...baseDto,
      ...patchResult.data,
      address: patchResult.data.address ? { ...baseDto.address, ...patchResult.data.address } : baseDto.address,
      price: patchResult.data.price ?? baseDto.price,
      hoaFee: patchResult.data.hoaFee ?? baseDto.hoaFee,
      amenities: patchResult.data.amenities ?? baseDto.amenities,
      tags: patchResult.data.tags ?? baseDto.tags,
    };

    const updatedEntity = toDomain(
      {
        ...merged,
        id: baseDto.id,
        orgId: baseDto.orgId,
        listerUserId: baseDto.listerUserId,
        completenessScore: baseDto.completenessScore,
        normalizedStatus: merged.normalizedStatus ?? baseDto.normalizedStatus ?? null,
        trustScore: baseDto.trustScore ?? null,
        createdAt: baseDto.createdAt ?? undefined,
        updatedAt: baseDto.updatedAt ?? undefined,
        publishedAt: baseDto.publishedAt ?? null,
        soldAt: baseDto.soldAt ?? null,
        deletedAt: baseDto.deletedAt ?? null,
      },
      { clock: this.clock },
    );

    const sanitized = fromDomain(updatedEntity);
    const updatePayload: UpdatePropertyDTO = {};
    const patch = patchResult.data;

    if ("title" in patch) updatePayload.title = sanitized.title;
    if ("description" in patch) updatePayload.description = sanitized.description ?? null;
    if ("price" in patch) updatePayload.price = sanitized.price;
    if ("propertyType" in patch) updatePayload.propertyType = sanitized.propertyType;
    if ("operationType" in patch) updatePayload.operationType = sanitized.operationType;
    if ("bedrooms" in patch) updatePayload.bedrooms = sanitized.bedrooms ?? null;
    if ("bathrooms" in patch) updatePayload.bathrooms = sanitized.bathrooms ?? null;
    if ("parkingSpots" in patch) updatePayload.parkingSpots = sanitized.parkingSpots ?? null;
    if ("constructionM2" in patch) updatePayload.constructionM2 = sanitized.constructionM2 ?? null;
    if ("landM2" in patch) updatePayload.landM2 = sanitized.landM2 ?? null;
    if ("levels" in patch) updatePayload.levels = sanitized.levels ?? null;
    if ("yearBuilt" in patch) updatePayload.yearBuilt = sanitized.yearBuilt ?? null;
    if ("floor" in patch) updatePayload.floor = sanitized.floor ?? null;
    if ("hoaFee" in patch) updatePayload.hoaFee = sanitized.hoaFee ?? null;
    if ("condition" in patch) updatePayload.condition = sanitized.condition ?? null;
    if ("furnished" in patch) updatePayload.furnished = sanitized.furnished ?? null;
    if ("petFriendly" in patch) updatePayload.petFriendly = sanitized.petFriendly ?? null;
    if ("orientation" in patch) updatePayload.orientation = sanitized.orientation ?? null;
    if ("amenities" in patch) updatePayload.amenities = sanitized.amenities;
    if ("amenitiesExtra" in patch) updatePayload.amenitiesExtra = sanitized.amenitiesExtra ?? null;
    if ("address" in patch) updatePayload.address = sanitized.address;
    if ("location" in patch) updatePayload.location = sanitized.location ?? null;
    if ("tags" in patch) updatePayload.tags = sanitized.tags;
    if ("internalId" in patch) updatePayload.internalId = sanitized.internalId ?? null;
    if ("rppVerification" in patch) updatePayload.rppVerification = sanitized.rppVerification ?? "pending";
    if ("normalizedStatus" in patch) updatePayload.normalizedStatus = sanitized.normalizedStatus ?? null;

    const updateResult = await this.repo.update(baseDto.id, updatePayload);
    if (updateResult.isErr()) {
      return Result.fail(updateResult.error);
    }

    return Result.ok(undefined);
  }
}
