import { useEffect, useMemo, useState } from "react";
import { createPropertiesContainer } from "../../properties.container";
import type { PublicPropertySummaryDTO } from "../../application/dto/PublicPropertyDTO";

const SKELETON_COUNT = 6;

function formatPrice(summary: PublicPropertySummaryDTO): string {
  const amount = summary.price.amount ?? 0;
  const formatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: summary.price.currency ?? "MXN",
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export default function PublicHomePage() {
  const container = useMemo(() => createPropertiesContainer(), []);
  const listPublished = container.useCases.listPublishedPublic;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PublicPropertySummaryDTO[]>([]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);

    listPublished
      .execute({ page: 1, pageSize: SKELETON_COUNT })
      .then(result => {
        if (!mounted) return;
        if (result.isOk()) {
          setItems(result.value.items);
        } else {
          console.warn("[public-home] failed to load properties", result.error);
          setError("No pudimos cargar las propiedades publicadas. Intenta de nuevo más tarde.");
        }
      })
      .catch(err => {
        if (!mounted) return;
        console.error("[public-home] unexpected error", err);
        setError("Tuvimos un problema para cargar las propiedades.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [listPublished]);

  const placeholderCards = useMemo(
    () =>
      Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <div key={`placeholder-${index}`} className="public-home__card public-home__card--placeholder" aria-hidden="true">
          <div className="public-home__card-media shimmer" />
          <div className="public-home__card-body">
            <div className="public-home__placeholder-line public-home__placeholder-line--wide shimmer" />
            <div className="public-home__placeholder-line shimmer" />
            <div className="public-home__placeholder-line public-home__placeholder-line--short shimmer" />
          </div>
        </div>
      )),
    [],
  );

  return (
    <div className="public-home">
      <section className="public-home__hero">
        <div className="app-container public-home__hero-content">
          <div className="public-home__hero-copy">
            <span className="public-home__eyebrow">Explora Novalia</span>
            <h1 className="public-home__title">Compra tu próxima propiedad con información confiable.</h1>
            <p className="public-home__subtitle">
              Accede al inventario público publicado por agentes y organizaciones verificadas. Estamos preparando un
              catálogo completo con filtros, mapas y recorridos virtuales.
            </p>
            <div className="public-home__hero-actions">
              <a className="public-home__cta" href="#public-list">
                Ver propiedades publicadas
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="public-home__section" id="public-list">
        <div className="app-container">
          <header className="public-home__section-header">
            <div>
              <h2 className="public-home__section-title">Propiedades publicadas</h2>
              <p className="public-home__section-subtitle">
                Esta vista pública es el primer paso. Muy pronto podrás comparar, agendar visitas y guardar tus
                favoritas.
              </p>
            </div>
            {!loading && (
              <span className="public-home__count">
                {items.length > 0 ? `${items.length} propiedades encontradas` : "Sin resultados por ahora"}
              </span>
            )}
          </header>

          {error && (
            <div className="public-home__error" role="alert">
              {error}
            </div>
          )}

          <div className="public-home__grid">
            {loading
              ? placeholderCards
              : items.map(property => (
                  <article key={property.id} className="public-home__card">
                    <div className="public-home__card-media">
                      <span className="public-home__badge">Publicado</span>
                    </div>
                    <div className="public-home__card-body">
                      <h3 className="public-home__card-title">{property.title}</h3>
                      <p className="public-home__card-meta">
                        {[property.city, property.state].filter(Boolean).join(", ") || "Ubicación en validación"}
                      </p>
                      <p className="public-home__card-price">{formatPrice(property)}</p>
                      <p className="public-home__card-footnote">
                        Más detalles muy pronto: plan de pagos, amenidades y recorridos virtuales.
                      </p>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
