import { z } from "zod";

export const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "El mensaje supera el máximo de 2000 caracteres"),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
