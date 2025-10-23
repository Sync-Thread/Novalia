export type SortBy = "recent" | "price_asc" | "price_desc" | "completeness_desc";

export interface ListFiltersDTO {
  q?: string;
  status?: string;
  propertyType?: string;
  city?: string;
  state?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: SortBy;
  page: number;
  pageSize: number;
}
