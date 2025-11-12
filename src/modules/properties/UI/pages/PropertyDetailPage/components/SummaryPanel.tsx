// SummaryPanel: panel resumen con precio, badges, stats, dirección y acciones
import {
  BedDouble,
  Bath,
  Car,
  Layers,
  MapPin,
  Heart,
  Share2,
  MessageCircle,
  Building2,
} from "lucide-react";
import {
  formatMoney,
  formatArea,
  formatAddressFull,
  formatPropertyType,
  formatNumber,
} from "../../../utils/formatters";
import type { PropertyDTO } from "../../../../application/dto/PropertyDTO";
import styles from "./SummaryPanel.module.css";

export interface SummaryPanelProps {
  property: PropertyDTO;
  onContact?: () => void;
}

/**
 * Panel resumen sticky con precio, tipo, stats, dirección y CTA.
 * Placeholder para acciones (Guardar/Compartir/Contactar).
 */
export function SummaryPanel({ property, onContact }: SummaryPanelProps) {
  const {
    price,
    propertyType,
    bedrooms,
    bathrooms,
    parkingSpots,
    levels,
    constructionM2,
    address,
  } = property;

  const priceLabel = formatMoney(price.amount, price.currency);
  const typeLabel = formatPropertyType(propertyType);
  const areaLabel = formatArea(constructionM2);
  const addressLabel = formatAddressFull(
    address.neighborhood,
    address.city,
    address.state
  );

  const handleSave = () => {
    // TODO: implementar guardar en favoritos
    console.log("Guardar propiedad");
  };

  const handleShare = () => {
    // TODO: implementar compartir
    console.log("Compartir propiedad");
  };

  const handleContact = () => {
    if (onContact) {
      onContact();
    } else {
      console.log("Contactar");
    }
  };

  return (
    <aside className={styles.panel} aria-label="Resumen de la propiedad">
      {/* Header con precio y tipo */}
      <div className={styles.header}>
        <p className={styles.price}>{priceLabel}</p>
        <div className={styles.typeWrapper}>
          <Building2 className={styles.typeIcon} aria-hidden="true" />
          <span className={styles.typeLabel}>{typeLabel}</span>
        </div>
      </div>

      {/* Características principales en grid 2x2 */}
      <div className={styles.mainFeatures}>
        {bedrooms !== null && bedrooms !== undefined && (
          <div className={styles.featureCard}>
            <BedDouble className={styles.featureIcon} aria-hidden="true" />
            <div className={styles.featureContent}>
              <p className={styles.featureValue}>{formatNumber(bedrooms)}</p>
              <p className={styles.featureLabel}>Recámaras</p>
            </div>
          </div>
        )}

        {bathrooms !== null && bathrooms !== undefined && (
          <div className={styles.featureCard}>
            <Bath className={styles.featureIcon} aria-hidden="true" />
            <div className={styles.featureContent}>
              <p className={styles.featureValue}>{formatNumber(bathrooms)}</p>
              <p className={styles.featureLabel}>Baños</p>
            </div>
          </div>
        )}

        {parkingSpots !== null && parkingSpots !== undefined && (
          <div className={styles.featureCard}>
            <Car className={styles.featureIcon} aria-hidden="true" />
            <div className={styles.featureContent}>
              <p className={styles.featureValue}>
                {formatNumber(parkingSpots)}
              </p>
              <p className={styles.featureLabel}>Estacionamientos</p>
            </div>
          </div>
        )}

        {levels !== null && levels !== undefined && levels > 0 && (
          <div className={styles.featureCard}>
            <Layers className={styles.featureIcon} aria-hidden="true" />
            <div className={styles.featureContent}>
              <p className={styles.featureValue}>{formatNumber(levels)}</p>
              <p className={styles.featureLabel}>Pisos</p>
            </div>
          </div>
        )}
      </div>

      {/* Área de construcción destacada */}
      <div className={styles.areaHighlight}>
        <span className={styles.areaLabel}>Área de construcción</span>
        <span className={styles.areaValue}>{areaLabel}</span>
      </div>

      {/* Ubicación */}
      <div className={styles.location}>
        <MapPin className={styles.locationIcon} aria-hidden="true" />
        <div className={styles.locationContent}>
          <p className={styles.locationLabel}>Ubicación</p>
          <p className={styles.locationText}>{addressLabel}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleSave}
          aria-label="Guardar en favoritos"
        >
          <Heart aria-hidden="true" />
          Guardar
        </button>

        <button
          type="button"
          className={styles.actionButton}
          onClick={handleShare}
          aria-label="Compartir esta propiedad"
        >
          <Share2 aria-hidden="true" />
          Compartir
        </button>
      </div>

      <button
        type="button"
        className={styles.ctaButton}
        onClick={handleContact}
        aria-label="Contactar sobre esta propiedad"
      >
        <MessageCircle aria-hidden="true" />
        Contactar
      </button>
    </aside>
  );
}
