import { z } from "zod";

export const publicListFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  propertyType: z.string().trim().max(40).optional(),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
  bedroomsMin: z.number().int().min(0).optional(),
  bathroomsMin: z.number().min(0).optional(),
  parkingSpotsMin: z.number().int().min(0).optional(),
  levelsMin: z.number().int().min(0).optional(),
  areaMin: z.number().int().min(0).optional(),
  areaMax: z.number().int().min(0).optional(),
  sortBy: z.enum(["recent", "price_asc", "price_desc"] as const).default("recent"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(60).default(12),
}).refine(
  (filters) => {
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      return filters.priceMin <= filters.priceMax;
    }
    return true;
  },
  {
    message: "El rango de precios es invalido.",
    path: ["priceMax"],
  },
).refine(
  (filters) => {
    if (filters.areaMin !== undefined && filters.areaMax !== undefined) {
      return filters.areaMin <= filters.areaMax;
    }
    return true;
  },
  {
    message: "El rango de metros cuadrados es invalido.",
    path: ["areaMax"],
  },
);

export type PublicListFiltersInput = z.infer<typeof publicListFiltersSchema>;
