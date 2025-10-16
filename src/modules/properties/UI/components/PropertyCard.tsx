import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  Bed,
  Car,
  CheckCircle,
  Eye,
  MoreHorizontal,
  Pencil,
  Pause,
  Share2,
  Trash2,
  Upload,
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

const statusStyles: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(148, 163, 184, 0.2)", color: "#475569" },
  published: { bg: "rgba(59,130,246,0.18)", color: "#1d4ed8" },
  sold: { bg: "rgba(16,185,129,0.18)", color: "#047857" },
  archived: { bg: "rgba(148, 163, 184, 0.2)", color: "#475569" },
};

const rppStyles: Record<VerificationStatusDTO | "missing", { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(234,179,8,0.15)", color: "#B45309", label: "RPP pendiente" },
  verified: { bg: "rgba(16,185,129,0.15)", color: "#047857", label: "RPP verificado" },
  rejected: { bg: "rgba(248,113,113,0.15)", color: "#B91C1C", label: "RPP rechazado" },
  missing: { bg: "rgba(148,163,184,0.12)", color: "#475569", label: "RPP pendiente" },
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

  const rppStatus = useMemo<keyof typeof rppStyles>(() => {
    return property.rppVerification ?? "missing";
  }, [property.rppVerification]);

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
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.1)",
        overflow: "hidden",
        background: "#fff",
        position: "relative",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => enableQuickView && trigger("quick_view")}
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "62%",
          border: "none",
          background: "#111827",
          cursor: enableQuickView ? "pointer" : "default",
        }}
        aria-label="Abrir vista rÃ¡pida"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(41,93,255,0.12), rgba(15,23,42,0.4))",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            padding: "6px 14px",
            borderRadius: 999,
            background: statusStyle.bg,
            color: statusStyle.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {formatStatus(property.status)}
        </span>
        <span
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "6px 14px",
            borderRadius: 999,
            background: rppStyles[rppStatus].bg,
            color: rppStyles[rppStatus].color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {rppStyles[rppStatus].label}
        </span>
      </button>
      <div
        style={{
          padding: "18px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {property.title}
            </h3>
            <div
              style={{
                marginTop: 4,
                fontSize: 15,
                fontWeight: 600,
                color: "#1d4ed8",
              }}
            >
              {formatCurrency(property.price.amount, property.price.currency)}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {property.address.city}, {property.address.state}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Completitud</span>
              <ProgressCircle value={property.completenessScore} size={60} />
            </div>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#475569",
          }}
        >
          <InfoChip icon={<Bed size={14} />} label={`${property.bedrooms ?? 0} rec`} />
          <InfoChip icon={<Bath size={14} />} label={`${property.bathrooms ?? 0} baÃ±os`} />
          <InfoChip icon={<Car size={14} />} label={`${property.parkingSpots ?? 0} est`} />
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {property.publishedAt
              ? `Publicada el ${formatDate(property.publishedAt)}`
              : `Creada el ${formatDate(property.createdAt)}`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {metrics && (
              <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#475569" }}>
                <span>ðŸ‘€ {metrics.views ?? 0}</span>
                <span>ðŸ’¬ {metrics.chats ?? 0}</span>
                <span>â˜Žï¸ {metrics.leads ?? 0}</span>
              </div>
            )}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(prev => !prev)}
                style={{
                  border: "none",
                  background: "rgba(148,163,184,0.15)",
                  padding: 8,
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
                    minWidth: 180,
                    zIndex: 20,
                    overflow: "hidden",
                  }}
                >
                  {availableActions.includes("quick_view") && (
                    <MenuItem
                      icon={<Eye size={16} />}
                      label="Vista rÃ¡pida"
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        background: "rgba(148,163,184,0.15)",
        color: "#475569",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
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
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "#fff",
        border: "none",
        borderBottom: "1px solid rgba(148,163,184,0.18)",
        fontSize: 13,
        fontWeight: 500,
        color: destructive ? "#b91c1c" : "#0f172a",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon}
      <span>{loading ? "Procesandoâ€¦" : label}</span>
    </button>
  );
}

export default PropertyCard;

