import { z } from "zod";

import { PROPERTY_TYPE_VALUES } from "../../domain/enums";

export const listFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["draft", "published", "sold", "archived", "all"] as const).optional(),
  propertyType: z.enum([...PROPERTY_TYPE_VALUES] as [string, ...string[]]).optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  sortBy: z.enum(["recent", "price_asc", "price_desc", "completeness_desc"] as const).default("recent"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type ListFiltersInput = z.infer<typeof listFiltersSchema>;
