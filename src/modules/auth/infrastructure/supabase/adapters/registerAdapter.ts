// src/modules/auth/infrastructure/supabase/adapters/registerAdapter.ts
import { supabase } from "../../../../../core/supabase/client";
import type { AccountType } from "../../../../../shared/types/auth";
import { normalizeAccountType } from "../../../utils/accountType";

function asEmailInUseError() {
  const e: any = new Error("EMAIL_IN_USE");
  e.code = "EMAIL_IN_USE";
  return e;
}

type RegistrationValidationContext = {
  accountType: AccountType;
  flow: "email" | "oauth";
  expectedOrgId?: string | null;
  expectedOrgCode?: string | null;
  expectMembership?: boolean;
};

const TABLE_EXPECTATIONS: Record<AccountType, string[]> = {
  buyer: ["public.profiles"],
  agent: ["public.profiles", "public.user_org_roles"],
  owner: ["public.profiles", "public.organizations", "public.user_org_roles"],
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProfileWithRetry(userId: string, maxAttempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, org_id, role_hint")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      lastError = error;
      console.warn(`[register][validate] profiles attempt ${attempt} failed`, error);
    } else if (data) {
      return { profile: data };
    }

    await sleep(250);
  }

  return { profile: null, error: lastError };
}

async function fetchMemberships(userId: string) {
  const { data, error } = await supabase
    .from("user_org_roles")
    .select("org_id, role:roles(code)")
    .eq("user_id", userId);

  if (error) {
    console.warn("[register][validate] user_org_roles query failed", error);
    return { memberships: null, error };
  }

  return { memberships: data ?? [] };
}

async function fetchOrganization(orgId: string | null | undefined) {
  if (!orgId) return { organization: null, error: null };

  const { data, error } = await supabase
    .from("organizations")
    .select("id, org_code, name")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    console.warn("[register][validate] organizations query failed", error);
    return { organization: null, error };
  }

  return { organization: data ?? null };
}

export const registerAdapter = {
  /** Alta de credenciales; PRE-CHECK en DB evita duplicados. */
  async signUp({
    email,
    password,
    metadata,
  }: {
    email: string;
    password: string;
    metadata: { full_name: string; first_name: string; last_name: string; phone?: string | null; accountType: AccountType };
  }) {
    // 1) Pre-chequeo en DB (server-side)
    try {
      const { data: available, error: rpcErr } = await supabase.rpc("email_available", { p_email: email });
      if (rpcErr) {
        // Si el RPC falla por cualquier motivo, seguimos, pero registramos en consola
        console.warn("[email_available] RPC error:", rpcErr);
      } else if (available === false) {
        throw asEmailInUseError();
      }
    } catch (err) {
      // Si el catch es por EMAIL_IN_USE, propágalo; si no, continúa al signUp
      if ((err as any)?.code === "EMAIL_IN_USE") throw err;
      console.warn("[email_available] unexpected:", err);
    }

    // 2) Alta en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          phone: metadata.phone ?? null,
          account_type: metadata.accountType,
        },
      },
    });

    // 3) Normaliza mensajes de Supabase a nuestro código canónico
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const looksLikeDup =
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate") ||
        msg.includes("user already") ||
        msg.includes("email address is already registered");

      if (looksLikeDup) throw asEmailInUseError();
      throw error;
    }

    const userId = data.user?.id;
    if (!userId) throw new Error("No se obtuvo userId");
    return { userId };
  },

  async updateProfile(userId: string, data: { full_name: string; email: string; phone?: string | null; role: AccountType }) {
    const role_hint = data.role; // "buyer" | "agent" | "owner"
    const payload = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      role_hint,
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data: updatedRows, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select("id");

      if (error) {
        console.warn(`[register] profile update attempt ${attempt} failed`, error);
        if (attempt === 3) throw error;
      } else if (updatedRows && updatedRows.length > 0) {
        if (attempt > 1) {
          console.info("[register] profile update succeeded after retry", { attempt, userId });
        }
        return;
      }

      await sleep(200);
    }

    console.warn("[register] profile update skipped after retries", { userId, payload });
  },

  async joinOrgByCode(orgCode: string) {
    const { data, error } = await supabase.rpc("join_org_by_code", { p_org_code: orgCode });
    if (error) throw error;
    const org_id = data as string | null;
    if (!org_id) throw new Error("Código de organización inválido.");
    return { org_id };
  },

  async createOrganization(name: string, ownerUserId: string) {
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, owner_user_id: ownerUserId })
      .select("id, org_code")
      .single();
    if (error) throw error;
    return { org_id: data.id as string, org_code: data.org_code as string };
  },

  async linkUserOrgRole(userId: string, orgId: string, role: "owner" | "agent") {
    const roleCode = role === "owner" ? "org_admin" : "agent";
    const { data: roleRow, error: roleErr } = await supabase.from("roles").select("id").eq("code", roleCode).single();
    if (roleErr) throw roleErr;

    const { error: membershipError } = await supabase
      .from("user_org_roles")
      .insert({ user_id: userId, org_id: orgId, role_id: roleRow!.id });
    if (membershipError) throw membershipError;

    const { data: profileRows, error: profileErr } = await supabase
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", userId)
      .select("id");

    if (profileErr) throw profileErr;
    if (!profileRows || profileRows.length === 0) {
      console.warn("[register] profile org update touched 0 rows", { userId, orgId });
    }
  },

  async validateBootstrap(userId: string, ctx: RegistrationValidationContext) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn("[register][validate] failed to resolve session context", sessionError);
      }

      if (!sessionData?.session) {
        console.info("[register][validate] skipped validation (no active session)", {
          userId,
          accountType: ctx.accountType,
          flow: ctx.flow,
        });
        return;
      }

      const { profile, error: profileError } = await fetchProfileWithRetry(userId);
      const { memberships, error: membershipError } = await fetchMemberships(userId);
      const { organization, error: orgError } = await fetchOrganization(ctx.expectedOrgId ?? profile?.org_id ?? null);

      const summary = {
        userId,
        flow: ctx.flow,
        accountType: ctx.accountType,
        expectations: {
          expectMembership: ctx.expectMembership ?? false,
          expectedOrgId: ctx.expectedOrgId ?? null,
          expectedOrgCode: ctx.expectedOrgCode ?? null,
          expectedTables: TABLE_EXPECTATIONS[ctx.accountType],
        },
        profile: profile
          ? {
              exists: true,
              email: (profile as any).email ?? null,
              org_id: (profile as any).org_id ?? null,
              role_hint: (profile as any).role_hint ?? null,
            }
          : {
              exists: false,
              error: profileError ? (profileError as any).message ?? profileError : "not_found",
            },
        memberships: memberships
          ? {
              count: memberships.length,
              rows: memberships.map((m: any) => ({
                org_id: m.org_id ?? null,
                role: m.role?.code ?? null,
              })),
            }
          : {
              count: 0,
              error: membershipError ? (membershipError as any).message ?? membershipError : null,
            },
        organization: organization
          ? {
              exists: true,
              id: (organization as any).id ?? null,
              org_code: (organization as any).org_code ?? null,
              name: (organization as any).name ?? null,
            }
          : {
              exists: false,
              error: orgError ? (orgError as any).message ?? orgError : null,
            },
      };

      const expectationsMet =
        (!!summary.profile && summary.profile.exists) &&
        (!ctx.expectMembership || (summary.memberships && summary.memberships.count > 0)) &&
        (!ctx.expectedOrgId || summary.organization.exists);

      if (!expectationsMet) {
        console.warn("[register][validate] Registration validation did not meet expectations", summary);
      } else {
        console.info("[register][validate] Registration validation ok", summary);
      }
    } catch (err) {
      console.error("[register][validate] Unexpected validation failure", err);
    }
  },

  async persistUserType(userId: string, type: AccountType) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role_hint: type })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { account_type: type },
    });

    if (authError) {
      throw authError;
    }
  },

  async resolveAccountType(userId: string): Promise<AccountType | null> {
    try {
      const { data } = await supabase.auth.getUser();
      const sessionUser = data?.user ?? null;
      if (sessionUser && sessionUser.id === userId) {
        const metaType = normalizeAccountType(sessionUser.user_metadata?.account_type);
        if (metaType) {
          return metaType;
        }
      }
    } catch (error) {
      console.warn("[register] resolveAccountType getUser failed", error);
    }

    const { profile } = await fetchProfileWithRetry(userId, 1);
    if (profile) {
      const profileType = normalizeAccountType((profile as any).role_hint ?? null);
      if (profileType) {
        return profileType;
      }
    }

    return null;
  },
};
