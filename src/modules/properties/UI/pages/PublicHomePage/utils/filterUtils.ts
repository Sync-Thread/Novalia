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

export interface ActiveExtraFilter {
  key: string;
  label: string;
  value: string;
  clear: () => void;
}

export function getActiveExtraFilters(
  filters: PublicSearchFilters,
  onClear: (patch: Partial<PublicSearchFilters>) => void
): ActiveExtraFilter[] {
  const active: ActiveExtraFilter[] = [];

  if (isFiniteNumber(filters.bedrooms)) {
    active.push({
      key: "bedrooms",
      label: "Recámaras",
      value: `${filters.bedrooms}+`,
      clear: () => onClear({ bedrooms: null }),
    });
  }

  if (isFiniteNumber(filters.bathrooms)) {
    active.push({
      key: "bathrooms",
      label: "Baños",
      value: `${filters.bathrooms}+`,
      clear: () => onClear({ bathrooms: null }),
    });
  }

  if (isFiniteNumber(filters.parkingSpots)) {
    active.push({
      key: "parkingSpots",
      label: "Estac.",
      value: `${filters.parkingSpots}+`,
      clear: () => onClear({ parkingSpots: null }),
    });
  }

  if (isFiniteNumber(filters.levels)) {
    active.push({
      key: "levels",
      label: "Pisos",
      value: `${filters.levels}`,
      clear: () => onClear({ levels: null }),
    });
  }

  const hasAreaMin = isFiniteNumber(filters.areaMin);
  const hasAreaMax = isFiniteNumber(filters.areaMax);

  if (hasAreaMin && hasAreaMax) {
    active.push({
      key: "area",
      label: "Área",
      value: `${filters.areaMin}–${filters.areaMax} m²`,
      clear: () => onClear({ areaMin: null, areaMax: null }),
    });
  } else if (hasAreaMin) {
    active.push({
      key: "areaMin",
      label: "Área min",
      value: `${filters.areaMin} m²`,
      clear: () => onClear({ areaMin: null }),
    });
  } else if (hasAreaMax) {
    active.push({
      key: "areaMax",
      label: "Área máx",
      value: `${filters.areaMax} m²`,
      clear: () => onClear({ areaMax: null }),
    });
  }

  return active;
}
