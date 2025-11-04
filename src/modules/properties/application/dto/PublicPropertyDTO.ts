import type { PriceDTO, Page } from "./PropertyDTO";

export interface PublicPropertySummaryDTO {
  id: string;
  title: string;
  description?: string | null;
  price: PriceDTO;
  propertyType?: string | null;
  neighborhood?: string | null;
  city: string | null;
  state: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  constructionSizeM2?: number | null;
  landSizeM2?: number | null;
  parkingSpots?: number | null;
  levels?: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

export type PublicPropertyPage = Page<PublicPropertySummaryDTO>;

export interface PublicPropertyListFiltersDTO {
  q?: string;
  city?: string;
  state?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bathroomsMin?: number;
  parkingSpotsMin?: number;
  levelsMin?: number;
  areaMin?: number;
  areaMax?: number;
  sortBy?: "recent" | "price_asc" | "price_desc";
  page: number;
  pageSize: number;
}
