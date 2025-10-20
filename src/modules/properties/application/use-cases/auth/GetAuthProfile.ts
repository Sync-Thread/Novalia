// Caso de uso: obtener el perfil autenticado.
// Simple wrapper sobre AuthService.
import type { AuthProfile, AuthService } from "../../ports/AuthService";
import { Result } from "../../_shared/result";

export class GetAuthProfile {
  constructor(private readonly auth: AuthService) {}

  async execute(): Promise<Result<AuthProfile>> {
    const profile = await this.auth.getCurrent();
    return profile.isErr() ? Result.fail(profile.error) : Result.ok(profile.value);
  }
}
