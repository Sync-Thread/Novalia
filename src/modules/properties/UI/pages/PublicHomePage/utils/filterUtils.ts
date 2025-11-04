import type { PublicAppliedFilters, PublicSearchFilters } from "../types";

export function hasActiveFilters(filters: PublicSearchFilters): boolean {
  if (filters.q.trim()) return true;
  if (filters.propertyType) return true;
  if (filters.state) return true;
  if (filters.city) return true;

  const numericFields: (keyof PublicSearchFilters)[] = [
    "priceMin",
    "priceMax",
    "bedrooms",
    "bathrooms",
    "parkingSpots",
    "levels",
    "areaMin",
    "areaMax",
  ];

  return numericFields.some((field) => {
    const value = filters[field];
    return typeof value === "number" && Number.isFinite(value);
  });
}

export function formatPrice(input: number | null | undefined): string {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return "$0";
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(input);
}

export function clampRange(
  min: number | null | undefined,
  max: number | null | undefined,
): { min: number | null; max: number | null } {
  const normalizedMin = Number.isFinite(min ?? NaN) ? (min as number) : null;
  const normalizedMax = Number.isFinite(max ?? NaN) ? (max as number) : null;

  if (normalizedMin === null && normalizedMax === null) {
    return { min: null, max: null };
  }

  if (normalizedMin === null) {
    return { min: null, max: normalizedMax };
  }

  if (normalizedMax === null) {
    return { min: normalizedMin, max: null };
  }

  if (normalizedMin > normalizedMax) {
    return { min: normalizedMax, max: normalizedMin };
  }

  return { min: normalizedMin, max: normalizedMax };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toAppliedFilters(filters: PublicSearchFilters): PublicAppliedFilters {
  const applied: PublicAppliedFilters = {};

  if (filters.propertyType) {
    applied.propertyType = filters.propertyType;
  }
  const normalizedQuery = filters.q?.trim() ?? "";
  if (normalizedQuery) {
    applied.q = normalizedQuery;
  }
  if (filters.state) {
    applied.state = filters.state;
  }
  if (filters.city) {
    applied.city = filters.city;
  }
  if (isFiniteNumber(filters.priceMin)) {
    applied.priceMin = filters.priceMin;
  }
  if (isFiniteNumber(filters.priceMax)) {
    applied.priceMax = filters.priceMax;
  }
  if (isFiniteNumber(filters.bedrooms)) {
    applied.bedroomsMin = filters.bedrooms;
  }
  if (isFiniteNumber(filters.bathrooms)) {
    applied.bathroomsMin = filters.bathrooms;
  }
  if (isFiniteNumber(filters.parkingSpots)) {
    applied.parkingSpotsMin = filters.parkingSpots;
  }
  if (isFiniteNumber(filters.levels)) {
    applied.levelsMin = filters.levels;
  }
  if (isFiniteNumber(filters.areaMin)) {
    applied.areaMin = filters.areaMin;
  }
  if (isFiniteNumber(filters.areaMax)) {
    applied.areaMax = filters.areaMax;
  }

  return applied;
}
