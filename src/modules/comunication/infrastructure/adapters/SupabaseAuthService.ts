import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type { AuthProfile, AuthService } from "../../application/ports/AuthService";

type AuthInfraErrorCode = "SESSION_ERROR" | "NOT_AUTHENTICATED" | "PROFILE_ERROR";

type AuthInfraError = {
  scope: "auth";
  code: AuthInfraErrorCode;
  message: string;
  cause?: unknown;
};

function authError(code: AuthInfraErrorCode, message: string, cause?: unknown): AuthInfraError {
  return { scope: "auth", code, message, cause };
}

function mapPostgrestError(code: AuthInfraErrorCode, error: PostgrestError): AuthInfraError {
  return authError(code, error.message, error);
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getCurrent(): Promise<Result<AuthProfile>> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      return Result.fail(authError("SESSION_ERROR", error.message, error));
    }

    const user = data.session?.user;
    if (!user) {
      return Result.fail(authError("NOT_AUTHENTICATED", "No existe una sesión activa"));
    }

    const { data: profile, error: profileError } = await this.client
      .from("profiles")
      .select("org_id, full_name, email, phone, role_hint")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return Result.fail(mapPostgrestError("PROFILE_ERROR", profileError));
    }

    const payload = profile as {
      org_id: string | null;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      role_hint: string | null;
    } | null;

    return Result.ok({
      userId: user.id,
      orgId: payload?.org_id ?? null,
      fullName: payload?.full_name ?? user.user_metadata?.full_name ?? null,
      email: payload?.email ?? user.email ?? null,
      phone: payload?.phone ?? null,
      role: (payload?.role_hint as AuthProfile["role"]) ?? null,
      contactId: null,
    });
  }
}
