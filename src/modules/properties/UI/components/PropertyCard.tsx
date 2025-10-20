import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  Bed,
  Car,
  CheckCircle,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pause,
  Share2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatCurrency, formatDate, formatStatus } from "../utils/format";
import ProgressCircle from "./ProgressCircle";
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
  loadingActions?: Partial<Record<PropertyCardAction, boolean>>;
  disabledActions?: Partial<Record<PropertyCardAction, boolean>>;
  hideActions?: PropertyCardAction[];
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

const ACTION_LABEL: Record<PropertyCardAction, string> = {
  quick_view: "Vista rápida",
  edit: "Editar",
  publish: "Publicar",
  pause: "Pausar",
  mark_sold: "Marcar como vendida",
  view_public: "Ver en portal",
  delete: "Eliminar",
};

const ACTION_ICON: Record<PropertyCardAction, React.ReactNode> = {
  quick_view: <Eye size={16} />,
  edit: <Pencil size={16} />,
  publish: <CheckCircle size={16} />,
  pause: <Pause size={16} />,
  mark_sold: <Upload size={16} />,
  view_public: <Share2 size={16} />,
  delete: <Trash2 size={16} />,
};

/**
 * Tarjeta del listado de propiedades. Solo altera el estilo; acciones y datos se mantienen.
 */
export function PropertyCard({
  property,
  coverUrl,
  metrics,
  onAction,
  loadingActions,
  disabledActions,
  hideActions,
  enableQuickView = true,
}: PropertyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handle);
    return () => window.removeEventListener("pointerdown", handle);
  }, [menuOpen]);

  const rppStatus = useMemo<RppStatus>(() => property.rppVerification ?? "missing", [property.rppVerification]);
  const menuItems = useMemo<PropertyCardAction[]>(() => {
    const base: PropertyCardAction[] = ["quick_view", "edit", "publish", "pause", "mark_sold", "view_public", "delete"];
    return base.filter(action => !hideActions?.includes(action));
  }, [hideActions]);

  const isDisabled = (action: PropertyCardAction) => Boolean(disabledActions?.[action]);
  const isLoading = (action: PropertyCardAction) => Boolean(loadingActions?.[action]);

  const trigger = (action: PropertyCardAction) => {
    if (isDisabled(action) || isLoading(action)) return;
    setMenuOpen(false);
    onAction?.(action, property);
  };

  const fechaPublicacion = property.publishedAt
    ? `Publicada el ${formatDate(property.publishedAt)}`
    : `Creada el ${formatDate(property.createdAt)}`;

  return (
    <article className={styles.tarjeta}>
      <button
        type="button"
        onClick={() => enableQuickView && trigger("quick_view")}
        className={styles.portada}
        aria-label="Abrir vista rápida"
        disabled={!enableQuickView}
      >
        <div className={styles.cinta}>
          <span className={`${styles.estado} ${STATUS_CLASS[property.status] ?? styles.estadoNeutro}`}>
            {formatStatus(property.status)}
          </span>
          <span className={`${styles.estado} ${RPP_STYLE[rppStatus].className}`}>{RPP_STYLE[rppStatus].label}</span>
        </div>
        <div className={styles.cajaImagen}>
          {/* TODO(IMAGEN): Reemplazar placeholder por asset real según docs/ui/properties/refs/ */}
          {coverUrl ? <img src={coverUrl} alt="" /> : <div className={styles.placeholder} aria-hidden="true" />}
        </div>
      </button>

      <div className={styles.contenido}>
        <header className={styles.cabecera}>
          <div>
            <h3 className={styles.titulo}>{property.title}</h3>
            <span className={styles.precio}>{formatCurrency(property.price.amount, property.price.currency)}</span>
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
        <div className={styles.metricas}>
          {metrics && (
            <>
              <span>
                <Eye size={14} /> {metrics.views ?? 0}
              </span>
              <span>
                <Users size={14} /> {metrics.leads ?? 0}
              </span>
              <span>
                <MessageCircle size={14} /> {metrics.chats ?? 0}
              </span>
            </>
          )}
          <div ref={menuRef} className={styles.menu}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
              className={styles.menuBtn}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div role="menu" className={styles.menuContenido}>
                {menuItems.map(action => {
                  const loading = isLoading(action);
                  return (
                    <button
                      key={action}
                      type="button"
                      role="menuitem"
                      onClick={() => trigger(action)}
                      disabled={isDisabled(action) || loading}
                      className={`${styles.menuItem} ${action === "delete" ? styles.menuItemPeligro : ""}`.trim()}
                    >
                      {ACTION_ICON[action]}
                      {loading ? "Procesando..." : ACTION_LABEL[action]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}

export default PropertyCard;
