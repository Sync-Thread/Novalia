import { verifyRppSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { toDomain, fromDomain } from "../../mappers/property.mapper";
import { VERIFICATION_STATUS } from "../../../domain/enums";

export class VerifyRpp {
  private readonly documents: DocumentRepo;
  private readonly properties: PropertyRepo;
  private readonly clock: Clock;

  constructor(deps: { documents: DocumentRepo; properties: PropertyRepo; clock: Clock }) {
    this.documents = deps.documents;
    this.properties = deps.properties;
    this.clock = deps.clock;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = verifyRppSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const verifyResult = await this.documents.verifyRpp(
      parsed.data.propertyId,
      parsed.data.docId,
      parsed.data.status,
    );
    if (verifyResult.isErr()) {
      return Result.fail(verifyResult.error);
    }

    const propertyResult = await this.properties.getById(parsed.data.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    try {
      const entity = toDomain(propertyResult.value, { clock: this.clock });
      const status =
        parsed.data.status === "verified"
          ? VERIFICATION_STATUS.Verified
          : parsed.data.status === "rejected"
            ? VERIFICATION_STATUS.Rejected
            : VERIFICATION_STATUS.Pending;
      entity.setRppStatus(status);
      const dto = fromDomain(entity);
      const updateResult = await this.properties.update(entity.id.toString(), {
        rppVerification: dto.rppVerification ?? "pending",
      });
      if (updateResult.isErr()) {
        return Result.fail(updateResult.error);
      }
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error);
    }
  }
}
