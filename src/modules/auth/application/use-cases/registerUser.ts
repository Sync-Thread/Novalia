// src/modules/auth/application/use-cases/registerUser.ts

import type { AccountType } from "../../../../shared/types/auth";

export type RegisterDTO = {
  accountType: AccountType;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string | null;

  // agent
  belongs_to_org?: boolean;
  org_code?: string | null;

  // owner
  org_name?: string | null;
};

export type RegisterPorts = {
  signUp: (input: { email: string; password: string; metadata: { full_name: string; first_name: string; last_name: string; phone?: string | null; accountType: AccountType } }) => Promise<{ userId: string }>;
  updateProfile: (userId: string, data: { full_name: string; email: string; phone?: string | null; role: AccountType }) => Promise<void>;
  joinOrgByCode: (orgCode: string) => Promise<{ org_id: string }>;
  createOrganization: (name: string, ownerUserId: string) => Promise<{ org_id: string; org_code: string }>;
  linkUserOrgRole: (userId: string, orgId: string, role: "owner" | "agent") => Promise<void>;
  validateBootstrap: (userId: string, ctx: { accountType: AccountType; flow: "email" | "oauth"; expectedOrgId?: string | null; expectedOrgCode?: string | null; expectMembership?: boolean }) => Promise<void>;
};

export async function registerUser(dto: RegisterDTO, ports: RegisterPorts) {
  const firstName = dto.first_name.trim();
  const lastName = dto.last_name.trim();
  const full_name = `${firstName} ${lastName}`.trim();

  const { userId } = await ports.signUp({
    email: dto.email.trim(),
    password: dto.password,
    metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name,
      phone: dto.phone ?? null,
      accountType: dto.accountType,
    },
  });

  try {
    await ports.updateProfile(userId, {
      full_name,
      email: dto.email.trim(),
      phone: dto.phone ?? null,
      role: dto.accountType,
    });
  } catch (err) {
    console.warn("[register] profile update fallback to trigger metadata", err);
  }

  if (dto.accountType === "buyer") {
    try {
      await ports.validateBootstrap(userId, { accountType: "buyer", flow: "email" });
    } catch (err) {
      console.warn("[register] validation failed for buyer", err);
    }
    return { userId };
  }

  if (dto.accountType === "agent") {
    let joinedOrgId: string | null = null;

    if (dto.belongs_to_org && dto.org_code) {
      const { org_id } = await ports.joinOrgByCode(dto.org_code);
      joinedOrgId = org_id;
      await ports.linkUserOrgRole(userId, org_id, "agent");
    }

    try {
      await ports.validateBootstrap(userId, {
        accountType: "agent",
        flow: "email",
        expectedOrgId: joinedOrgId,
        expectedOrgCode: dto.org_code ?? null,
        expectMembership: !!joinedOrgId,
      });
    } catch (err) {
      console.warn("[register] validation failed for agent", err);
    }

    return { userId };
  }

  // owner
  if (!dto.org_name || dto.org_name.trim().length < 3) {
    throw new Error("El nombre de la organizacion es requerido.");
  }

  const { org_id, org_code } = await ports.createOrganization(dto.org_name.trim(), userId);
  await ports.linkUserOrgRole(userId, org_id, "owner");

  try {
    await ports.validateBootstrap(userId, {
      accountType: "owner",
      flow: "email",
      expectedOrgId: org_id,
      expectedOrgCode: org_code,
      expectMembership: true,
    });
  } catch (err) {
    console.warn("[register] validation failed for owner", err);
  }

  return { userId, org_id, org_code };
}
