// Caso de uso: creación de propiedades desde application.
// No tocar las reglas de dominio.
import { createPropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { CreatePropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";
import { generateId } from "../../_shared/id";

type CreateContext = {
  id: string;
  orgId: string;
  userId: string;
  nowIso: string;
};

type ParsedCreate = ReturnType<typeof createPropertySchema.parse>;

export class CreateProperty {
  constructor(
    private readonly deps: { repo: PropertyRepo; auth: AuthService; clock: Clock },
  ) {}

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const parsedInput = parseWith(createPropertySchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }

    const { orgId, userId } = authResult.value;
    const scopedOrgId = orgId ?? userId;
    const nowIso = this.deps.clock.now().toISOString();
    const context: CreateContext = { id: generateId(), orgId: scopedOrgId, userId, nowIso };

    const dto = buildCreateDto(parsedInput.value, context);
    const entity = toDomain(dto, { clock: this.deps.clock });
    entity.computeCompleteness({ mediaCount: 0, documentCount: 0 });

    const repoResult = await this.deps.repo.create(fromDomain(entity));
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return Result.ok({ id: repoResult.value.id });
  }
}

function buildCreateDto(input: ParsedCreate, ctx: CreateContext): CreatePropertyDTO {
  return {
    id: ctx.id,
    orgId: ctx.orgId,
    listerUserId: ctx.userId,
    status: "draft",
    publishedAt: null,
    soldAt: null,
    title: input.title,
    description: input.description ?? null,
    price: input.price,
    propertyType: input.propertyType,
    operationType: input.operationType ?? "sale",
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    parkingSpots: input.parkingSpots ?? null,
    constructionM2: input.constructionM2 ?? null,
    landM2: input.landM2 ?? null,
    levels: input.levels ?? null,
    yearBuilt: input.yearBuilt ?? null,
    floor: input.floor ?? null,
    hoaFee: input.hoaFee ?? null,
    condition: input.condition ?? null,
    furnished: input.furnished ?? null,
    petFriendly: input.petFriendly ?? null,
    orientation: input.orientation ?? null,
    amenities: input.amenities ?? [],
    amenitiesExtra: input.amenitiesExtra ?? null,
    address: input.address,
    location: input.location ?? null,
    tags: input.tags ?? [],
    internalId: input.internalId ?? null,
    rppVerification: input.rppVerification ?? "pending",
    completenessScore: 0,
    normalizedStatus: input.normalizedStatus ?? null,
    trustScore: null,
    deletedAt: null,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };
}
