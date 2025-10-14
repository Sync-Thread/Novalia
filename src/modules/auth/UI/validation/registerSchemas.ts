// src/shared/validation/registerSchemas.ts
import { z } from "zod";
import type { AccountType } from "../../../../shared/types/auth";


/** Teléfono E.164 opcional (permite vacío y lo transforma a undefined) */
const phoneE164 = z
  .string()
  .regex(/^\+\d{6,15}$/, "Usa formato E.164, ej. +523311112222")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** Campos base SIN refine (para poder extend después) */
const BaseCore = z.object({
  first_name: z.string().min(2, "Requerido"),
  last_name: z.string().min(2, "Requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  password_confirm: z.string().min(6, "Requerido"),
  phone: phoneE164,
});

/** Extras por tipo (sin refine todavía) */
const AgentExtrasCore = z.object({
  belongs_to_org: z.boolean().default(false),
  org_code: z
    .string()
    .regex(/^[A-Z0-9-]{4,12}$/i, "Código inválido")
    .optional(),
});

const OwnerExtrasCore = z.object({
  org_name: z
    .string()
    .min(3, "Mín. 3 caracteres")
    .max(60, "Máx. 60")
    .trim(),
});

/** Construye el schema final:
 * 1) extiende primero
 * 2) aplica refinements al final (password match y reglas condicionales)
 */
export function getRegisterSchema(type: AccountType) {
  let S = BaseCore;

  if (type === "agent") {
    S = S.extend(AgentExtrasCore.shape).refine(
      (v) => !v.belongs_to_org || !!v.org_code,
      { message: "Código requerido si perteneces a una organización", path: ["org_code"] }
    );
  }

  if (type === "owner") {
    S = S.extend(OwnerExtrasCore.shape);
  }

  // Siempre al final: contraseñas iguales
  S = S.refine((v) => v.password === v.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

  return S;
}

/** Tipos de ayuda (opcionales) */
export type BaseForm = z.infer<typeof BaseCore>;
export type AgentForm = z.infer<typeof BaseCore & typeof AgentExtrasCore>;
export type OwnerForm = z.infer<typeof BaseCore & typeof OwnerExtrasCore>;
