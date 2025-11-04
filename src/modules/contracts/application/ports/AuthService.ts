// Port: Servicio de autenticación para el módulo de contracts
import { Result } from "../../../properties/application/_shared/result";

export interface AuthProfile {
  userId: string;
  orgId: string | null;
  email: string | null;
}

export interface AuthService {
  /**
   * Obtiene el perfil del usuario autenticado actual
   */
  getCurrent(): Promise<Result<AuthProfile>>;
}
