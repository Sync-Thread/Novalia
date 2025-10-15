import type { Result } from "../_shared/result";

export interface AuthProfile {
  userId: string;
  orgId: string;
  kycStatus: "verified" | "pending" | "rejected";
}

export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
