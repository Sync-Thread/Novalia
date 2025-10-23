// Caso de uso: actualizar el estado del documento RPP.
// Ajusta la entidad y persiste la verificación.
import { verifyRppSchema } from "../../validators/property.schema";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain, fromDomain } from "../../mappers/property.mapper";
import { VERIFICATION_STATUS } from "../../../domain/enums";

const STATUS_MAP: Record<string, (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS]> = {
  pending: VERIFICATION_STATUS.Pending,
  verified: VERIFICATION_STATUS.Verified,
  rejected: VERIFICATION_STATUS.Rejected,
};

export class VerifyRpp {
  constructor(
    private readonly deps: { documents: DocumentRepo; properties: PropertyRepo; clock: Clock },
  ) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const payloadResult = parseWith(verifyRppSchema, rawInput);
    if (payloadResult.isErr()) {
      return Result.fail(payloadResult.error);
    }

    const { propertyId, docId, status } = payloadResult.value;

    const verifyResult = await this.deps.documents.verifyRpp(propertyId, docId, status);
    if (verifyResult.isErr()) {
      return Result.fail(verifyResult.error);
    }

    const propertyResult = await this.deps.properties.getById(propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.setRppStatus(STATUS_MAP[status]);

    const dto = fromDomain(entity);
    const updateResult = await this.deps.properties.update(propertyId, {
      rppVerification: dto.rppVerification ?? "pending",
    });

    return updateResult.isErr() ? Result.fail(updateResult.error) : Result.ok(undefined);
  }
}
