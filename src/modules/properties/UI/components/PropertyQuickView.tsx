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
  Copy,
  ImageIcon,
  Layers,
  MapPin,
  ShieldAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PropertyDTO } from "../../application/dto/PropertyDTO";
import type { DocumentDTO } from "../../application/dto/DocumentDTO";
import type { AuthProfile } from "../../application/ports/AuthService";
import { usePropertiesActions } from "../hooks/usePropertiesActions";
import ProgressCircle from "./ProgressCircle";
import Modal from "./Modal";
import {
  formatCurrency,
  formatDate,
  formatStatus,
  formatVerification,
  shortenId,
} from "../utils/format";

type VerificationState = "pending" | "verified" | "rejected";

type ExtendedProperty = PropertyDTO & {
  metrics?: {
    views?: number;
    leads?: number;
    chats?: number;
    updatedAt?: string;
  };
  media?: Array<{ id: string }>;
};

const PROPERTY_TYPE_LABEL: Record<PropertyDTO["propertyType"], string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  office: "Oficina",
  commercial: "Comercial",
  industrial: "Industrial",
  other: "Otro",
};

const OPERATION_LABEL: Record<PropertyDTO["operationType"], string> = {
  sale: "Venta",
  rent: "Renta",
};

const STATUS_BADGE: Record<PropertyDTO["status"], "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  sold: "success",
  archived: "neutral",
};

const RPP_BADGE: Record<VerificationState, { label: string; tone: "success" | "warning" | "danger" }> = {
  pending: { label: "RPP pendiente", tone: "warning" },
  verified: { label: "RPP verificado", tone: "success" },
  rejected: { label: "RPP rechazado", tone: "danger" },
};

const CHECKLIST_LABELS = {
  kycOk: "KYC del publicador verificado",
  completenessOk: "Completitud ≥ 80%",
  rppOk: "RPP cargado",
  coreOk: "Precio, tipo y ubicación definidos",
};

export interface PropertyQuickViewProps {
  open: boolean;
  onClose: () => void;
  propertyId: string | null;
  onRefresh?: () => void;
  onEdit?: (propertyId: string, step?: string) => void;
}

interface ChecklistState {
  kycOk: boolean;
  completenessOk: boolean;
  rppOk: boolean;
  coreOk: boolean;
}

const STORAGE_KEY_COPY = "property-quickview-id";

const focusableSelectors = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Cálculo UI-only. No reemplaza políticas de dominio.
function computeChecklist(
  property: PropertyDTO | null,
  docs: DocumentDTO[],
  profile: AuthProfile | null,
): ChecklistState {
  const kycOk = (profile?.kycStatus ?? "pending") === "verified";
  const completenessOk = (property?.completenessScore ?? 0) >= 80;
  const rppDoc =
    docs.find((doc) => doc.docType === "rpp_certificate") ?? null;
  const rppOk = Boolean(
    rppDoc && rppDoc.verification !== "rejected",
  );
  const priceDefined = Boolean(
    property?.price && Number(property.price.amount) > 0,
  );
  const typeDefined = Boolean(property?.propertyType);
  const locationDefined = Boolean(
    property?.address?.city && property?.address?.state,
  );
  const coreOk = priceDefined && typeDefined && locationDefined;
  return { kycOk, completenessOk, rppOk, coreOk };
}

function getStatusTone(status: PropertyDTO["status"]): "success" | "warning" | "neutral" {
  return STATUS_BADGE[status] ?? "neutral";
}

function getBadgeClass(tone: "success" | "warning" | "neutral" | "danger"): string {
  switch (tone) {
    case "success":
      return "badge badge-success";
    case "warning":
      return "badge badge-warning";
    case "danger":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

function deriveRppStatus(docs: DocumentDTO[], verification?: VerificationState | null): VerificationState {
  if (verification) return verification;
  const doc = docs.find((item) => item.docType === "rpp_certificate");
  return doc?.verification ?? "pending";
}

const STEP_LINKS: Array<{ key: keyof ChecklistState; step: string }> = [
  { key: "kycOk", step: "basics" },
  { key: "completenessOk", step: "publish" },
  { key: "rppOk", step: "publish" },
  { key: "coreOk", step: "location" },
];

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
    pauseProperty,
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

  const rppStatus = useMemo<VerificationState>(() => {
    if (!property) {
      return "pending";
    }
    return deriveRppStatus(documents, property.rppVerification ?? null);
  }, [documents, property]);

  const checklist = useMemo(
    () => computeChecklist(property, documents, authProfile),
    [authProfile, documents, property],
  );

  const mediaCount = useMemo(() => property?.media?.length ?? 0, [property?.media]);
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
        panel.querySelectorAll<HTMLElement>(focusableSelectors),
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
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
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

  const handleCopyId = useCallback(() => {
    if (!property?.id) return;
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(property.id);
      }
    } catch {
      // Ignorar errores de clipboard en navegadores sin soporte.
    }
    sessionStorage.setItem(STORAGE_KEY_COPY, property.id);
  }, [property?.id]);

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

  const handleDelete = useCallback(async () => {
    if (!property) return;
    const result = await deleteProperty({ id: property.id });
    // TODO(LÓGICA): manejar errores → toast y mantener abierto.
    if (result.isOk()) {
      refreshAndClose();
    }
  }, [deleteProperty, property, refreshAndClose]);

  const handleEdit = useCallback(() => {
    if (!property) return;
    if (onEdit) {
      onEdit(property.id);
      closeSheet();
      return;
    }
    navigate(`/properties/${property.id}/admin`);
    closeSheet();
  }, [closeSheet, navigate, onEdit, property]);

  const goToWizardStep = useCallback(
    (step: string) => {
      if (!property) return;
      if (onEdit) {
        onEdit(property.id, step);
      } else {
        navigate(`/properties/${property.id}/admin?step=${step}`);
      }
      closeSheet();
    },
    [closeSheet, navigate, onEdit, property],
  );

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
                      <span className={getBadgeClass(getStatusTone(property.status))}>
                        {formatStatus(property.status)}
                      </span>
                    )}
                    {property?.id && (
                      <span className="badge badge-neutral quickview-id">{shortenId(property.id)}</span>
                    )}
                    {property?.id && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm quickview-copy"
                        onClick={handleCopyId}
                      >
                        <Copy size={14} />
                        Copiar ID
                      </button>
                    )}
                  </div>
                </div>
                {property && (
                  <div className="quickview-header__subtitle">
                    <span className="quickview-price">
                      {formatCurrency(property.price.amount, property.price.currency)}
                    </span>
                    <span className="muted">
                      <MapPin size={14} />
                      {property.address.city}, {property.address.state}
                    </span>
                    <span className="muted">
                      <Layers size={14} />
                      {PROPERTY_TYPE_LABEL[property.propertyType]} • {OPERATION_LABEL[property.operationType]}
                    </span>
                  </div>
                )}
              </div>
              <div className="quickview-header__right">
                <ProgressCircle value={property?.completenessScore ?? 0} size={72} />
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
                      <strong>{property.createdAt ? formatDate(property.createdAt) : "—"}</strong>
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
                            <Icon size={18} className={ok ? "quickview-icon--ok" : "quickview-icon--warn"} />
                            <span className="quickview-checklist__label ellipsis">{CHECKLIST_LABELS[key]}</span>
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
                    <div className={`quickview-docs__rpp quickview-docs__rpp--${rppStatus}`}>
                      <span>RPP</span>
                      <span className={getBadgeClass(RPP_BADGE[rppStatus].tone)}>
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
                disabled={loading.pauseProperty || !property}
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
                className="btn btn-ghost btn-sm"
                disabled
                title="Pendiente de implementar"
              >
                Ver publicación
              </button>
            </div>
          </footer>
        </aside>
      </div>

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="¿Eliminar propiedad?"
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDeleteOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={loading.deleteProperty}
            >
              {loading.deleteProperty ? "Eliminando..." : "Eliminar"}
            </button>
          </>
        }
      >
        <p>Esta acción no puede deshacerse. La propiedad se eliminará del listado.</p>
      </Modal>
    </>
  );
}

export default PropertyQuickView;
