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
  signUp: (email: string, password: string) => Promise<{ userId: string }>;
  updateProfile: (userId: string, data: { full_name: string; email: string; phone?: string | null; role: AccountType }) => Promise<void>;
  joinOrgByCode: (orgCode: string) => Promise<{ org_id: string }>;
  createOrganization: (name: string, ownerUserId: string) => Promise<{ org_id: string; org_code: string }>;
  linkUserOrgRole: (userId: string, orgId: string, role: "owner"|"agent") => Promise<void>;
};

export async function registerUser(dto: RegisterDTO, ports: RegisterPorts) {
  const { userId } = await ports.signUp(dto.email.trim(), dto.password);

  const full_name = `${dto.first_name.trim()} ${dto.last_name.trim()}`.trim();
  await ports.updateProfile(userId, {
    full_name,
    email: dto.email.trim(),
    phone: dto.phone ?? null,
    role: dto.accountType,
  });

  if (dto.accountType === "buyer") {
    return { userId };
  }

  if (dto.accountType === "agent") {
    if (dto.belongs_to_org && dto.org_code) {
      const { org_id } = await ports.joinOrgByCode(dto.org_code);
      await ports.linkUserOrgRole(userId, org_id, "agent");
    }
    return { userId };
  }

  // owner
  if (!dto.org_name || dto.org_name.trim().length < 3) {
    throw new Error("El nombre de la organización es requerido.");
  }
  const { org_id, org_code } = await ports.createOrganization(dto.org_name.trim(), userId);
  await ports.linkUserOrgRole(userId, org_id, "owner");
  return { userId, org_id, org_code };
}
