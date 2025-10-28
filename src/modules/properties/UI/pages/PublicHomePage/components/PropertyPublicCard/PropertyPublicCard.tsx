import { memo } from "react";
import { BedDouble, Bath, Ruler } from "lucide-react";
import { formatAddress } from "../../../../utils/formatAddress";
import styles from "./PropertyPublicCard.module.css";

export interface PropertyPublicCardProps {
  id: string;
  title: string;
  priceLabel: string;
  href: string;
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

function formatAmenityValue(value?: number | null, fallback = "N/D") {
  if (value === null || value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return value;
}

// PropertyPublicCard muestra una propiedad publicada al público; se enlazará a detalle y analytics después.
export const PropertyPublicCard = memo(function PropertyPublicCard({
  title,
  priceLabel,
  href,
  address,
  propertyTypeLabel,
  bedrooms,
  bathrooms,
  areaM2,
  coverUrl,
}: PropertyPublicCardProps) {
  const locationLabel = formatAddress(address);
  const displayLocation = locationLabel || "Ubicación reservada";

  return (
    <a className={styles.card} href={href} aria-label={`Ver detalle de ${title}`}>
      <div className={styles.media}>
        {coverUrl ? (
          <img
            className={styles.mediaImage}
            src={coverUrl}
            alt={`Portada de ${title}`}
            loading="lazy"
          />
        ) : (
          <div className={styles.mediaFallback} aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1v-9.5Z" />
            </svg>
            <span>Imagen próximamente</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.headerRow}>
          <p className={styles.price}>{priceLabel}</p>
          <span className={styles.badge} aria-label={`Tipo de propiedad: ${propertyTypeLabel}`}>
            {propertyTypeLabel}
          </span>
        </div>

        <p className={styles.address}>{displayLocation}</p>

        <div className={styles.amenities}>
          <span className={styles.amenity} aria-label={`${formatAmenityValue(bedrooms)} recámaras`}>
            <BedDouble aria-hidden="true" className={styles.amenityIcon} />
            {formatAmenityValue(bedrooms)}
          </span>
          <span className={styles.amenity} aria-label={`${formatAmenityValue(bathrooms)} baños`}>
            <Bath aria-hidden="true" className={styles.amenityIcon} />
            {formatAmenityValue(bathrooms)}
          </span>
          <span className={styles.amenity} aria-label={`${formatAmenityValue(areaM2)} metros cuadrados`}>
            <Ruler aria-hidden="true" className={styles.amenityIcon} />
            {formatAmenityValue(areaM2)} m²
          </span>
        </div>
      </div>
    </a>
  );
});

