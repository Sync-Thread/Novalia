import type { Result } from "../_shared/result";

export type AudienceRole = "buyer" | "seller" | "agent" | "admin" | "guest";

export interface AuthProfile {
  userId: string;
  orgId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: AudienceRole | null;
  contactId?: string | null;
}

export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
