// Adaptador: Servicio de autenticación usando Supabase
import type { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "../../../properties/application/_shared/result";
import type { AuthService, AuthProfile } from "../../application/ports/AuthService";

export class SupabaseAuthService implements AuthService {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getCurrent(): Promise<Result<AuthProfile>> {
    try {
      const { data: sessionData, error: sessionError } =
        await this.client.auth.getSession();

      if (sessionError) {
        return Result.fail({
          code: "SESSION_ERROR",
          message: sessionError.message,
        });
      }

      const user = sessionData.session?.user;
      if (!user) {
        return Result.fail({
          code: "NOT_AUTHENTICATED",
          message: "No active session",
        });
      }

      // Obtener perfil con org_id
      const { data: profile, error: profileError } = await this.client
        .from("profiles")
        .select("org_id, email")
        .eq("id", user.id)
        .single();

      if (profileError) {
        return Result.fail({
          code: "PROFILE_ERROR",
          message: profileError.message,
        });
      }

      return Result.ok({
        userId: user.id,
        orgId: profile?.org_id || null,
        email: profile?.email || user.email || null,
      });
    } catch (error) {
      return Result.fail({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
