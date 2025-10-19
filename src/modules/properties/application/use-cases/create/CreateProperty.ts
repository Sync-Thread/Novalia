import { createPropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import type { CreatePropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";
import { generateId } from "../../_shared/id";

export class CreateProperty {
  private readonly repo: PropertyRepo;
  private readonly auth: AuthService;
  private readonly clock: Clock;

  private static readonly ORG_MISSING_ERROR = {
    scope: "auth",
    code: "ORG_MISSING",
    message: "Debe existir una organización asignada antes de crear una propiedad.",
  } as const;

  constructor(deps: { repo: PropertyRepo; auth: AuthService; clock: Clock }) {
    this.repo = deps.repo;
    this.auth = deps.auth;
    this.clock = deps.clock;
  }

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const parsed = createPropertySchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }

    const { orgId, userId } = authResult.value;
    const now = this.clock.now();
    const id = generateId();

    const dto: CreatePropertyDTO = {
      id,
      orgId,
      listerUserId: userId,
      status: "draft",
      publishedAt: null,
      soldAt: null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      propertyType: parsed.data.propertyType,
      operationType: parsed.data.operationType ?? "sale",
      bedrooms: parsed.data.bedrooms ?? null,
      bathrooms: parsed.data.bathrooms ?? null,
      parkingSpots: parsed.data.parkingSpots ?? null,
      constructionM2: parsed.data.constructionM2 ?? null,
      landM2: parsed.data.landM2 ?? null,
      levels: parsed.data.levels ?? null,
      yearBuilt: parsed.data.yearBuilt ?? null,
      floor: parsed.data.floor ?? null,
      hoaFee: parsed.data.hoaFee ?? null,
      condition: parsed.data.condition ?? null,
      furnished: parsed.data.furnished ?? null,
      petFriendly: parsed.data.petFriendly ?? null,
      orientation: parsed.data.orientation ?? null,
      amenities: parsed.data.amenities ?? [],
      amenitiesExtra: parsed.data.amenitiesExtra ?? null,
      address: parsed.data.address,
      location: parsed.data.location ?? null,
      tags: parsed.data.tags ?? [],
      internalId: parsed.data.internalId ?? null,
      rppVerification: parsed.data.rppVerification ?? "pending",
      completenessScore: 0,
      normalizedStatus: parsed.data.normalizedStatus ?? null,
      trustScore: null,
      deletedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const entity = toDomain(dto, { clock: this.clock });
    entity.computeCompleteness({ mediaCount: 0, hasRppDoc: false });
    const ready = fromDomain(entity);

    const repoResult = await this.repo.create(ready);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return Result.ok({ id: repoResult.value.id });
  }
}
