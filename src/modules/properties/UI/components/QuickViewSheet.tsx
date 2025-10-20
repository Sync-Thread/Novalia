// Sheet mínimo para consultar y accionar sobre una propiedad.
// No tocar lógica de Application/Domain.
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../application/ports/AuthService";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import ProgressCircle from "./ProgressCircle";
import DateTimePicker from "./DateTimePicker";
import MarkSoldModal, { type MarkSoldModalPayload } from "../modals/MarkSoldModal";
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

type RppState = VerificationStatusDTO | "missing";

const STATUS_CLASS: Record<PropertyDTO["status"], string> = {
  draft: "status",
  published: "status status-success",
  sold: "status status-success",
  archived: "status status-error",
};

const RPP_TONE: Record<RppState, { label: string; className: string }> = {
  pending: { label: "RPP pendiente", className: "status status-warn" },
  verified: { label: "RPP verificado", className: "status status-success" },
  rejected: { label: "RPP rechazado", className: "status status-error" },
  missing: { label: "RPP pendiente", className: "status" },
};

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
    loading,
  } = usePropertiesActions();
  const [property, setProperty] = useState<PropertyDTO | null>(initialProperty);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showMarkSold, setShowMarkSold] = useState(false);

  const fetchProperty = useCallback(
    async (id: string) => {
      setLoadingDetails(true);
      setError(null);
      const result = await getProperty(id);
      if (result.isOk()) {
        setProperty(result.value);
        setScheduleAt(result.value.publishedAt ?? null);
      } else {
        setError("No pudimos cargar los detalles de la propiedad.");
      }
      setLoadingDetails(false);
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
    }
    if (!open) {
      setError(null);
      setScheduleOpen(false);
    }
  }, [authProfile, fetchProperty, getAuthProfile, initialProperty, open, propertyId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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
      await refreshAfterAction();
    }
  };

  const handlePause = async () => {
    if (!property) return;
    const result = await pauseProperty({ id: property.id });
    if (result.isOk()) {
      await refreshAfterAction();
    }
  };

  const handleSchedule = async () => {
    if (!property || !scheduleAt) return;
    const result = await schedulePublish({ id: property.id, publishAt: new Date(scheduleAt) });
    if (result.isOk()) {
      setScheduleOpen(false);
      await refreshAfterAction();
    }
  };

  const handleMarkSold = async ({ soldAt }: MarkSoldModalPayload) => {
    if (!property) return;
    const result = await markSold({ id: property.id, soldAt: new Date(soldAt) });
    if (result.isOk()) {
      setShowMarkSold(false);
      await refreshAfterAction();
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

  const rppInfo = useMemo(() => {
    const key: RppState = property?.rppVerification ?? "missing";
    return RPP_TONE[key];
  }, [property?.rppVerification]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="quickview-title">
        <div aria-hidden="true" onClick={onClose} />
        <section className="sheet-panel">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon sheet-close" aria-label="Cerrar">
            <X size={18} />
          </button>

          <header className="stack" style={{ gap: "12px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <h2 id="quickview-title" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                {property?.title ?? "Propiedad"}
              </h2>
              {property && <span className={STATUS_CLASS[property.status] ?? "status"}>{formatStatus(property.status)}</span>}
              <span className={rppInfo.className}>{rppInfo.label}</span>
            </div>
            {property && (
              <div className="card-meta" style={{ gap: "12px" }}>
                <span>ID {shortenId(property.id)}</span>
                <span>{property.address.city}, {property.address.state}</span>
                <span>{formatCurrency(property.price.amount, property.price.currency)}</span>
              </div>
            )}
            {authProfile && (
              <div className="card-meta">
                <span>Miembro: {authProfile.name}</span>
                <span>KYC: {authProfile.kycStatus}</span>
              </div>
            )}
          </header>

          {error && (
            <div role="alert" className="card" style={{ padding: "12px", background: "rgba(248,113,113,0.12)", borderColor: "var(--danger)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {loadingDetails && <span className="muted">Cargando detalles...</span>}

          {property && (
            <div className="stack" style={{ gap: "var(--gap)" }}>
              <section className="card" style={{ padding: "var(--gap)" }}>
                <div style={{ display: "flex", gap: "var(--gap)", flexWrap: "wrap" }}>
                  <ProgressCircle value={property.completenessScore} ariaLabel="Completitud" />
                  <div className="stack" style={{ gap: "6px" }}>
                    <span className="muted">Completitud del perfil</span>
                    <span style={{ fontWeight: 600 }}>{formatStatus(property.status)}</span>
                    <span className="muted">Documentos: {formatVerification(property.rppVerification ?? "pending")}</span>
                  </div>
                </div>
                <div className="card-meta" style={{ marginTop: "var(--gap)" }}>
                  <span>Recámaras: {property.bedrooms ?? 0}</span>
                  <span>Baños: {property.bathrooms ?? 0}</span>
                  <span>Estacionamientos: {property.parkingSpots ?? 0}</span>
                </div>
              </section>

              <section className="stack" style={{ gap: "12px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Acciones rápidas</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <button type="button" className="btn btn-primary" onClick={() => property && onEdit?.(property.id)}>
                    Abrir en panel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => property && onViewPublic?.(property)}
                  >
                    Ver publicación
                  </button>
                  {property.status === "draft" && (
                    <button
                      type="button"
                      className="btn"
                      onClick={handlePublish}
                      disabled={loading.publishProperty}
                    >
                      {loading.publishProperty ? "Publicando..." : "Publicar ahora"}
                    </button>
                  )}
                  {property.status === "published" && (
                    <button
                      type="button"
                      className="btn"
                      onClick={handlePause}
                      disabled={loading.pauseProperty}
                    >
                      {loading.pauseProperty ? "Pausando..." : "Pausar"}
                    </button>
                  )}
                  {property.status !== "sold" && (
                    <button type="button" className="btn" onClick={() => setShowMarkSold(true)}>
                      Marcar como vendida
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDelete(true)}
                    style={{ color: "var(--danger)" }}
                  >
                    Eliminar
                  </button>
                </div>
              </section>

              {property.status === "draft" && (
                <section className="card" style={{ padding: "var(--gap)" }}>
                  <div className="stack" style={{ gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Programar publicación</h3>
                      <button type="button" className="btn btn-ghost" onClick={() => setScheduleOpen(prev => !prev)}>
                        {scheduleOpen ? "Cerrar" : "Configurar"}
                      </button>
                    </div>
                    {scheduleOpen && (
                      <>
                        <DateTimePicker
                          label="Fecha y hora"
                          value={scheduleAt}
                          onChange={setScheduleAt}
                          required
                        />
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSchedule}
                            disabled={!scheduleAt || loading.schedulePublish}
                          >
                            {loading.schedulePublish ? "Guardando..." : "Guardar programación"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>

      <DeletePropertyModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={loading.deleteProperty}
        propertyTitle={property?.title}
      />

      <MarkSoldModal
        open={showMarkSold}
        onClose={() => setShowMarkSold(false)}
        onConfirm={handleMarkSold}
        loading={loading.markSold}
        defaultDate={property?.publishedAt ?? undefined}
      />
    </>
  );
}

export default QuickViewSheet;
