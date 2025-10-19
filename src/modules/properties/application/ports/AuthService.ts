import type { Result } from "../_shared/result";

export interface AuthProfile {
  userId: string;
  orgId: string | null;
  kycStatus: "verified" | "pending" | "rejected";
  fullName: string | null;
  email: string | null;
  phone: string | null;
  roleHint: string | null;
}

export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
