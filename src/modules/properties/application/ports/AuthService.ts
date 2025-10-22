import type { Result } from "../_shared/result";
// import type {Coords} from "../../application/dto/CoordsDTO";
import type { Coords } from "../../UI/utils/geolocation";

export interface AuthProfile {
  userId: string;
  orgId: string | null;
  kycStatus: "verified" | "pending" | "rejected";
  fullName: string | null;
  email: string | null;
  phone: string | null;
  roleHint: string | null;
  location: Coords | null;
}

export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
