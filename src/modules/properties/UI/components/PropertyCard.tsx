import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bath, Bed, Car, CheckCircle, Eye, MessageCircle, MoreHorizontal, Pencil, Pause, Share2, Trash2, Upload, Users } from "lucide-react";
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

const statusStyles: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(148, 163, 184, 0.25)", color: "#475569" },
  published: { bg: "rgba(34, 197, 94, 0.18)", color: "#047857" },
  sold: { bg: "rgba(59, 130, 246, 0.18)", color: "#1d4ed8" },
  archived: { bg: "rgba(148, 163, 184, 0.25)", color: "#475569" },
};

const rppStyles: Record<VerificationStatusDTO | "missing", { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(234,179,8,0.18)", color: "#b45309", label: "RPP pendiente" },
  verified: { bg: "rgba(16,185,129,0.18)", color: "#047857", label: "RPP verificado" },
  rejected: { bg: "rgba(248,113,113,0.18)", color: "#b91c1c", label: "RPP rechazado" },
  missing: { bg: "rgba(148,163,184,0.2)", color: "#475569", label: "RPP pendiente" },
};

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
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const rppStatus = useMemo<keyof typeof rppStyles>(() => property.rppVerification ?? "missing", [property.rppVerification]);

  const availableActions = useMemo<PropertyCardAction[]>(() => {
    const base: PropertyCardAction[] = ["quick_view", "edit", "publish", "pause", "mark_sold", "view_public", "delete"];
    return base.filter(action => !hideActions?.includes(action));
  }, [hideActions]);

  const actionDisabled = (action: PropertyCardAction) => disabledActions?.[action];
  const actionLoading = (action: PropertyCardAction) => loadingActions?.[action];

  const trigger = (action: PropertyCardAction) => {
    if (actionDisabled(action) || actionLoading(action)) return;
    setMenuOpen(false);
    onAction?.(action, property);
  };

  const statusStyle = statusStyles[property.status] ?? statusStyles.draft;

  return (
    <article className={styles.card}>
      <button
        type="button"
        onClick={() => enableQuickView && trigger("quick_view")}
        className={styles.coverButton}
        aria-label="Abrir vista rápida"
      >
        <div className={styles.statusChips}>
          <span className={styles.chip} style={{ background: statusStyle.bg, color: statusStyle.color }}>
            {formatStatus(property.status)}
          </span>
        </div>
        <span className={`${styles.chip} ${styles.chipVerification}`} style={{ background: rppStyles[rppStatus].bg, color: rppStyles[rppStatus].color }}>
          {rppStyles[rppStatus].label}
        </span>
        <div className={styles.preview}>
          {/* TODO(IMAGEN): Reemplazar por asset real según referencia 'refs/property-card.png' */}
          {coverUrl ? <img src={coverUrl} alt="" className={styles.coverMedia} /> : <div className={styles.placeholder} aria-hidden="true" />}
        </div>
      </button>

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{property.title}</h3>
            <span className={styles.price}>{formatCurrency(property.price.amount, property.price.currency)}</span>
            <span className={styles.location}>
              {property.address.city}, {property.address.state}
            </span>
          </div>
          <div className={styles.progressWrap}>
            <span className={styles.progressLabel}>Completitud</span>
            <ProgressCircle value={property.completenessScore} size={60} />
          </div>
        </header>

        <div className={styles.meta}>
          <InfoChip icon={<Bed size={14} />} label={`${property.bedrooms ?? 0} rec`} />
          <InfoChip icon={<Bath size={14} />} label={`${property.bathrooms ?? 0} baños`} />
          <InfoChip icon={<Car size={14} />} label={`${property.parkingSpots ?? 0} est`} />
        </div>

        <footer className={styles.footer}>
          <span className={styles.timestamp}>
            {property.publishedAt ? `Publicada el ${formatDate(property.publishedAt)}` : `Creada el ${formatDate(property.createdAt)}`}
          </span>
          <div className={styles.metrics}>
            {metrics && (
              <>
                <span className={styles.metric}>
                  <Eye size={14} />
                  {metrics.views ?? 0}
                </span>
                <span className={styles.metric}>
                  <Users size={14} />
                  {metrics.leads ?? 0}
                </span>
                <span className={styles.metric}>
                  <MessageCircle size={14} />
                  {metrics.chats ?? 0}
                </span>
              </>
            )}
            <div className={styles.menu} ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(prev => !prev)}
                className={styles.menuTrigger}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div role="menu" className={styles.menuContent}>
                  {availableActions.includes("quick_view") && (
                    <MenuItem
                      icon={<Eye size={16} />}
                      label="Vista rápida"
                      disabled={!enableQuickView || actionDisabled("quick_view")}
                      loading={actionLoading("quick_view")}
                      onClick={() => trigger("quick_view")}
                    />
                  )}
                  {availableActions.includes("edit") && (
                    <MenuItem
                      icon={<Pencil size={16} />}
                      label="Editar"
                      disabled={actionDisabled("edit")}
                      loading={actionLoading("edit")}
                      onClick={() => trigger("edit")}
                    />
                  )}
                  {availableActions.includes("publish") && property.status === "draft" && (
                    <MenuItem
                      icon={<CheckCircle size={16} />}
                      label="Publicar"
                      disabled={actionDisabled("publish")}
                      loading={actionLoading("publish")}
                      onClick={() => trigger("publish")}
                    />
                  )}
                  {availableActions.includes("pause") && property.status === "published" && (
                    <MenuItem
                      icon={<Pause size={16} />}
                      label="Pausar"
                      disabled={actionDisabled("pause")}
                      loading={actionLoading("pause")}
                      onClick={() => trigger("pause")}
                    />
                  )}
                  {availableActions.includes("mark_sold") && property.status !== "sold" && (
                    <MenuItem
                      icon={<Upload size={16} />}
                      label="Marcar como vendida"
                      disabled={actionDisabled("mark_sold")}
                      loading={actionLoading("mark_sold")}
                      onClick={() => trigger("mark_sold")}
                    />
                  )}
                  {availableActions.includes("view_public") && property.status === "published" && (
                    <MenuItem
                      icon={<Share2 size={16} />}
                      label="Ver en portal"
                      disabled={actionDisabled("view_public")}
                      loading={actionLoading("view_public")}
                      onClick={() => trigger("view_public")}
                    />
                  )}
                  {availableActions.includes("delete") && (
                    <MenuItem
                      icon={<Trash2 size={16} />}
                      label="Eliminar"
                      destructive
                      disabled={actionDisabled("delete")}
                      loading={actionLoading("delete")}
                      onClick={() => trigger("delete")}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className={styles.infoChip}>
      {icon}
      {label}
    </span>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
}

function MenuItem({ icon, label, onClick, disabled, loading, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      role="menuitem"
      className={`${styles.menuItem} ${destructive ? styles.menuDanger : ""}`.trim()}
    >
      {icon}
      <span>{loading ? "Procesando..." : label}</span>
    </button>
  );
}

export default PropertyCard;
