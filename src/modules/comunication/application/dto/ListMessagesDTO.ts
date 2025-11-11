import type { PaginationInput } from "./PaginationDTO";

export type ListMessagesInput = PaginationInput & {
  threadId: string;
};
