import { z } from "zod";

export const publicListFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  sortBy: z.enum(["recent", "price_asc", "price_desc"] as const).default("recent"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(60).default(12),
});

export type PublicListFiltersInput = z.infer<typeof publicListFiltersSchema>;
