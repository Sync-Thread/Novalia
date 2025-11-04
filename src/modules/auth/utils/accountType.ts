import type { AccountType } from "../../../shared/types/auth";

export function normalizeAccountType(input: unknown): AccountType | null {
  if (typeof input !== "string") return null;
  const normalized = input.toLowerCase();
  if (normalized === "buyer" || normalized === "agent" || normalized === "owner") {
    return normalized as AccountType;
  }
  if (normalized === "org" || normalized === "org_admin" || normalized === "agent_org") {
    return "owner";
  }
  return null;
}
