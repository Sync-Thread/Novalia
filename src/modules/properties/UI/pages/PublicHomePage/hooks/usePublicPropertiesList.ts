import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../../core/supabase/client";
import { createPropertiesContainer } from "../../../../properties.container";
import { SupabaseAuthService } from "../../../../infrastructure/adapters/SupabaseAuthService";
import { SupabaseMediaStorage } from "../../../../infrastructure/adapters/SupabaseMediaStorage";
import { getPresignedUrlForDisplay } from "../../../../infrastructure/adapters/MediaStorage";
import type {
  PublicPropertyListFiltersDTO,
  PublicPropertySummaryDTO,
} from "../../../../application/dto/PublicPropertyDTO";
import type { PublicAppliedFilters } from "../types";

const PAGE_SIZE = 12;

const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Departamento",
  house: "Casa",
  commercial: "Comercial",
  land: "Terreno",
  office: "Oficina",
  industrial: "Industrial",
  warehouse: "Bodega",
  duplex: "Dúplex",
  studio: "Estudio",
  loft: "Loft",
  villa: "Villa",
};

interface PublicPropertyCardViewModel {
  id: string;
  link: string;
  title: string;
  priceLabel: string;
  price: PublicPropertySummaryDTO["price"];
  address: {
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
  propertyTypeLabel: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  landAreaM2?: number | null;
  parkingSpots?: number | null;
  levels?: number | null;
  coverUrl: string | null;
}

function formatCurrency(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
    maximumFractionDigits: 0,
  });

  return formatter.format(amount ?? 0);
}

function getPropertyTypeLabel(type?: string | null) {
  if (!type) return "Propiedad";
  const normalized = type.toLowerCase();
  if (PROPERTY_TYPE_LABELS[normalized]) {
    return PROPERTY_TYPE_LABELS[normalized];
  }
  return normalized
    .split(/[\s_-]+/)
    .map((segment) =>
      segment.length > 0
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : "",
    )
    .join(" ");
}

function buildFiltersPayload(
  page: number,
  filters: PublicAppliedFilters,
): Partial<PublicPropertyListFiltersDTO> {
  const payload: Partial<PublicPropertyListFiltersDTO> = {
    page,
    pageSize: PAGE_SIZE,
  };

  const mappings: Array<[keyof PublicAppliedFilters, keyof PublicPropertyListFiltersDTO]> = [
    ["propertyType", "propertyType"],
    ["q", "q"],
    ["state", "state"],
    ["city", "city"],
    ["priceMin", "priceMin"],
    ["priceMax", "priceMax"],
    ["bedroomsMin", "bedroomsMin"],
    ["bathroomsMin", "bathroomsMin"],
    ["parkingSpotsMin", "parkingSpotsMin"],
    ["levelsMin", "levelsMin"],
    ["areaMin", "areaMin"],
    ["areaMax", "areaMax"],
  ];

  for (const [filterKey, payloadKey] of mappings) {
    const value = filters[filterKey];
    if (value !== undefined && value !== null && value !== "") {
      payload[payloadKey] = value as any;
    }
  }

  return payload;
}

async function loadCoverImage(propertyId: string): Promise<string | null> {
  try {
    const mediaResult = await mediaStorage.listMedia(propertyId);
    if (mediaResult.isErr()) {
      return null;
    }

    const mediaItems = mediaResult.value;
    const cover = mediaItems.find(
      (item) => item.isCover && item.type === "image",
    );
    const fallback = mediaItems.find((item) => item.type === "image");
    const selected = cover || fallback;

    if (!selected?.s3Key) return null;
    return getPresignedUrlForDisplay(selected.s3Key);
  } catch (error) {
    console.error(`[public-home] Failed to load cover image for ${propertyId}`, error);
    return null;
  }
}

// Hook para listado de propiedades públicas con paginación y carga de imágenes.
export function usePublicPropertiesList(appliedFilters: PublicAppliedFilters) {
  const container = useMemo(() => createPropertiesContainer(), []);
  const listPublished = container.useCases.listPublishedPublic;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PublicPropertySummaryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverUrls, setCoverUrls] = useState<Record<string, string | null>>({});

  const fetchCoverImages = useCallback(async (propertyIds: string[]) => {
    if (propertyIds.length === 0) {
      setCoverUrls({});
      return;
    }

    const results = await Promise.allSettled(
      propertyIds.map(async (propertyId) => {
        const url = await loadCoverImage(propertyId);
        return { propertyId, url };
      }),
    );

    const map: Record<string, string | null> = {};
    propertyIds.forEach((id) => {
      map[id] = null;
    });

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const { propertyId, url } = result.value;
        map[propertyId] = url ?? null;
      } else {
        console.warn("[public-home] cover image failed", result.reason);
      }
    });

    setCoverUrls(map);
  }, []);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);

      try {
        const payload = buildFiltersPayload(targetPage, appliedFilters);
        const result = await listPublished.execute(payload);

        if (result.isErr()) {
          console.warn("[public-home] failed to fetch properties", result.error);
          setError(
            "No pudimos cargar las propiedades publicadas. Intenta de nuevo más tarde.",
          );
          setItems([]);
          setTotal(0);
          return;
        }

        const { items: propertyItems, total: newTotal } = result.value;
        setItems(propertyItems);
        setTotal(newTotal);
        void fetchCoverImages(propertyItems.map((item) => item.id));
      } catch (err) {
        console.error("[public-home] unexpected error fetching properties", err);
        setError("Tuvimos un problema para cargar las propiedades.");
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, fetchCoverImages, listPublished],
  );

  useEffect(() => {
    void fetchPage(page);
  }, [fetchPage, page]);

  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  const totalPages = useMemo(
    () => (total === 0 ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE))),
    [total],
  );

  const nextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const viewModels: PublicPropertyCardViewModel[] = useMemo(
    () =>
      items.map((item) => {
        return {
          id: item.id,
          link: `/properties/${item.id}`,
          title: item.title,
          price: item.price,
          priceLabel: formatCurrency(item.price.amount ?? 0, item.price.currency ?? "MXN"),
          address: {
            neighborhood: item.neighborhood ?? null,
            city: item.city ?? null,
            state: item.state ?? null,
          },
          propertyTypeLabel: getPropertyTypeLabel(item.propertyType),
          bedrooms: item.bedrooms ?? null,
          bathrooms: item.bathrooms ?? null,
          areaM2: item.constructionSizeM2 ?? null,
          landAreaM2: item.landSizeM2 ?? null,
          parkingSpots: item.parkingSpots ?? null,
          levels: item.levels ?? null,
          coverUrl: coverUrls[item.id] ?? item.coverImageUrl ?? null,
        };
      }),
    [coverUrls, items],
  );

  return {
    items: viewModels,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    loading,
    error,
    nextPage,
    previousPage,
    setPage,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
