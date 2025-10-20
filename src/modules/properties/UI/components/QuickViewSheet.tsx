import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../application/ports/AuthService";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import ProgressCircle from "./ProgressCircle";
import DateTimePicker from "./DateTimePicker";
import MarkSoldModal from "../modals/MarkSoldModal";
import DeletePropertyModal from "../modals/DeletePropertyModal";
import { formatCurrency, formatStatus, formatVerification, shortenId } from "../utils/format";
import styles from "./QuickViewSheet.module.css";

export interface QuickViewSheetProps {
  propertyId: string | null;
  initialProperty?: PropertyDTO | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (propertyId: string) => void;
  onViewPublic?: (property: PropertyDTO) => void;
}

type RppStatus = VerificationStatusDTO | "missing";

const STATUS_STYLE: Record<PropertyDTO["status"], string> = {
  draft: styles.tagInfo,
  published: styles.tagSuccess,
  sold: styles.tagSuccess,
  archived: styles.tagInfo,
};

const RPP_STYLE: Record<RppStatus, { label: string; className: string }> = {
  pending: { label: "RPP pendiente", className: styles.tagWarn },
  verified: { label: "RPP verificado", className: styles.tagSuccess },
  rejected: { label: "RPP rechazado", className: styles.tagDanger },
  missing: { label: "RPP pendiente", className: styles.tagInfo },
};

/**
 * Sheet lateral para consultar y accionar sobre una propiedad.
 * Solo se modifica la presentación; la lógica de acciones permanece intacta.
 */
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
        void getAuthProfile().then(result => {
          if (result.isOk()) setAuthProfile(result.value);
        });
      }
    }
    if (!open) {
      setError(null);
      setScheduleOpen(false);
    }
  }, [open, propertyId, fetchProperty, initialProperty, authProfile, getAuthProfile]);

  const refreshAfterAction = useCallback(async () => {
    if (propertyId) {
      await fetchProperty(propertyId);
    } else if (property?.id) {
      await fetchProperty(property.id);
    }
    onRefresh?.();
  }, [fetchProperty, onRefresh, property?.id, propertyId]);

  const handlePublish = async () => {
    if (!property) return;
    const result = await publishProperty({ id: property.id });
    if (result.isOk()) await refreshAfterAction();
  };

  const handlePause = async () => {
    if (!property) return;
    const result = await pauseProperty({ id: property.id });
    if (result.isOk()) await refreshAfterAction();
  };

  const handleSchedule = async () => {
    if (!property || !scheduleAt) return;
    const result = await schedulePublish({ id: property.id, publishAt: new Date(scheduleAt) });
    if (result.isOk()) {
      setScheduleOpen(false);
      await refreshAfterAction();
    }
  };

  const handleMarkSold = async ({ soldAt }: { soldAt: string }) => {
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
    const key: RppStatus = property?.rppVerification ?? "missing";
    return RPP_STYLE[key];
  }, [property?.rppVerification]);

  if (!open) return null;

  return (
    <>
      <div className={styles.overlay} role="presentation" onClick={onClose} />
      <aside className={styles.panel} aria-modal="true" role="dialog" aria-labelledby="quickview-title">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h2 id="quickview-title" className={styles.title}>
              {property?.title ?? "Propiedad"}
            </h2>
            <span className={`${styles.tag} ${STATUS_STYLE[property?.status ?? "draft"] ?? styles.tagInfo}`}>
              {property ? formatStatus(property.status) : "Estado"}
            </span>
            <span className={`${styles.tag} ${rppInfo.className}`}>{rppInfo.label}</span>
          </div>
          {property && (
            <div className={styles.meta}>
              <span>ID {shortenId(property.id)}</span>
              <span>
                {property.address.city}, {property.address.state}
              </span>
              <span className={styles.precio}>{formatCurrency(property.price.amount, property.price.currency)}</span>
              <span>Completitud {Math.round(property.completenessScore)}%</span>
            </div>
          )}
        </header>

        {loadingDetails && <span>Cargando detalles...</span>}
        {error && <span className={styles.tagDanger}>{error}</span>}

        {property && (
          <>
            <section className={styles.bloque}>
              <h3>Resumen</h3>
              <div className={styles.grid}>
                <span>Tipo: {property.propertyType}</span>
                <span>Habitaciones: {property.bedrooms ?? 0}</span>
                <span>Baños: {property.bathrooms ?? 0}</span>
                <span>Estacionamientos: {property.parkingSpots ?? 0}</span>
                <span>Creada: {formatDate(property.createdAt)}</span>
                {property.publishedAt && <span>Publicada: {formatDate(property.publishedAt)}</span>}
              </div>
            </section>

            <section className={styles.bloque}>
              <h3>Documentos y verificación</h3>
              <div className={styles.grid}>
                <span>RPP: {formatVerification(property.rppVerification ?? null)}</span>
                <span>Media cargada: {property.media.length}</span>
                <span>Documentos: {property.documents.length}</span>
              </div>
            </section>

            {authProfile && (
              <section className={styles.bloque}>
                <h3>Owner</h3>
                <div className={styles.grid}>
                  <span>{authProfile.name}</span>
                  <span>{authProfile.email}</span>
                </div>
              </section>
            )}

            {scheduleOpen && (
              <section className={styles.bloque}>
                <h3>Programar publicación</h3>
                <DateTimePicker
                  label="Fecha y hora"
                  value={scheduleAt}
                  onChange={value => setScheduleAt(value)}
                  min={new Date().toISOString()}
                />
                <div className={styles.acciones}>
                  <button type="button" className={styles.btn} onClick={() => setScheduleOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSchedule}
                    className={`${styles.btn} ${styles.btnPrimario}`}
                    disabled={loading.schedulePublish || !scheduleAt}
                  >
                    {loading.schedulePublish ? "Guardando..." : "Guardar programación"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        <footer className={styles.footer}>
          <div className={styles.acciones}>
            {property?.status === "draft" && (
              <button
                type="button"
                onClick={handlePublish}
                className={`${styles.btn} ${styles.btnPrimario}`}
                disabled={loading.publishProperty}
              >
                {loading.publishProperty ? "Publicando..." : "Publicar ahora"}
              </button>
            )}

            {property?.status === "published" && (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className={`${styles.btn} ${styles.btnFantasma}`}
                  disabled={loading.pauseProperty}
                >
                  {loading.pauseProperty ? "Pausando..." : "Pausar"}
                </button>
                <button type="button" onClick={() => setScheduleOpen(prev => !prev)} className={styles.btn}>
                  {scheduleOpen ? "Cerrar programación" : "Programar publicación"}
                </button>
              </>
            )}

            <button type="button" onClick={() => onEdit?.(property?.id ?? "")} className={styles.btn} disabled={!property}>
              Editar
            </button>
            <button type="button" onClick={() => property && onViewPublic?.(property)} className={styles.btn}>
              Ver en portal
            </button>
            {property?.status !== "sold" && (
              <button type="button" onClick={() => setShowMarkSold(true)} className={styles.btn}>
                Marcar como vendida
              </button>
            )}
            <button type="button" onClick={() => setShowDelete(true)} className={`${styles.btn} ${styles.btnPeligro}`}>
              Eliminar
            </button>
          </div>
        </footer>
      </aside>

      <MarkSoldModal open={showMarkSold} onClose={() => setShowMarkSold(false)} onConfirm={handleMarkSold} defaultDate={property?.soldAt ?? undefined} loading={loading.markSold} />
      <DeletePropertyModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={loading.deleteProperty}
        propertyTitle={property?.title}
      />
    </>
  );
}

export default QuickViewSheet;
