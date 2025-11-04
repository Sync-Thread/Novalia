export interface PublicSearchFilters {
  q: string;
  propertyType: string;
  state: string;
  city: string;
  priceMin?: number | null;
  priceMax?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpots?: number | null;
  levels?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
}

export type PublicAppliedFilters = Partial<{
  q: string;
  propertyType: string;
  state: string;
  city: string;
  priceMin: number;
  priceMax: number;
  bedroomsMin: number;
  bathroomsMin: number;
  parkingSpotsMin: number;
  levelsMin: number;
  areaMin: number;
  areaMax: number;
}>;

export const DEFAULT_PUBLIC_SEARCH_FILTERS: Readonly<PublicSearchFilters> = Object.freeze({
  q: "",
  propertyType: "",
  state: "",
  city: "",
  priceMin: null,
  priceMax: null,
  bedrooms: null,
  bathrooms: null,
  parkingSpots: null,
  levels: null,
  areaMin: null,
  areaMax: null,
});
