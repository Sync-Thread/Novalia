// src/shared/types/auth.ts
export type AccountType = "buyer" | "agent" | "owner";

export type UserRegisterDTO = {
  type: AccountType;
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;

  // condicionales
  org_code?: string | null;  // para agent (opcional)
  org_name?: string | null;  // para owner (requerido en owner)
};
