// useSimilarProperties: hook para obtener propiedades similares
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../../../../core/supabase/client";
import { createPropertiesContainer } from "../../../../properties.container";
import { SupabaseAuthService } from "../../../../infrastructure/adapters/SupabaseAuthService";
import { SupabaseMediaStorage } from "../../../../infrastructure/adapters/SupabaseMediaStorage";
import { getPresignedUrlForDisplay } from "../../../../infrastructure/adapters/MediaStorage";
import type { PropertyDTO } from "../../../../application/dto/PropertyDTO";
import type { PublicPropertySummaryDTO } from "../../../../application/dto/PublicPropertyDTO";

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

interface SimilarPropertyData {
  id: string;
  title: string;
  priceLabel: string;
  link: string;
  address: {
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
  propertyTypeLabel: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  coverUrl: string | null;
}

/**
 * Traduce el tipo de propiedad de inglés a español
 */
function getPropertyTypeLabel(type?: string | null): string {
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

/**
 * Carga la imagen de portada de una propiedad desde el storage
 */
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
    console.error(`[similar-properties] Failed to load cover image for ${propertyId}`, error);
    return null;
  }
}

/**
 * Calcula un score de similitud entre una propiedad base y una propiedad candidata
 * Criterios: ciudad (40%), tipo (30%), precio (20%), otros (10%)
 */
function calculateSimilarityScore(
  base: PropertyDTO,
  candidate: PublicPropertySummaryDTO
): number {
  let score = 0;

  // Mismo estado (20 puntos)
  if (base.address.state === candidate.state) {
    score += 20;
  }

  // Misma ciudad (20 puntos adicionales)
  if (base.address.city === candidate.city) {
    score += 20;
  }

  // Mismo tipo de propiedad (30 puntos)
  if (base.propertyType === candidate.propertyType) {
    score += 30;
  }

  // Rango de precio similar (20 puntos)
  // Considera similar si está dentro del ±30% del precio base
  const priceBase = base.price.amount;
  const priceCandidate = candidate.price.amount;
  const priceDiff = Math.abs(priceBase - priceCandidate);
  const priceThreshold = priceBase * 0.3;

  if (priceDiff <= priceThreshold) {
    score += 20;
  } else if (priceDiff <= priceBase * 0.5) {
    score += 10; // Precio moderadamente similar
  }

  // Recámaras similares (5 puntos)
  if (base.bedrooms && candidate.bedrooms) {
    if (Math.abs(base.bedrooms - candidate.bedrooms) <= 1) {
      score += 5;
    }
  }

  // Área similar (5 puntos)
  if (base.constructionM2 && candidate.constructionSizeM2) {
    const areaDiff = Math.abs(base.constructionM2 - candidate.constructionSizeM2);
    const areaThreshold = base.constructionM2 * 0.3;
    if (areaDiff <= areaThreshold) {
      score += 5;
    }
  }

  return score;
}

/**
 * Filtra propiedades por score mínimo con fallback progresivo
 * Intenta obtener el número deseado de propiedades bajando el score mínimo gradualmente
 */
function selectSimilarPropertiesWithFallback(
  scored: Array<{ property: PublicPropertySummaryDTO; score: number }>,
  limit: number
): PublicPropertySummaryDTO[] {
  // Thresholds de score en orden descendente (más estricto a más flexible)
  const scoreThresholds = [
    70, // Muy similar (mismo estado + ciudad + tipo)
    50, // Similar (mismo estado + tipo, o mismo estado + ciudad)
    30, // Moderadamente similar (al menos mismo estado o tipo)
    20, // Algo similar (al menos mismo estado)
    10, // Débilmente similar (precio similar o características)
    0,  // Cualquier propiedad
  ];

  // Intentar con cada threshold hasta obtener suficientes resultados
  for (const threshold of scoreThresholds) {
    const filtered = scored.filter(({ score }) => score >= threshold);
    
    if (filtered.length >= limit) {
      // Ordenar por score y tomar los top N
      return filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ property }) => property);
    }
  }

  // Si aún no hay suficientes, devolver todas las disponibles ordenadas por score
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ property }) => property);
}

export function useSimilarProperties(
  currentProperty: PropertyDTO | null,
  limit: number = 3
) {
  const [items, setItems] = useState<SimilarPropertyData[]>([]);
  const [loading, setLoading] = useState(false);
  const container = useMemo(() => createPropertiesContainer(), []);

  useEffect(() => {
    if (!currentProperty) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchSimilarProperties = async () => {
      try {
        const listPublished = container.useCases.listPublishedPublic;

        // Obtener propiedades publicadas (máximo 60 por limitación del schema)
        const result = await listPublished.execute({
          page: 1,
          pageSize: 60, // Máximo permitido por el schema de validación
        });

        if (cancelled) return;

        if (result.isErr()) {
          console.error("Error al obtener propiedades similares:", result.error);
          setItems([]);
          setLoading(false);
          return;
        }

        const allProperties = result.value.items;

        // Filtrar la propiedad actual
        const candidates = allProperties.filter(
          (p: PublicPropertySummaryDTO) => p.id !== currentProperty.id
        );

        // Calcular score de similitud para cada candidato
        const scored = candidates.map((property: PublicPropertySummaryDTO) => ({
          property,
          score: calculateSimilarityScore(currentProperty, property),
        }));

        // Seleccionar propiedades similares con fallback progresivo
        const topSimilar = selectSimilarPropertiesWithFallback(scored, limit);

        // Cargar imágenes de portada para las propiedades seleccionadas
        const coverUrlsPromises = topSimilar.map(async (property) => {
          const url = await loadCoverImage(property.id);
          return { propertyId: property.id, url };
        });

        const coverUrlsResults = await Promise.allSettled(coverUrlsPromises);
        const coverUrlsMap: Record<string, string | null> = {};

        coverUrlsResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const { propertyId, url } = result.value;
            coverUrlsMap[propertyId] = url ?? null;
          }
        });

        // Mapear a formato de card con imágenes cargadas
        const similarData: SimilarPropertyData[] = topSimilar.map((property: PublicPropertySummaryDTO) => {
          const priceFormatted = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: property.price.currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(property.price.amount);

          return {
            id: property.id,
            title: property.title,
            priceLabel: priceFormatted,
            link: `/properties/${property.id}`,
            address: {
              neighborhood: property.neighborhood,
              city: property.city,
              state: property.state,
            },
            propertyTypeLabel: getPropertyTypeLabel(property.propertyType),
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaM2: property.constructionSizeM2,
            coverUrl: coverUrlsMap[property.id] ?? property.coverImageUrl ?? null,
          };
        });

        if (!cancelled) {
          setItems(similarData);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error al buscar propiedades similares:", error);
          setItems([]);
          setLoading(false);
        }
      }
    };

    fetchSimilarProperties();

    return () => {
      cancelled = true;
    };
  }, [currentProperty, limit, container.useCases.listPublishedPublic]);

  return { items, loading };
}
