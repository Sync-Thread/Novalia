import type { PropertyDTO } from "../../../application/dto/PropertyDTO";
import type { DocumentDTO } from "../../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../../application/ports/AuthService";
import { STATUS_BADGE, type VerificationState, type ChecklistState } from "./constants";

export function computeChecklist(
  property: PropertyDTO | null,
  docs: DocumentDTO[],
  profile: AuthProfile | null,
): ChecklistState {
  const kycOk = (profile?.kycStatus ?? "pending") === "verified";
  const completenessOk = (property?.completenessScore ?? 0) >= 80;
  const rppDoc = docs.find((doc) => doc.docType === "rpp_certificate") ?? null;
  const rppOk = Boolean(rppDoc && rppDoc.verification !== "rejected");
  const priceDefined = Boolean(property?.price && Number(property.price.amount) > 0);
  const typeDefined = Boolean(property?.propertyType);
  const locationDefined = Boolean(property?.address?.city && property?.address?.state);
  const coreOk = priceDefined && typeDefined && locationDefined;
  return { kycOk, completenessOk, rppOk, coreOk };
}

export function getStatusTone(status: PropertyDTO["status"]): "success" | "warning" | "neutral" {
  return STATUS_BADGE[status] ?? "neutral";
}

export function getBadgeClass(tone: "success" | "warning" | "neutral" | "danger"): string {
  switch (tone) {
    case "success":
      return "badge badge-success";
    case "warning":
      return "badge badge-warning";
    case "danger":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export function deriveRppStatus(docs: DocumentDTO[], verification?: VerificationState | null): VerificationState {
  if (verification) return verification;
  const doc = docs.find((item) => item.docType === "rpp_certificate");
  return doc?.verification ?? "pending";
}
