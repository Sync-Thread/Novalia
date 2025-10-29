import type { Result } from "../_shared/result";

export interface Coords {
  lat: number;
  lng: number;
}

export interface AuthProfile {
  name: string | null;
  userId: string;
  orgId: string | null;
  kycStatus: "verified" | "pending" | "rejected";
  userType: "buyer" | "agent" | "owner" | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  roleHint: string | null;
  location: Coords | null;
}

export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
