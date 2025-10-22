// src/modules/properties/domain/policies/PublishPolicy.ts
// Gate de publicación: KYC, score mínimo y estado del RPP.

import type { VerificationStatus } from "../enums";
import { MIN_PUBLISH_SCORE } from "./CompletenessPolicy";
import { KycRequiredError } from "../errors/KycRequiredError";
import { PublishBlockedError } from "../errors/PublishBlockedError";
import { RppRejectedError } from "../errors/RppRejectedError";

export type PublishGateInput = {
  kycVerified: boolean;
  score: number;
  rppStatus?: VerificationStatus | null; // pending/verified/rejected
  minScore?: number;                      // override (default: MIN_PUBLISH_SCORE)
  blockIfRppRejected?: boolean;           // default: true
};

export type PublishGateResult = { ok: true } | { ok: false; reasons: string[] };

export function canPublish(input: PublishGateInput): PublishGateResult {
  const reasons: string[] = [];
  const min = input.minScore ?? MIN_PUBLISH_SCORE;

  if (!input.kycVerified) reasons.push("KYC not verified");
  if (input.score < min) reasons.push(`Completeness < ${min}`);
  if ((input.blockIfRppRejected ?? true) && input.rppStatus === "rejected") {
    reasons.push("RPP is rejected");
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}

// Variante que arroja errores de dominio (para usar desde entidades/use-cases).
export function assertPublishable(input: PublishGateInput): void {
  const min = input.minScore ?? MIN_PUBLISH_SCORE;
  if (!input.kycVerified) throw new KycRequiredError();
  if (input.score < min) throw new PublishBlockedError(`Completeness must be ≥ ${min}`, { details: { min, score: input.score } });
  if ((input.blockIfRppRejected ?? true) && input.rppStatus === "rejected") {
    throw new RppRejectedError();
  }
}
