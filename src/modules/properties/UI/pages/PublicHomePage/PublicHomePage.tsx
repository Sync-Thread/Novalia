import styles from "./PublicHomePage.module.css";
import { HeroSection } from "./components/HeroSection/HeroSection";
import { PublicHomeFooter } from "./components/Footer/Footer";
import { usePublicPropertiesList } from "./hooks/usePublicPropertiesList";
import { PropertyPublicCard } from "./components/PropertyPublicCard/PropertyPublicCard";

// PublicHomePage reúne hero, listado público y footer; integrará filtros avanzados más adelante.
export default function PublicHomePage() {
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
  } = usePublicPropertiesList();

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);
  const rangeLabel =
    total === 0
      ? "0"
      : showingFrom === showingTo
        ? `${showingFrom}`
        : `${showingFrom}-${showingTo}`;

  return (
    <div className={styles.page} id="top">
      <HeroSection />

      <section
        className={styles.listingSection}
        aria-labelledby="public-properties-heading"
      >
        <div className={styles.listingContainer}>
          {/* <header className={styles.listingHeader}>
            <h2 id="public-properties-heading" className={styles.listingTitle}>
              Propiedades publicadas
            </h2>
            <p className={styles.listingSubtitle}>
              Explora el inventario disponible en Novalia. Muy pronto podrás
              filtrar por ubicación, precio y amenidades.
            </p>
          </header> */}
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
            </div>
          )}

          {loading ? (
            <div className={styles.loader} role="status" aria-live="polite">
              Cargando propiedades…
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
              Aún no hay propiedades públicas disponibles. Vuelve a intentarlo
              pronto.
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
