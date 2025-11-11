import { z } from "zod";
import { THREAD_AUDIENCE } from "../../domain/enums";

export const threadFiltersSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  unreadOnly: z.boolean().optional(),
  search: z.string().trim().optional().nullable(),
  perspective: z.enum([THREAD_AUDIENCE.Lister, THREAD_AUDIENCE.Client] as [string, string]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
});

export type ThreadFiltersSchema = z.infer<typeof threadFiltersSchema>;
