import { useEffect, useState } from 'react';
import type { PropertySummaryDTO } from '../../../application/dto/ChatThreadDTO';
import styles from './PropertyHeaderCard.module.css';
import { Building2, MapPin, ExternalLink } from 'lucide-react';
import { getPresignedUrlForDisplay } from '../../../../properties/infrastructure/adapters/MediaStorage';

interface PropertyHeaderCardProps {
  property: PropertySummaryDTO | null;
  contactName?: string | null;
  contactEmail?: string | null;
  onViewProperty?: () => void;
}

/**
 * Card visual de propiedad para mostrar en el header del chat
 * Muestra imagen (placeholder), título, precio, ubicación e información del contacto
 */
export function PropertyHeaderCard({
  property,
  contactName,
  contactEmail,
  onViewProperty,
}: PropertyHeaderCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!property?.coverImageUrl) {
        setImageUrl(null);
        return;
      }

      setLoadingImage(true);
      try {
        const url = await getPresignedUrlForDisplay(property.coverImageUrl);
        setImageUrl(url);
      } catch (error) {
        console.error('Error loading property image:', error);
        setImageUrl(null);
      } finally {
        setLoadingImage(false);
      }
    };

    void loadImage();
  }, [property?.coverImageUrl]);

  if (!property) {
    return (
      <div className={styles.emptyCard}>
        <p>Sin propiedad asociada</p>
      </div>
    );
  }

  const priceLabel = property.price
    ? new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: property.currency ?? 'MXN',
        minimumFractionDigits: 0,
      }).format(property.price)
    : 'Precio no disponible';

  const locationLabel = [property.city, property.state]
    .filter(Boolean)
    .join(', ') || 'Ubicación no disponible';

  const operationLabel = property.operationType === 'sale' ? 'Venta' : 
                        property.operationType === 'rent' ? 'Renta' : 
                        property.operationType ?? 'N/D';

  return (
    <div className={styles.card}>
      {/* Imagen de propiedad */}
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={property.title ?? 'Propiedad'} 
            className={styles.image}
          />
        ) : loadingImage ? (
          <div className={styles.placeholderImage}>
            <Building2 size={24} className={styles.placeholderIcon} />
          </div>
        ) : (
          <div className={styles.placeholderImage}>
            <Building2 size={32} className={styles.placeholderIcon} />
          </div>
        )}
      </div>

      {/* Información de la propiedad */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{property.title ?? 'Sin título'}</h3>
          <span className={styles.operationType}>{operationLabel}</span>
        </div>
        
        <p className={styles.price}>{priceLabel}</p>
        
        <div className={styles.location}>
          <MapPin size={14} className={styles.locationIcon} />
          <span>{locationLabel}</span>
        </div>

        {/* Información del contacto */}
        {contactName && (
          <div className={styles.contactInfo}>
            <p className={styles.contactLabel}>Contacto:</p>
            <p className={styles.contactName}>{contactName}</p>
            {contactEmail && (
              <p className={styles.contactEmail}>{contactEmail}</p>
            )}
          </div>
        )}

        {/* Botón para ver propiedad - siempre visible */}
        <button 
          className={styles.viewButton}
          onClick={onViewProperty}
          type="button"
        >
          <ExternalLink size={14} />
          Ver detalles de la propiedad
        </button>
      </div>
    </div>
  );
}
