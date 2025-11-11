import type { PaginationInput } from "./PaginationDTO";
import type { ThreadAudience } from "../../domain/enums";

export type ThreadFiltersDTO = PaginationInput & {
  propertyId?: string | null;
  contactId?: string | null;
  unreadOnly?: boolean;
  search?: string | null;
  perspective?: ThreadAudience;
};
