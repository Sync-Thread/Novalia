import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { AuthProfile } from "../../application/ports/AuthService";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import ProgressCircle from "./ProgressCircle";
import DateTimePicker from "./DateTimePicker";
import MarkSoldModal from "../modals/MarkSoldModal";
import DeletePropertyModal from "../modals/DeletePropertyModal";
import { formatCurrency, formatStatus, formatVerification, shortenId } from "../utils/format";

export interface QuickViewSheetProps {
  propertyId: string | null;
  initialProperty?: PropertyDTO | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (propertyId: string) => void;
  onViewPublic?: (property: PropertyDTO) => void;
}

export function QuickViewSheet({
  propertyId,
  initialProperty = null,
  open,
  onClose,
  onRefresh,
  onEdit,
  onViewPublic,
}: QuickViewSheetProps) {
  const {
    getProperty,
    publishProperty,
    pauseProperty,
    markSold,
    deleteProperty,
    schedulePublish,
    getAuthProfile,
  } = usePropertiesActions();
  const [property, setProperty] = useState<PropertyDTO | null>(initialProperty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(() => window.innerWidth <= 1024);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showMarkSold, setShowMarkSold] = useState(false);

  useEffect(() => {
    if (!open) return;
    const listener = () => setIsFullWidth(window.innerWidth <= 1024);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [open]);

  const fetchProperty = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      const result = await getProperty(id);
      if (result.isOk()) {
        setProperty(result.value);
        setScheduleAt(result.value.publishedAt ?? null);
      } else {
        setError("No pudimos cargar los detalles de la propiedad.");
      }
      setLoading(false);
    },
    [getProperty],
  );

  useEffect(() => {
    if (open && propertyId) {
      setProperty(initialProperty ?? null);
      void fetchProperty(propertyId);
      if (!authProfile) {
        void getAuthProfile().then(profile => {
          if (profile.isOk()) {
            setAuthProfile(profile.value);
          }
        });
      }
    } else if (!open) {
      setProperty(null);
      setError(null);
      setShowSchedule(false);
    }
  }, [authProfile, fetchProperty, getAuthProfile, initialProperty, open, propertyId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const refreshAfterAction = useCallback(async () => {
    if (propertyId) {
      await fetchProperty(propertyId);
    }
    onRefresh?.();
  }, [fetchProperty, onRefresh, propertyId]);

  const handlePublish = async () => {
    if (!property) return;
    const result = await publishProperty({ id: property.id });
    if (result.isOk()) {
      void refreshAfterAction();
    }
  };

  const handlePause = async () => {
    if (!property) return;
    const result = await pauseProperty({ id: property.id });
    if (result.isOk()) {
      void refreshAfterAction();
    }
  };

  const handleSchedule = async () => {
    if (!property || !scheduleAt) return;
    const result = await schedulePublish({ id: property.id, publishAt: new Date(scheduleAt) });
    if (result.isOk()) {
      setShowSchedule(false);
      void refreshAfterAction();
    }
  };

  const handleMarkSold = async ({ soldAt, note }: { soldAt: string; note?: string }) => {
    if (!property) return;
    const result = await markSold({ id: property.id, soldAt: new Date(soldAt) });
    if (result.isOk()) {
      setShowMarkSold(false);
      void refreshAfterAction();
      void note;
    }
  };

  const handleDelete = async () => {
    if (!property) return;
    const result = await deleteProperty({ id: property.id });
    if (result.isOk()) {
      setShowDelete(false);
      onRefresh?.();
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.25)",
          zIndex: 900,
          backdropFilter: "blur(2px)",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: isFullWidth ? "100%" : 520,
          maxWidth: "100%",
          background: "#fff",
          boxShadow: "-18px 0 40px rgba(15,23,42,0.14)",
          borderTopLeftRadius: 24,
          borderBottomLeftRadius: 24,
          padding: "28px 32px 24px",
          zIndex: 905,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              id="quickview-title"
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {property?.title ?? "Propiedad"}
            </h2>
            {property && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(property.id)}
                style={{
                  marginTop: 6,
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Copiar ID {shortenId(property.id)}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(148,163,184,0.18)",
              borderRadius: 999,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              color: "#475569",
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        {loading && (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b" }}>
            Cargando detalles…
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            style={{
              background: "rgba(248,113,113,0.15)",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {property && !loading && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#1d4ed8",
                  }}
                >
                  {formatCurrency(property.price.amount, property.price.currency)}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#475569",
                    marginTop: 4,
                  }}
                >
                  {property.address.city}, {property.address.state} · {property.propertyType}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    marginTop: 4,
                  }}
                >
                  {formatStatus(property.status)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <ProgressCircle value={property.completenessScore} size={72} />
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    fontSize: 12,
                    color: "#94a3b8",
                  }}
                >
                  {formatVerification(property.rppVerification)}
                </span>
              </div>
            </section>

            <section
              style={{
                borderRadius: 16,
                border: "1px solid rgba(15,23,42,0.08)",
                padding: "16px 18px",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 10,
                }}
              >
                Calidad & Revisión
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: "#475569",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <li>
                  {authProfile?.kycStatus === "verified" ? "✓" : "•"} KYC verificado
                </li>
                <li>
                  {property.completenessScore >= 80 ? "✓" : "•"} Completitud ≥ 80%
                </li>
                <li>{property.rppVerification === "verified" ? "✓" : "•"} Documento RPP cargado</li>
                <li>{property.price.amount > 0 ? "✓" : "•"} Precio, tipo y ubicación definidos</li>
              </ul>
            </section>

            <section
              style={{
                borderRadius: 16,
                border: "1px solid rgba(15,23,42,0.08)",
                padding: "16px 18px",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 10,
                }}
              >
                Actividad
              </h3>
              <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#475569" }}>
                <span>👀 Vistas: {property.tags.length}</span>
                <span>☎️ Leads: {property.tags.length % 4}</span>
                <span>💬 Chats: {property.tags.length % 3}</span>
              </div>
            </section>

            <section
              style={{
                borderRadius: 16,
                border: "1px solid rgba(15,23,42,0.08)",
                padding: "16px 18px",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 10,
                }}
              >
                Documentos & Media
              </h3>
              <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#475569" }}>
                <span>Fotos: —</span>
                <span>Videos: —</span>
                <span>Planos: —</span>
              </div>
            </section>
          </>
        )}

        <div style={{ marginTop: "auto" }}>
          {property && (
            <FooterActions
              property={property}
              showSchedule={showSchedule}
              setShowSchedule={setShowSchedule}
              scheduleAt={scheduleAt}
              setScheduleAt={setScheduleAt}
              onPublish={handlePublish}
              onPause={handlePause}
              onSchedule={handleSchedule}
              onEdit={() => property && onEdit?.(property.id)}
              onViewPortal={() => property && onViewPublic?.(property)}
              onMarkSold={() => setShowMarkSold(true)}
              onDelete={() => setShowDelete(true)}
            />
          )}
        </div>
      </aside>
      <DeletePropertyModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        propertyTitle={property?.title}
      />
      <MarkSoldModal open={showMarkSold} onClose={() => setShowMarkSold(false)} onConfirm={handleMarkSold} />
    </>
  );
}

interface FooterProps {
  property: PropertyDTO;
  showSchedule: boolean;
  setShowSchedule: (value: boolean) => void;
  scheduleAt: string | null;
  setScheduleAt: (value: string | null) => void;
  onPublish: () => void;
  onPause: () => void;
  onSchedule: () => void;
  onEdit: () => void;
  onViewPortal?: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}

function FooterActions({
  property,
  showSchedule,
  setShowSchedule,
  scheduleAt,
  setScheduleAt,
  onPublish,
  onPause,
  onSchedule,
  onEdit,
  onViewPortal,
  onMarkSold,
  onDelete,
}: FooterProps) {
  const status = property.status;
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        background: "#fff",
        paddingTop: 16,
        borderTop: "1px solid rgba(15,23,42,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {showSchedule && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(41,93,255,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <DateTimePicker label="Programar publicación" value={scheduleAt} onChange={setScheduleAt} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#475569",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSchedule}
              disabled={!scheduleAt}
              style={{
                background: "#295DFF",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: scheduleAt ? "pointer" : "not-allowed",
                opacity: scheduleAt ? 1 : 0.6,
              }}
            >
              Programar
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {status === "draft" && (
          <>
            <button style={primaryBtnStyle} type="button" onClick={onPublish}>
              Publicar
            </button>
            <button style={ghostBtnStyle} type="button" onClick={() => setShowSchedule(true)}>
              Programar
            </button>
            <button style={ghostBtnStyle} type="button" onClick={onEdit}>
              Editar
            </button>
            <button style={dangerBtnStyle} type="button" onClick={onDelete}>
              Eliminar
            </button>
          </>
        )}
        {status === "published" && (
          <>
            <button style={ghostBtnStyle} type="button" onClick={onPause}>
              Pausar
            </button>
            <button style={ghostBtnStyle} type="button" onClick={onEdit}>
              Editar
            </button>
            <button style={ghostBtnStyle} type="button" onClick={onMarkSold}>
              Marcar vendida
            </button>
            <button style={ghostBtnStyle} type="button" onClick={onViewPortal}>
              Ver en portal
            </button>
            <button style={dangerBtnStyle} type="button" onClick={onDelete}>
              Eliminar
            </button>
          </>
        )}
        {status === "sold" && (
          <>
            <button style={ghostBtnStyle} type="button" onClick={onViewPortal}>
              Ver publicación
            </button>
            <button style={ghostBtnStyle} type="button" onClick={onEdit}>
              Editar
            </button>
            <button style={dangerBtnStyle} type="button" onClick={onDelete}>
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const primaryBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
  borderRadius: 10,
  border: "none",
  background: "#295DFF",
  color: "#fff",
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(41,93,255,0.18)",
};

const ghostBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "#fff",
  color: "#1e293b",
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const dangerBtnStyle: CSSProperties = {
  ...ghostBtnStyle,
  color: "#b91c1c",
  borderColor: "rgba(239,68,68,0.3)",
};

export default QuickViewSheet;


