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
}

/**
 * Panel resumen sticky con precio, tipo, stats, dirección y CTA.
 * Placeholder para acciones (Guardar/Compartir/Contactar).
 */
export function SummaryPanel({ property }: SummaryPanelProps) {
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
    // TODO: implementar contactar
    console.log("Contactar");
  };

  return (
    <aside className={styles.panel} aria-label="Resumen de la propiedad">
      <p className={styles.price}>{priceLabel}</p>

      <div className={styles.badges}>
        <span className={styles.badge} aria-label={`Tipo: ${typeLabel}`}>
          {typeLabel}
        </span>
        <span className={styles.badge} aria-label={`Área: ${areaLabel}`}>
          {areaLabel}
        </span>
      </div>

      <div className={styles.stats}>
        {bedrooms !== null && bedrooms !== undefined && (
          <div className={styles.statItem}>
            <BedDouble className={styles.statIcon} aria-hidden="true" />
            <span>{formatNumber(bedrooms)} Recámaras</span>
          </div>
        )}

        {bathrooms !== null && bathrooms !== undefined && (
          <div className={styles.statItem}>
            <Bath className={styles.statIcon} aria-hidden="true" />
            <span>{formatNumber(bathrooms)} Baños</span>
          </div>
        )}

        {parkingSpots !== null && parkingSpots !== undefined && (
          <div className={styles.statItem}>
            <Car className={styles.statIcon} aria-hidden="true" />
            <span>{formatNumber(parkingSpots)} Estacionamientos</span>
          </div>
        )}

        {levels !== null && levels !== undefined && levels > 0 && (
          <div className={styles.statItem}>
            <Layers className={styles.statIcon} aria-hidden="true" />
            <span>{formatNumber(levels)} Pisos</span>
          </div>
        )}
      </div>

      <div className={styles.address}>
        <div className={styles.statItem}>
          <MapPin className={styles.addressIcon} aria-hidden="true" />
          <p className={styles.addressText}>{addressLabel}</p>
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
