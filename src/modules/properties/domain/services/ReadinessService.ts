// src/modules/properties/domain/services/ReadinessService.ts
// Checklist "ready to publish" without UI strings.

import type { VerificationStatus } from "../enums";
import { MIN_PUBLISH_SCORE, classify, computeScore } from "../policies/CompletenessPolicy";
import { canPublish } from "../policies/PublishPolicy";

export type ReadinessInputs = {
  hasTitle: boolean;
  hasPropertyType: boolean;
  priceAmount: number;
  hasCity: boolean;
  hasState: boolean;
  hasDescription: boolean;
  hasAmenities: boolean;
  mediaCount: number;
  documentCount: number;

  kycVerified: boolean;
  rppStatus?: VerificationStatus | null;
  minScore?: number;             // default policy
  blockIfRppRejected?: boolean;  // default true
};

export type ReadinessIssueCode =
  | "kyc_missing"
  | "score_below_min"
  | "rpp_rejected"
  | "media_min_missing"
  | "address_incomplete"
  | "required_fields_missing";

export type ReadinessResult = {
  score: number;
  bucket: "red" | "amber" | "green";
  canPublish: boolean;
  issues: ReadinessIssueCode[];
  reasons?: string[];
};

export function buildReadiness(i: ReadinessInputs): ReadinessResult {
  const score = computeScore({
    hasTitle: i.hasTitle,
    hasPropertyType: i.hasPropertyType,
    priceAmount: i.priceAmount,
    hasCity: i.hasCity,
    hasState: i.hasState,
    hasDescription: i.hasDescription,
    hasAmenities: i.hasAmenities,
    mediaCount: i.mediaCount,
    documentCount: i.documentCount,
  });

  const bucket = classify(score);

  const min = i.minScore ?? MIN_PUBLISH_SCORE;
  const gate = canPublish({
    kycVerified: i.kycVerified,
    score,
    rppStatus: i.rppStatus ?? null,
    minScore: min,
    blockIfRppRejected: i.blockIfRppRejected,
  });

  const issues: ReadinessIssueCode[] = [];
  if (!i.kycVerified) issues.push("kyc_missing");
  if (!i.hasCity || !i.hasState) issues.push("address_incomplete");
  if (i.mediaCount < 1) issues.push("media_min_missing");
  if (!i.hasTitle || i.priceAmount <= 0) issues.push("required_fields_missing");
  if (score < min) issues.push("score_below_min");
  if ((i.blockIfRppRejected ?? true) && i.rppStatus === "rejected") issues.push("rpp_rejected");

  return {
    score,
    bucket,
    canPublish: gate.ok,
    issues,
    reasons: gate.ok ? undefined : gate.reasons,
  };
}

