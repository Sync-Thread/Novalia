import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { AuthProfile, AuthService } from "../../application/ports/AuthService";
import { Result } from "../../application/_shared/result";

type AuthErrorCode = "SESSION_ERROR" | "NOT_AUTHENTICATED" | "PROFILE_ERROR" | "ORG_MISSING" | "NEEDS_USER_TYPE";

export type AuthInfraError = {
  scope: "auth";
  code: AuthErrorCode;
  message: string;
  cause?: unknown;
};

function authError(code: AuthErrorCode, message: string, cause?: unknown): AuthInfraError {
  return { scope: "auth", code, message, cause };
}

function mapPostgrestError(error: PostgrestError, code: AuthErrorCode, message: string): AuthInfraError {
  return authError(code, `${message}: ${error.message}`, error);
}

function mapKycStatus(input: string | null | undefined): AuthProfile["kycStatus"] {
  if (input === "verified") return "verified";
  if (input === "rejected") return "rejected";
  return "pending";
}

function normalizeUserType(input: string | null | undefined): AuthProfile["userType"] {
  if (!input) return null;
  const normalized = input.toLowerCase();
  if (normalized === "buyer" || normalized === "agent" || normalized === "owner") {
    return normalized;
  }
  if (normalized === "org" || normalized === "org_admin" || normalized === "agent_org") {
    return "owner";
  }
  return null;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class SupabaseAuthService implements AuthService {
  private readonly client: SupabaseClient;

  constructor(deps: { client: SupabaseClient }) {
    this.client = deps.client;
  }

  async getCurrent(): Promise<Result<AuthProfile>> {
    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) {
      return Result.fail(authError("SESSION_ERROR", sessionError.message, sessionError));
    }

    const user = sessionData.session?.user;
    if (!user) {
      return Result.fail(authError("NOT_AUTHENTICATED", "No active Supabase session"));
    }

    let profileError: PostgrestError | null = null;
    let profile:
      | {
          org_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role_hint: string | null;
        }
      | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await this.client
        .from("profiles")
        .select("org_id, full_name, email, phone, role_hint")
        .eq("id", user.id)
        .maybeSingle();

      profileError = error ?? null;
      profile = (data as {
        org_id: string | null;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        role_hint: string | null;
      } | null) ?? null;

      if (error || profile) {
        break;
      }

      await wait(200);
    }

    if (profileError) {
      return Result.fail(mapPostgrestError(profileError, "PROFILE_ERROR", "Failed to load profile"));
    }

    if (!profile) {
      return Result.fail(authError("PROFILE_ERROR", "User profile has not been provisioned"));
    }

    const orgId = profile.org_id ?? null;
    const profileUserType = normalizeUserType(profile.role_hint ?? null);
    const metadataUserType = normalizeUserType(
      (user.user_metadata?.account_type as string | null | undefined) ??
        (user.app_metadata?.role as string | null | undefined) ??
        null,
    );
    const userType = profileUserType ?? metadataUserType ?? null;

    if (!userType) {
      return Result.fail(
        authError("NEEDS_USER_TYPE", "Authenticated profile requires user type to continue", {
          userId: user.id,
        }),
      );
    }

    const { data: kycRow, error: kycError } = await this.client
      .from("kyc_verifications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError) {
      return Result.fail(mapPostgrestError(kycError, "PROFILE_ERROR", "Failed to load KYC status"));
    }

    const kycStatus = mapKycStatus((kycRow?.status as string | null) ?? null);

    return Result.ok({
      userId: user.id,
      orgId,
      kycStatus,
      fullName: profile.full_name ?? null,
      email: profile.email ?? user.email ?? null,
      phone: profile.phone ?? null,
      roleHint: profile.role_hint ?? null,
      userType,
    });
  }
}
