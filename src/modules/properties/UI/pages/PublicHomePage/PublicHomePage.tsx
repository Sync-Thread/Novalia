import { useCallback, useMemo, useState } from "react";
import styles from "./PublicHomePage.module.css";
import { HeroSection } from "./components/HeroSection/HeroSection";
import { PublicSearchBar } from "./components/PublicSearchBar/PublicSearchBar";
import { PublicHomeFooter } from "./components/Footer/Footer";
import { usePublicPropertiesList } from "./hooks/usePublicPropertiesList";
import { PropertyPublicCard } from "./components/PropertyPublicCard/PropertyPublicCard";
import {
  DEFAULT_PUBLIC_SEARCH_FILTERS,
  type PublicAppliedFilters,
  type PublicSearchFilters,
} from "./types";
import { toAppliedFilters } from "./utils/filterUtils";

// PublicHomePage integra Hero, barra de búsqueda y listado de propiedades públicas.
export default function PublicHomePage() {
  const [filters, setFilters] = useState<PublicSearchFilters>(() => ({
    ...DEFAULT_PUBLIC_SEARCH_FILTERS,
  }));
  const [appliedFilters, setAppliedFilters] = useState<PublicAppliedFilters>(
    {}
  );

  const isHeroCollapsed = useMemo(() => {
    return Object.values(appliedFilters).some(
      (v) => v !== undefined && v !== null && v !== ""
    );
  }, [appliedFilters]);

  const {
    items,
    page,
    pageSize,
    total,
    totalPages,
    loading,
    error,
    nextPage,
    previousPage,
    hasNext,
    hasPrevious,
  } = usePublicPropertiesList(appliedFilters);

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);
  const rangeLabel =
    total === 0
      ? "0"
      : showingFrom === showingTo
        ? `${showingFrom}`
        : `${showingFrom}-${showingTo}`;

  const handleSearchChange = useCallback(
    (patch: Partial<PublicSearchFilters>, options?: { apply?: boolean }) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        if (options?.apply) {
          setAppliedFilters(toAppliedFilters(next));
        }
        return next;
      });
    },
    []
  );

  const handleSearchSubmit = useCallback(() => {
    setAppliedFilters(toAppliedFilters(filters));
  }, [filters]);

  const handleSearchReset = useCallback(() => {
    setFilters({ ...DEFAULT_PUBLIC_SEARCH_FILTERS });
    setAppliedFilters({});
  }, []);

  const heroMode = isHeroCollapsed ? "compact" : "expanded";

  const searchBar = (
    <PublicSearchBar
      value={filters}
      onChange={handleSearchChange}
      onSubmit={handleSearchSubmit}
      onReset={handleSearchReset}
      isCollapsedHero={isHeroCollapsed}
    />
  );

  return (
    <div className={styles.page} id="top">
      <HeroSection mode={heroMode} searchBar={searchBar} />

      <section
        className={styles.listingSection}
        aria-labelledby="public-properties-heading"
      >
        <div className={styles.listingContainer}>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {!loading && total > 0 && (
            <div className={styles.statusRow} aria-live="polite">
              <span>
                Mostrando {rangeLabel} de {total} propiedades
              </span>
              {isHeroCollapsed && (
                <span className={styles.activeFiltersNote}>
                  Búsqueda refinada con filtros aplicados.
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className={styles.loader} role="status" aria-live="polite">
              Cargando propiedades.
            </div>
          ) : items.length > 0 ? (
            <div className={styles.grid}>
              {items.map((property) => (
                <PropertyPublicCard
                  key={property.id}
                  id={property.id}
                  title={property.title}
                  priceLabel={property.priceLabel}
                  href={property.link}
                  address={property.address}
                  propertyTypeLabel={property.propertyTypeLabel}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  areaM2={property.areaM2}
                  coverUrl={property.coverUrl}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty} role="status" aria-live="polite">
              No hay propiedades disponibles con los filtros seleccionados.
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className={styles.pagination}
              aria-label="Paginación de propiedades públicas"
            >
              <button
                type="button"
                className={styles.paginationButton}
                onClick={previousPage}
                disabled={!hasPrevious}
                aria-label="Página anterior"
              >
                Anterior
              </button>
              <span className={styles.paginationMeta}>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={nextPage}
                disabled={!hasNext}
                aria-label="Página siguiente"
              >
                Siguiente
              </button>
            </nav>
          )}
        </div>
      </section>

      <PublicHomeFooter />
    </div>
  );
}
