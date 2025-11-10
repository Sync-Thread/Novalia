import React, { useMemo } from "react";
import { Bath, Bed, Car, Eye, MessageCircle, Users } from "lucide-react";
import type { PropertyDTO } from "../../../../application/dto/PropertyDTO";
import type { VerificationStatusDTO } from "../../../../application/dto/DocumentDTO";
import {
  formatCurrency,
  formatDate,
  formatStatus,
} from "../../../utils/format";
import ProgressCircle from "../../../components/ProgressCircle";
import styles from "./PropertyCard.module.css";

export type PropertyCardAction =
  | "quick_view"
  | "edit"
  | "publish"
  | "pause"
  | "mark_sold"
  | "view_public"
  | "delete";

export interface PropertyCardProps {
  property: PropertyDTO;
  coverUrl?: string | null;
  metrics?: {
    views?: number;
    leads?: number;
    chats?: number;
  };
  onAction?: (action: PropertyCardAction, property: PropertyDTO) => void;
  enableQuickView?: boolean;
}

type RppStatus = VerificationStatusDTO | "missing";

const STATUS_CLASS: Record<PropertyDTO["status"], string> = {
  draft: styles.estadoNeutro,
  published: styles.estadoPrimario,
  sold: styles.estadoPrimario,
  archived: styles.estadoNeutro,
};

const RPP_STYLE: Record<RppStatus, { label: string; className: string }> = {
  pending: { label: "RPP pendiente", className: styles.estadoNeutro },
  verified: { label: "RPP verificado", className: styles.estadoPrimario },
  rejected: { label: "RPP rechazado", className: styles.estadoPeligro },
  missing: { label: "RPP pendiente", className: styles.estadoNeutro },
};

/**
 * Tarjeta del listado de propiedades.
 * Toda la tarjeta abre el quick view cuando está habilitado.
 */
export function PropertyCard({
  property,
  coverUrl,
  metrics,
  onAction,
  enableQuickView = true,
}: PropertyCardProps) {
  const rppStatus = useMemo<RppStatus>(
    () => property.rppVerification ?? "missing",
    [property.rppVerification]
  );

  const trigger = (action: PropertyCardAction) => {
    onAction?.(action, property);
  };

  const handleQuickView = () => {
    if (!enableQuickView) return;
    trigger("quick_view");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!enableQuickView) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      trigger("quick_view");
    }
  };

  const fechaPublicacion = property.publishedAt
    ? `Publicada el ${formatDate(property.publishedAt)}`
    : `Creada el ${formatDate(property.createdAt)}`;

  return (
    <article
      className={`${styles.tarjeta} ${enableQuickView ? styles.tarjetaInteractiva : ""}`}
      role={enableQuickView ? "button" : undefined}
      tabIndex={enableQuickView ? 0 : undefined}
      onClick={handleQuickView}
      onKeyDown={handleKeyDown}
      aria-disabled={!enableQuickView}
    >
      <div className={styles.portada}>
        <div className={styles.cinta}>
          <span
            className={`${styles.estado} ${STATUS_CLASS[property.status] ?? styles.estadoNeutro}`}
          >
            {formatStatus(property.status)}
          </span>
          <span
            className={`${styles.estado} ${RPP_STYLE[rppStatus].className}`}
          >
            {RPP_STYLE[rppStatus].label}
          </span>
        </div>
        <div className={styles.cajaImagen}>
          {coverUrl ? (
            <img src={coverUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className={styles.contenido}>
        <header className={styles.cabecera}>
          <div>
            <h3 className={styles.titulo}>{property.title}</h3>
            <span className={styles.precio}>
              {formatCurrency(property.price.amount, property.price.currency)}
            </span>
            <span className={styles.ubicacion}>
              {property.address.city}, {property.address.state}
            </span>
          </div>
          <div className={styles.stats}>
            <span>Completitud</span>
            <ProgressCircle value={property.completenessScore} size={56} />
          </div>
        </header>

        <div className={styles.chips}>
          <span className={styles.chip}>
            <Bed size={14} />
            {property.bedrooms ?? 0} rec
          </span>
          <span className={styles.chip}>
            <Bath size={14} />
            {property.bathrooms ?? 0} baños
          </span>
          <span className={styles.chip}>
            <Car size={14} />
            {property.parkingSpots ?? 0} est
          </span>
        </div>
      </div>

      <footer className={styles.pie}>
        <span>{fechaPublicacion}</span>
        {metrics && (
          <div className={styles.metricas}>
            <span>
              <Eye size={14} /> {metrics.views ?? 0}
            </span>
            <span>
              <Users size={14} /> {metrics.leads ?? 0}
            </span>
            <span>
              <MessageCircle size={14} /> {metrics.chats ?? 0}
            </span>
          </div>
        )}
      </footer>
    </article>
  );
}

export default PropertyCard;
