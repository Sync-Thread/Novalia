// Sheet lateral de detalles rápidos. No modifica lógica de casos de uso; solo invoca use cases existentes.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Rocket,
  ShieldAlert,
  ShoppingBag,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PropertyDTO } from "../../../../../application/dto/PropertyDTO";
import type { DocumentDTO } from "../../../../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../../../../application/ports/AuthService";
import { usePropertiesActions } from "../../../../hooks/usePropertiesActions";
import ProgressCircle from "../../../../components/ProgressCircle";
import Modal from "../../../../components/Modal";
import MarkSoldModal from "../../../../modals/MarkSoldModal";
import {
  formatCurrency,
  formatDate,
  formatStatus,
  formatVerification,
  shortenId,
} from "../../../../utils/format";
import {
  PROPERTY_TYPE_LABEL,
  OPERATION_LABEL,
  RPP_BADGE,
  CHECKLIST_LABELS,
  focusableSelectors,
  STEP_LINKS,
  type VerificationState,
} from "./constants";
import {
  computeChecklist,
  getStatusTone,
  getBadgeClass,
  deriveRppStatus,
} from "./helpers";

type ExtendedProperty = PropertyDTO & {
  metrics?: {
    views?: number;
    leads?: number;
    chats?: number;
    updatedAt?: string;
  };
  media?: Array<{ id: string }>;
};

export interface PropertyQuickViewProps {
  open: boolean;
  onClose: () => void;
  propertyId: string | null;
  onRefresh?: () => void;
  onEdit?: (propertyId: string, step?: string) => void;
}

export function PropertyQuickView({
  open,
  onClose,
  propertyId,
  onRefresh,
  onEdit,
}: PropertyQuickViewProps) {
  const {
    getProperty,
    listDocuments,
    publishProperty,
    pauseProperty,
    markSold,
    deleteProperty,
    getAuthProfile,
    loading,
  } = usePropertiesActions();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const [property, setProperty] = useState<ExtendedProperty | null>(null);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [markSoldOpen, setMarkSoldOpen] = useState(false);

  const rppStatus = useMemo<VerificationState>(() => {
    if (!property) {
      return "pending";
    }
    return deriveRppStatus(documents, property.rppVerification ?? null);
  }, [documents, property]);

  const checklist = useMemo(
    () => computeChecklist(property, documents, authProfile),
    [authProfile, documents, property]
  );

  const mediaCount = useMemo(
    () => property?.media?.length ?? 0,
    [property?.media]
  );
  const extraMedia = useMemo(() => Math.max(mediaCount - 2, 0), [mediaCount]);

  useEffect(() => {
    if (!open || !propertyId) return;
    let active = true;
    setLoadingData(true);
    setError(null);
    setProperty(null);
    setDocuments([]);

    const fetchData = async () => {
      const propertyResult = await getProperty(propertyId);
      if (!active) return;
      if (propertyResult.isOk()) {
        setProperty(propertyResult.value as ExtendedProperty);
      } else {
        setError("No pudimos cargar la propiedad seleccionada.");
      }

      const docsResult = await listDocuments(propertyId);
      if (!active) return;
      if (docsResult.isOk()) {
        setDocuments(docsResult.value);
      }

      setLoadingData(false);
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [getProperty, listDocuments, open, propertyId]);

  useEffect(() => {
    if (!open || authProfile) return;
    let active = true;

    const fetchProfile = async () => {
      const profileResult = await getAuthProfile();
      if (!active) return;
      if (profileResult.isOk()) {
        setAuthProfile(profileResult.value);
      }
    };

    void fetchProfile();

    return () => {
      active = false;
    };
  }, [authProfile, getAuthProfile, open]);

  useEffect(() => {
    if (!open) return;
    lastFocusedElement.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        panel.focus();
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
      }
      setConfirmDeleteOpen(false);
      setMarkSoldOpen(false);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  const closeSheet = useCallback(() => {
    onClose();
  }, [onClose]);

  const refreshAndClose = useCallback(() => {
    onRefresh?.();
    closeSheet();
  }, [closeSheet, onRefresh]);

  const handlePause = useCallback(async () => {
    if (!property) return;
    const result = await pauseProperty({ id: property.id });
    // TODO(LÓGICA): manejar errores → toast y mantener abierto.
    if (result.isOk()) {
      refreshAndClose();
    }
  }, [pauseProperty, property, refreshAndClose]);

  const handlePublish = useCallback(async () => {
    if (!property) return;
    const result = await publishProperty({ id: property.id });
    if (result.isOk()) {
      refreshAndClose();
    }
  }, [publishProperty, property, refreshAndClose]);

  const handleDelete = useCallback(async () => {
    if (!property) return;
    const result = await deleteProperty({ id: property.id });
    // TODO(LÓGICA): manejar errores → toast y mantener abierto.
    if (result.isOk()) {
      refreshAndClose();
    }
  }, [deleteProperty, property, refreshAndClose]);

  const handleMarkSold = useCallback(
    async (soldAt: Date) => {
      if (!property) return;
      const result = await markSold({ id: property.id, soldAt });
      if (result.isOk()) {
        setMarkSoldOpen(false);
        refreshAndClose();
      }
    },
    [markSold, property, refreshAndClose]
  );

  const handleEdit = useCallback(() => {
    if (!property) return;
    if (onEdit) {
      onEdit(property.id);
      closeSheet();
      return;
    }
    navigate(`/properties/${property.id}/edit`);
    closeSheet();
  }, [closeSheet, navigate, onEdit, property]);

  const goToWizardStep = useCallback(
    (step: string) => {
      if (!property) return;
      if (onEdit) {
        onEdit(property.id, step);
      } else {
        navigate(`/properties/${property.id}/edit?step=${step}`);
      }
      closeSheet();
    },
    [closeSheet, navigate, onEdit, property]
  );

  const isDraft = property?.status === "draft";
  const savedCompleteness = Math.round(property?.completenessScore ?? 0);
  const publishButtonClass = isDraft
    ? "btn btn-primary btn-sm quickview-cta"
    : "btn btn-ghost btn-sm quickview-cta";

  if (!open) return null;

  return (
    <>
      <div className="sheet" role="presentation">
        <div
          role="presentation"
          className="quickview-scrim"
          onClick={closeSheet}
          style={{ cursor: "pointer" }}
        />
        <aside
          ref={panelRef}
          className="sheet-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-quickview-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-ghost btn-icon sheet-close"
            onClick={closeSheet}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          <div className="sheet-body">
            <header className="quickview-header">
              <div className="quickview-header__left">
                <div className="quickview-header__title">
                  <h2
                    id="property-quickview-title"
                    ref={headingRef}
                    tabIndex={-1}
                  >
                    {property?.title ?? "Propiedad"}
                  </h2>
                  <div className="quickview-header__tags">
                    {property && (
                      <span
                        className={getBadgeClass(
                          getStatusTone(property.status)
                        )}
                      >
                        {formatStatus(property.status)}
                      </span>
                    )}
                    {property?.id && (
                      <span className="badge badge-neutral quickview-id">
                        {shortenId(property.id)}
                      </span>
                    )}
                  </div>
                </div>
                {property && (
                  <div className="quickview-header__subtitle">
                    <span className="quickview-price">
                      {formatCurrency(
                        property.price.amount,
                        property.price.currency
                      )}
                    </span>
                    <span className="muted">
                      <MapPin size={14} />
                      {property.address.city}, {property.address.state}
                    </span>
                    <span className="muted">
                      <Layers size={14} />
                      {PROPERTY_TYPE_LABEL[property.propertyType]} •{" "}
                      {OPERATION_LABEL[property.operationType]}
                    </span>
                  </div>
                )}
              </div>
              <div className="quickview-header__right">
                <div className="quickview-progress">
                  <ProgressCircle value={savedCompleteness} size={72} />
                  <span className="muted quickview-progress__label">
                    Guardado {savedCompleteness}%
                  </span>
                </div>
                <span className={getBadgeClass(RPP_BADGE[rppStatus].tone)}>
                  {RPP_BADGE[rppStatus].label}
                </span>
              </div>
            </header>

            {loadingData && (
              <section className="quickview-section">
                <p className="muted">Cargando detalles...</p>
              </section>
            )}

            {error && (
              <section className="quickview-section">
                <div className="quickview-alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              </section>
            )}

            {property && !loadingData && (
              <>
                <section className="quickview-section">
                  <h3>Resumen visual</h3>
                  <div className="quickview-gallery">
                    <div className="quickview-thumb">
                      <div className="placeholder" aria-hidden="true">
                        <ImageIcon size={24} />
                      </div>
                    </div>
                    <div className="quickview-thumb">
                      <div className="placeholder" aria-hidden="true">
                        <ImageIcon size={24} />
                      </div>
                    </div>
                    <div className="quickview-thumb quickview-thumb--more">
                      <div className="placeholder" aria-hidden="true">
                        <span>{extraMedia > 0 ? `+${extraMedia}` : "+N"}</span>
                      </div>
                    </div>
                  </div>
                  {/* TODO(IMAGEN): integrar galería real cuando media API esté disponible. */}
                </section>

                <section className="quickview-section">
                  <h3>Datos clave</h3>
                  <div className="quickview-grid">
                    <div>
                      <strong>{property.bedrooms ?? 0}</strong>
                      <span>Recámaras</span>
                    </div>
                    <div>
                      <strong>{property.bathrooms ?? 0}</strong>
                      <span>Baños</span>
                    </div>
                    <div>
                      <strong>{property.parkingSpots ?? 0}</strong>
                      <span>Estacionamientos</span>
                    </div>
                    <div>
                      <strong>{property.constructionM2 ?? 0} m²</strong>
                      <span>Construcción</span>
                    </div>
                    <div>
                      <strong>{property.landM2 ?? 0} m²</strong>
                      <span>Terreno</span>
                    </div>
                    <div>
                      <strong>{property.levels ?? 0}</strong>
                      <span>Niveles</span>
                    </div>
                    <div>
                      <strong>{property.yearBuilt ?? "—"}</strong>
                      <span>Año</span>
                    </div>
                    <div>
                      <strong>
                        {property.createdAt
                          ? formatDate(property.createdAt)
                          : "—"}
                      </strong>
                      <span>Creada</span>
                    </div>
                  </div>
                </section>

                <section className="quickview-section">
                  <h3>Calidad & Revisión</h3>
                  <ul className="quickview-checklist">
                    {STEP_LINKS.map(({ key, step }) => {
                      const ok = checklist[key];
                      const Icon = ok ? CheckCircle2 : ShieldAlert;
                      const handleNavigate = () => {
                        if (!ok) {
                          goToWizardStep(step);
                        }
                      };
                      return (
                        <li key={key}>
                          <div className="quickview-checklist__item">
                            <Icon
                              size={18}
                              className={
                                ok
                                  ? "quickview-icon--ok"
                                  : "quickview-icon--warn"
                              }
                            />
                            <span className="quickview-checklist__label ellipsis">
                              {CHECKLIST_LABELS[key]}
                            </span>
                          </div>
                          {!ok && (
                            <button
                              type="button"
                              className="link ml-auto nowrap quickview-link"
                              onClick={handleNavigate}
                            >
                              Ir a completar →
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="quickview-section">
                  <h3>Actividad</h3>
                  <div className="quickview-activity">
                    <div>
                      <strong>{property.metrics?.views ?? 0}</strong>
                      <span>Vistas (30d)</span>
                    </div>
                    <div>
                      <strong>{property.metrics?.leads ?? 0}</strong>
                      <span>Leads</span>
                    </div>
                    <div>
                      <strong>{property.metrics?.chats ?? 0}</strong>
                      <span>Chats</span>
                    </div>
                  </div>
                  <p className="muted quickview-note">
                    {/* TODO(MÉTRICAS): conectar con telemetría real. */}
                    Última actualización:{" "}
                    {property.metrics?.updatedAt
                      ? formatDate(property.metrics.updatedAt)
                      : formatDate(property.updatedAt)}
                  </p>
                </section>

                <section className="quickview-section">
                  <h3>Documentos & Media</h3>
                  <div className="quickview-docs">
                    <div>
                      <span>Fotos</span>
                      <strong>{mediaCount}</strong>
                    </div>
                    <div>
                      <span>Videos</span>
                      <strong>0</strong>
                    </div>
                    <div>
                      <span>Planos</span>
                      <strong>0</strong>
                    </div>
                    <div
                      className={`quickview-docs__rpp quickview-docs__rpp--${rppStatus}`}
                    >
                      <span>RPP</span>
                      <span
                        className={getBadgeClass(RPP_BADGE[rppStatus].tone)}
                      >
                        {formatVerification(rppStatus)}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          <footer className="sheet-footer">
            <div className="quickview-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handlePause}
                disabled={isDraft || loading.pauseProperty || !property}
                title={
                  isDraft
                    ? "No se puede pausar una propiedad en borrador"
                    : "Pausar publicación"
                }
              >
                {loading.pauseProperty ? "Pausando..." : "Pausar"}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleEdit}
                disabled={!property}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={loading.deleteProperty || !property}
              >
                Eliminar
              </button>
              <button
                type="button"
                className={publishButtonClass}
                onClick={isDraft ? handlePublish : undefined}
                disabled={
                  !property || (isDraft ? loading.publishProperty : true)
                }
                title={
                  isDraft
                    ? "Publica la propiedad para que aparezca en tu inventario."
                    : "Disponibilidad de vista pública en desarrollo."
                }
              >
                {isDraft ? (
                  <>
                    {loading.publishProperty ? (
                      <Loader2 size={14} aria-hidden="true" />
                    ) : (
                      <Rocket size={14} aria-hidden="true" />
                    )}
                    <span>
                      {loading.publishProperty
                        ? "Publicando..."
                        : "Publicar propiedad"}
                    </span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={14} aria-hidden="true" />
                    <span>Ver publicación</span>
                  </>
                )}
              </button>
              {!isDraft && property?.status === "published" && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setMarkSoldOpen(true)}
                  disabled={loading.markSold || !property}
                  title="Marcar esta propiedad como vendida"
                >
                  <ShoppingBag size={14} aria-hidden="true" />
                  <span>Marcar como vendida</span>
                </button>
              )}
            </div>
          </footer>
        </aside>
      </div>

      {/* Modal de confirmación de eliminación */}
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="¿Eliminar propiedad?"
        zIndex={1100}
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                setConfirmDeleteOpen(false);
                await handleDelete();
              }}
              disabled={loading.deleteProperty}
            >
              {loading.deleteProperty ? "Eliminando..." : "Eliminar"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
          Esta acción eliminará permanentemente la propiedad{" "}
          <strong>{property?.title ? `"${property.title}"` : ""}</strong>,
          incluyendo todas sus imágenes, documentos y datos asociados. Esta
          operación no se puede deshacer.
        </p>
      </Modal>

      <MarkSoldModal
        open={markSoldOpen}
        onClose={() => setMarkSoldOpen(false)}
        defaultDate={property?.soldAt ?? undefined}
        loading={loading.markSold}
        onConfirm={({ soldAt }) => {
          void handleMarkSold(new Date(soldAt));
        }}
      />
    </>
  );
}

export default PropertyQuickView;
