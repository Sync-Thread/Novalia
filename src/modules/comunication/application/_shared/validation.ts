import type { ZodSchema } from "zod";
import { Result } from "./result";

export function parseWith<T, Schema extends ZodSchema<T>>(schema: Schema, input: unknown) {
  const parsed = schema.safeParse(input);
  return parsed.success ? Result.ok(parsed.data) : Result.fail(parsed.error);
}

export function assertWith<T, Schema extends ZodSchema<T>>(schema: Schema, input: unknown, label: string) {
  const parsed = schema.safeParse(input);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.fail({ scope: "validation", label, error: parsed.error });
}
