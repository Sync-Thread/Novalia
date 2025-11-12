export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export const DEFAULT_PAGE_SIZE = 20;

export function buildPage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.max(1, pageSize);
  const hasMore = normalizedPage * normalizedPageSize < total;
  return {
    items,
    total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    hasMore,
  };
}
