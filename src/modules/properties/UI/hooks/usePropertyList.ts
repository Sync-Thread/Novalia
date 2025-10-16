import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropertyDTO, Page } from "../../application/dto/PropertyDTO";
import type { ListFiltersInput } from "../../application/validators/filters.schema";
import { usePropertiesActions } from "./usePropertiesActions";

export type PropertyStatusFilter = "all" | "draft" | "published" | "sold";

export interface PropertyListFilters {
  q?: string;
  status: PropertyStatusFilter;
  propertyType?: string;
  city?: string;
  state?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy: ListFiltersInput["sortBy"];
  page: number;
  pageSize: number;
}

export interface PropertyListState {
  filters: PropertyListFilters;
  items: PropertyDTO[];
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  refresh: (overrides?: Partial<PropertyListFilters>) => Promise<void>;
  setFilters: (
    filters: Partial<PropertyListFilters> | ((prev: PropertyListFilters) => Partial<PropertyListFilters>),
    options?: { keepPage?: boolean },
  ) => void;
  setPage: (page: number) => void;
  cache: Map<string, PropertyDTO>;
  getCachedById: (id: string) => PropertyDTO | null;
}

const INITIAL_FILTERS: PropertyListFilters = {
  status: "all",
  sortBy: "recent",
  page: 1,
  pageSize: 12,
};

function normalizeFilters(filters: PropertyListFilters): Partial<ListFiltersInput> {
  const payload: Partial<ListFiltersInput> = {
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
  };

  const normalizedQ = filters.q?.trim();
  if (normalizedQ) {
    payload.q = normalizedQ;
  }

  if (filters.status && filters.status !== "all") {
    payload.status = filters.status;
  }

  if (filters.propertyType && filters.propertyType !== "all") {
    payload.propertyType = filters.propertyType;
  }

  if (filters.city?.trim()) {
    payload.city = filters.city.trim();
  }

  if (filters.state?.trim()) {
    payload.state = filters.state.trim();
  }

  if (typeof filters.priceMin === "number") {
    payload.priceMin = filters.priceMin;
  }

  if (typeof filters.priceMax === "number") {
    payload.priceMax = filters.priceMax;
  }

  return payload;
}

function resolveErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    if ("details" in error && typeof (error as { details?: unknown }).details === "string") {
      return (error as { details: string }).details;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return "No pudimos cargar la lista de propiedades.";
}

export function usePropertyList(initial: Partial<PropertyListFilters> = {}): PropertyListState {
  const { listProperties, loading: loadingState, errors } = usePropertiesActions();
  const [filters, setFiltersState] = useState<PropertyListFilters>({ ...INITIAL_FILTERS, ...initial });
  const [pageData, setPageData] = useState<Page<PropertyDTO>>({
    items: [],
    page: filters.page,
    pageSize: filters.pageSize,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, PropertyDTO>>(new Map());
  const requestIdRef = useRef(0);

  const fetchFor = useCallback(
    async (activeFilters: PropertyListFilters) => {
      const payload = normalizeFilters(activeFilters);
      const requestId = ++requestIdRef.current;
      const result = await listProperties(payload);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (result.isOk()) {
        const page = result.value;
        setPageData(page);
        setCache(prev => {
          const map = new Map(prev);
          page.items.forEach(item => map.set(item.id, item));
          return map;
        });
        setError(null);
      } else {
        setError(resolveErrorMessage(result.error));
      }
    },
    [listProperties],
  );

  useEffect(() => {
    void fetchFor(filters);
  }, [fetchFor, filters]);

  const refresh = useCallback(async () => {
    await fetchFor(filters);
  }, [fetchFor, filters]);

  const setFilters = useCallback(
    (
      updater: Partial<PropertyListFilters> | ((prev: PropertyListFilters) => Partial<PropertyListFilters>),
      options?: { keepPage?: boolean },
    ) => {
      setFiltersState(prev => {
        const partial = typeof updater === "function" ? updater(prev) : updater;
        const next: PropertyListFilters = { ...prev, ...partial };
        const touchedKeys = Object.keys(partial) as (keyof PropertyListFilters)[];
        const changedNonPaging = touchedKeys.some(key => key !== "page" && key !== "pageSize");
        if (changedNonPaging && !options?.keepPage) {
          next.page = 1;
        }
        let hasChanged = touchedKeys.some(key => prev[key] !== next[key]);
        if (changedNonPaging && !options?.keepPage && prev.page !== next.page) {
          hasChanged = true;
        }
        if (!hasChanged) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  const setPage = useCallback(
    (page: number) => {
      const normalized = Math.max(page, 1);
      setFiltersState(prev => {
        if (prev.page === normalized) {
          return prev;
        }
        return {
          ...prev,
          page: normalized,
        };
      });
    },
    [],
  );

  const loading = loadingState.listProperties;

  const items = useMemo(() => pageData.items, [pageData.items]);

  const getCachedById = useCallback(
    (id: string) => {
      return cache.get(id) ?? null;
    },
    [cache],
  );

  const effectiveError = error ?? errors.listProperties;

  return {
    filters,
    items,
    page: pageData.page,
    total: pageData.total,
    pageSize: pageData.pageSize,
    loading,
    error: effectiveError,
    refresh,
    setFilters,
    setPage,
    cache,
    getCachedById,
  };
}

