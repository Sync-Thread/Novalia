// Tarjeta principal para listar propiedades en el panel.
// No tocar lógica de Application/Domain.
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
  Users,
} from "lucide-react";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatCurrency, formatDate, formatStatus } from "../utils/format";
import ProgressCircle from "./ProgressCircle";

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
  draft: "status",
  published: "status status-success",
  sold: "status status-success",
  archived: "status status-error",
};

const RPP_CLASS: Record<RppStatus, { label: string; tone: string }> = {
  pending: { label: "RPP pendiente", tone: "status status-warn" },
  verified: { label: "RPP verificado", tone: "status status-success" },
  rejected: { label: "RPP rechazado", tone: "status status-error" },
  missing: { label: "RPP pendiente", tone: "status" },
};

const BASE_ACTIONS: PropertyCardAction[] = ["quick_view", "edit", "publish", "pause", "mark_sold", "view_public", "delete"];

const ACTION_LABEL: Record<PropertyCardAction, string> = {
  quick_view: "Vista rápida",
  edit: "Editar",
  publish: "Publicar",
  pause: "Pausar",
  mark_sold: "Marcar como vendida",
  view_public: "Ver publicación",
  delete: "Eliminar",
};

const ACTION_ICON: Record<PropertyCardAction, React.ReactNode> = {
  quick_view: <Eye size={16} />,
  edit: <Pencil size={16} />,
  publish: <CheckCircle size={16} />,
  pause: <Pause size={16} />,
  mark_sold: <CheckCircle size={16} />,
  view_public: <Share2 size={16} />,
  delete: <Trash2 size={16} />,
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
  const availableActions = useMemo(() => BASE_ACTIONS.filter(action => !hideActions?.includes(action)), [hideActions]);

  const isActionDisabled = (action: PropertyCardAction) => Boolean(disabledActions?.[action]);
  const isActionLoading = (action: PropertyCardAction) => Boolean(loadingActions?.[action]);

  const trigger = (action: PropertyCardAction) => {
    if (isActionDisabled(action) || isActionLoading(action)) return;
    setMenuOpen(false);
    onAction?.(action, property);
  };

  const publishedLabel = property.publishedAt
    ? `Publicada el ${formatDate(property.publishedAt)}`
    : `Creada el ${formatDate(property.createdAt)}`;

  const menuItems = [
    {
      action: "quick_view" as const,
      hidden: !enableQuickView,
    },
    { action: "edit" as const },
    { action: "publish" as const, hidden: property.status !== "draft" },
    { action: "pause" as const, hidden: property.status !== "published" },
    { action: "mark_sold" as const, hidden: property.status === "sold" },
    { action: "view_public" as const },
    { action: "delete" as const },
  ].filter(item => availableActions.includes(item.action) && !item.hidden);

  return (
    <article className="card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => enableQuickView && trigger("quick_view")}
        className="card-cover"
        aria-label="Abrir vista rápida"
        disabled={!enableQuickView}
        style={{ cursor: enableQuickView ? "pointer" : "default" }}
      >
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span className={STATUS_CLASS[property.status] ?? "status"}>{formatStatus(property.status)}</span>
          <span className={RPP_CLASS[rppStatus].tone}>{RPP_CLASS[rppStatus].label}</span>
        </div>
        <div className="ratio-16x9">
          {/* TODO(IMAGEN): Reemplazar placeholder por asset real en docs/ui/properties/refs/ */}
          {coverUrl ? <img src={coverUrl} alt="" /> : <div className="placeholder" aria-hidden="true" />}
        </div>
      </button>

      <div className="card-body">
        <header style={{ display: "flex", justifyContent: "space-between", gap: "var(--gap)", alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: "6px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>{property.title}</h3>
            <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>{formatCurrency(property.price.amount, property.price.currency)}</span>
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              {property.address.city}, {property.address.state}
            </span>
          </div>
          <div className="stack" style={{ alignItems: "center", gap: "4px" }}>
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              Completitud
            </span>
            <ProgressCircle value={property.completenessScore} size={56} />
          </div>
        </header>

        <div className="card-meta">
          <span className="pill">
            <Bed size={16} />
            {property.bedrooms ?? 0} rec
          </span>
          <span className="pill">
            <Bath size={16} />
            {property.bathrooms ?? 0} baños
          </span>
          <span className="pill">
            <Car size={16} />
            {property.parkingSpots ?? 0} est
          </span>
        </div>
      </div>

      <footer className="card-footer">
        <span>{publishedLabel}</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {metrics && (
            <>
              <span className="muted" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Eye size={16} />
                {metrics.views ?? 0}
              </span>
              <span className="muted" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={16} />
                {metrics.leads ?? 0}
              </span>
              <span className="muted" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageCircle size={16} />
                {metrics.chats ?? 0}
              </span>
            </>
          )}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
              className="btn btn-ghost btn-icon"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: "220px",
                  background: "var(--bg)",
                  border: `1px solid var(--border)`,
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px",
                  zIndex: 10,
                }}
              >
                {menuItems.map(item => {
                  const action = item.action;
                  const loading = isActionLoading(action);
                  return (
                    <button
                      key={action}
                      type="button"
                      role="menuitem"
                      onClick={() => trigger(action)}
                      disabled={isActionDisabled(action) || loading}
                      className="btn btn-ghost"
                      style={{ justifyContent: "flex-start" }}
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
