// src/modules/auth/infrastructure/supabase/adapters/registerAdapter.ts
import { supabase } from "../../../../../core/supabase/client";
import type { AccountType } from "../../../../../shared/types/auth";

function asEmailInUseError() {
  const e: any = new Error("EMAIL_IN_USE");
  e.code = "EMAIL_IN_USE";
  return e;
}

export const registerAdapter = {
  /** Alta de credenciales; PRE-CHECK en DB evita duplicados. */
  async signUp(email: string, password: string) {
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
    const { data, error } = await supabase.auth.signUp({ email, password });

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
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        role_hint,
      })
      .eq("id", userId);
    if (error) throw error;
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

    const { error } = await supabase
      .from("user_org_roles")
      .insert({ user_id: userId, org_id: orgId, role_id: roleRow!.id });
    if (error) throw error;
  },
};
