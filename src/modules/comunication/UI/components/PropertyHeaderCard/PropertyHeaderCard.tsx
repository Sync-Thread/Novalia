import type { PropertySummaryDTO } from '../../../application/dto/ChatThreadDTO';
import styles from './PropertyHeaderCard.module.css';
import { Building2, MapPin } from 'lucide-react';

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
      {/* Imagen de propiedad (placeholder por ahora) */}
      <div className={styles.imageContainer}>
        {property.coverImageUrl ? (
          <img 
            src={property.coverImageUrl} 
            alt={property.title ?? 'Propiedad'} 
            className={styles.image}
          />
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

        {/* Botón para ver propiedad */}
        {onViewProperty && (
          <button 
            className={styles.viewButton}
            onClick={onViewProperty}
            type="button"
          >
            Ver detalles de la propiedad
          </button>
        )}
      </div>
    </div>
  );
}
