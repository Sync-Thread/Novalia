// PropertyDetailPage: página de detalle público de una propiedad
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  Bath,
  Ruler,
  Layers,
  Calendar,
  MapPin,
  Home,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { usePropertyDetail } from "./hooks/usePropertyDetail";
import { GalleryPlaceholder } from "./components/GalleryPlaceholder";
import { SummaryPanel } from "./components/SummaryPanel";
import { PublicHomeFooter } from "../PublicHomePage/components/Footer/Footer";
import { formatNumber } from "../../utils/formatters";
import { getAmenityLabel } from "../../utils/amenityLabels";
import { buildMapsUrl } from "../../utils/mapsUrl";
import styles from "./PropertyDetailPage.module.css";

/**
 * Página de detalle público de propiedad.
 * Muestra: título, galería (placeholder), resumen sticky, descripción+amenidades+características,
 * ubicación con botón Google Maps, y similares (placeholder).
 * TODO: implementar galería completa, mapa interactivo y similares reales.
 */
export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = usePropertyDetail(id);

  const handleBack = () => {
    navigate("/");
  };

  const handleContact = () => {
    // TODO: implementar contactar
    console.log("Contactar desde mobile CTA");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loader} role="status" aria-live="polite">
            Cargando propiedad...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label="Regresar a la búsqueda"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Regresar a la búsqueda
          </button>

          <div className={styles.errorBox} role="alert">
            {error || "No se pudo cargar la propiedad"}
          </div>
        </div>
      </div>
    );
  }

  const { property, coverUrl } = data;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Botón de regreso */}
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Regresar a la búsqueda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar a la búsqueda
        </button>

        {/* Título */}
        <h1 className={styles.title}>{property.title}</h1>

        {/* Block 1: Header - Galería + Panel Resumen */}
        <section
          className={styles.headerBlock}
          aria-labelledby="header-section"
        >
          <GalleryPlaceholder coverUrl={coverUrl} title={property.title} />
          <SummaryPanel property={property} />
        </section>

        {/* Block 2: Descripción + Amenidades + Características (2 columnas) */}
        <section
          className={styles.combinedBlock}
          aria-labelledby="content-section"
        >
          <div className={styles.combinedGrid}>
            {/* Columna izquierda: Descripción + Amenidades */}
            <div className={styles.leftColumn}>
              <div>
                <h2 id="content-section" className={styles.sectionTitle}>
                  Descripción
                </h2>
                <p className={styles.description}>
                  {property.description || "N/D"}
                </p>
              </div>

              <div>
                <h2 className={styles.sectionTitle}>Amenidades</h2>
                {property.amenities && property.amenities.length > 0 ? (
                  <div className={styles.amenitiesChips}>
                    {property.amenities.map((amenityId) => (
                      <span key={amenityId} className={styles.amenityChip}>
                        {getAmenityLabel(amenityId)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.description}>
                    Sin amenidades registradas
                  </p>
                )}
              </div>
            </div>

            {/* Columna derecha: Características */}
            <div>
              <h2 className={styles.sectionTitle}>Características</h2>
              <div className={styles.characteristicsGrid}>
                {property.bedrooms !== null &&
                  property.bedrooms !== undefined && (
                    <div className={styles.characteristicItem}>
                      <BedDouble
                        className={styles.characteristicIcon}
                        aria-hidden="true"
                      />
                      <span>{formatNumber(property.bedrooms)} Recámaras</span>
                    </div>
                  )}

                {property.bathrooms !== null &&
                  property.bathrooms !== undefined && (
                    <div className={styles.characteristicItem}>
                      <Bath
                        className={styles.characteristicIcon}
                        aria-hidden="true"
                      />
                      <span>{formatNumber(property.bathrooms)} Baños</span>
                    </div>
                  )}

                {property.constructionM2 && (
                  <div className={styles.characteristicItem}>
                    <Ruler
                      className={styles.characteristicIcon}
                      aria-hidden="true"
                    />
                    <span>
                      {formatNumber(property.constructionM2)} m² de construcción
                    </span>
                  </div>
                )}

                {property.landM2 && (
                  <div className={styles.characteristicItem}>
                    <Ruler
                      className={styles.characteristicIcon}
                      aria-hidden="true"
                    />
                    <span>{formatNumber(property.landM2)} m² de terreno</span>
                  </div>
                )}

                {property.levels !== null &&
                  property.levels !== undefined &&
                  property.levels > 0 && (
                    <div className={styles.characteristicItem}>
                      <Layers
                        className={styles.characteristicIcon}
                        aria-hidden="true"
                      />
                      <span>{formatNumber(property.levels)} Pisos</span>
                    </div>
                  )}

                {property.yearBuilt && (
                  <div className={styles.characteristicItem}>
                    <Calendar
                      className={styles.characteristicIcon}
                      aria-hidden="true"
                    />
                    <span>Año de construcción: {property.yearBuilt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Block 3: Ubicación + Mapa */}
        <div className={styles.locationMapBlock}>
          <section
            className={styles.locationSection}
            aria-labelledby="location-section"
          >
            <h2 id="location-section" className={styles.sectionTitle}>
              Ubicación
            </h2>
            <div className={styles.locationDetail}>
              <div className={styles.locationItem}>
                <span className={styles.locationLabel}>Colonia</span>
                <span className={styles.locationValue}>
                  {property.address.neighborhood || "N/D"}
                </span>
              </div>

              <div className={styles.locationItem}>
                <span className={styles.locationLabel}>Código Postal</span>
                <span className={styles.locationValue}>
                  {property.address.postalCode || "N/D"}
                </span>
              </div>

              <div className={styles.locationItem}>
                <span className={styles.locationLabel}>Ciudad</span>
                <span className={styles.locationValue}>
                  {property.address.city || "N/D"}
                </span>
              </div>

              <div className={styles.locationItem}>
                <span className={styles.locationLabel}>Estado</span>
                <span className={styles.locationValue}>
                  {property.address.state || "N/D"}
                </span>
              </div>
            </div>

            <a
              href={buildMapsUrl({
                lat: property.location?.lat,
                lng: property.location?.lng,
                colonia: property.address.neighborhood,
                ciudad: property.address.city,
                estado: property.address.state,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapsButton}
              aria-label={`Abrir en Google Maps: ${property.address.city || "ubicación"}, ${property.address.state || ""}`}
            >
              <ExternalLink aria-hidden="true" />
              Abrir en Google Maps
            </a>
          </section>

          {/* Mapa Placeholder */}
          <div className={styles.mapPlaceholder} aria-label="Mapa de ubicación">
            <MapPin aria-hidden="true" />
            <span>Mapa interactivo próximamente</span>
          </div>
        </div>

        {/* Block 4: Similares */}
        <section
          className={styles.similarsBlock}
          aria-labelledby="similars-section"
        >
          <h2 id="similars-section" className={styles.sectionTitle}>
            Similares
          </h2>

          <div className={styles.similarsGrid}>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className={styles.similarCard} aria-hidden="true">
                <Home size={32} />
                <span>Próximamente</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.viewMoreButton}
            disabled
            aria-label="Ver más similares (próximamente)"
          >
            Ver más similares
          </button>
        </section>
      </div>

      {/* Mobile sticky CTA bar */}
      <div className={styles.mobileCtaBar}>
        <button
          type="button"
          className={styles.mobileCtaButton}
          onClick={handleContact}
          aria-label="Contactar sobre esta propiedad"
        >
          <MessageCircle aria-hidden="true" />
          Contactar
        </button>
      </div>

      {/* Footer */}
      <PublicHomeFooter />
    </div>
  );
}
