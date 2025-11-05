import React from "react";
import { useNavigate } from "react-router-dom";
import type { IContract } from "../../domain/entities/contractType";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MapPin,
  PenTool,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useContractsActions } from "../hooks/useContractsActions";
import styles from "./ContractDetailSideSheet.module.css";

interface DetailSheetProps {
  contract: IContract | null;
  onClose: () => void;
}

const ContractDetailSideSheet: React.FC<DetailSheetProps> = ({
  contract,
  onClose,
}) => {
  const navigate = useNavigate();
  const { downloadContract, loading } = useContractsActions();

  if (!contract) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";

    if (dateString.includes("T")) {
      return new Date(dateString).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const parts = dateString.split("/");
    if (parts.length !== 3) return dateString;

    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoney = (
    amount: number | undefined,
    currency: string = "MXN"
  ) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getContractTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      Intermediacion: "Intermediación",
      Oferta: "Oferta de Compra",
      Promesa: "Promesa de Compraventa",
    };
    return types[type] || type;
  };

  const getStatusBadgeClass = (estado: string) => {
    const classes: Record<string, string> = {
      Firmado: styles.badgeSuccess,
      PendienteDeFirma: styles.badgeWarning,
      Vigente: styles.badgeInfo,
      Rechazado: styles.badgeError,
      Archivado: styles.badgeNeutral,
    };
    return classes[estado] || styles.badgeNeutral;
  };

  const getStatusLabel = (estado: string) => {
    if (estado === "PendienteDeFirma") return "Pendiente de Firma";
    return estado.replace(/([A-Z])/g, " $1").trim();
  };

  const hasFile = Boolean(contract.s3Key);
  const isChecklistComplete = contract.porcentajeCompletado === 100;
  const canSign =
    hasFile &&
    isChecklistComplete &&
    contract.estadoFirma === "PendienteDeFirma";
  const canDelete = ["PendienteDeFirma", "draft"].includes(
    contract.estadoFirma || ""
  );

  const handleDownload = () => {
    if (contract.s3Key) {
      const fileName =
        contract.metadata?.fileName || `contrato-${contract.id}.pdf`;
      downloadContract(contract.s3Key, fileName);
    }
  };

  const handleSign = () => {
    navigate(`/contracts/${contract.id}/sign`);
    onClose();
  };

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.scrim} onClick={onClose} aria-label="Cerrar" />
      <aside
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-detail-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 id="contract-detail-title" className={styles.title}>
              {contract.propiedadNombre || "Contrato"}
            </h2>
            <p className={styles.subtitle}>
              {getContractTypeLabel(contract.tipoContrato)} •{" "}
              {contract.contraparte || "Sin cliente"} •{" "}
              {formatMoney(contract.monto, contract.moneda)}
            </p>
            <div className={styles.badges}>
              <span
                className={`${styles.badge} ${getStatusBadgeClass(contract.estadoFirma)}`}
              >
                {getStatusLabel(contract.estadoFirma)}
              </span>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollContent}>
          {/* Acciones principales */}
          <section className={styles.section}>
            {!hasFile ? (
              <div className={styles.uploadArea}>
                <Upload size={32} className={styles.uploadIcon} />
                <p className={styles.uploadTitle}>Subir archivo del contrato</p>
                <p className={styles.uploadSubtitle}>PDF, máximo 10MB</p>
                <button className={styles.btnPrimary}>
                  <Upload size={16} />
                  Seleccionar archivo
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <button
                  className={styles.btnSecondary}
                  onClick={handleDownload}
                  disabled={loading.download}
                  aria-label="Descargar contrato"
                >
                  <Download size={16} />
                  {loading.download ? "Descargando..." : "Descargar"}
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleSign}
                  disabled={!canSign}
                  aria-label={
                    canSign
                      ? "Firmar"
                      : "Completa el checklist para habilitar la firma"
                  }
                  title={
                    !canSign && !isChecklistComplete
                      ? "Completa el checklist para habilitar la firma"
                      : undefined
                  }
                >
                  <PenTool size={16} />
                  Firmar
                </button>
              </div>
            )}
            {hasFile && !isChecklistComplete && (
              <div className={styles.alert}>
                <AlertCircle size={16} />
                <span>Completa el checklist para habilitar la firma</span>
              </div>
            )}
          </section>

          {/* Entidades vinculadas */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Entidades Vinculadas</h3>
            <div className={styles.entitiesGrid}>
              {/* Propiedad */}
              <div className={styles.entityCard}>
                {contract.propiedadId ? (
                  <>
                    {contract.propiedadImagenUrl && (
                      <div className={styles.entityImage}>
                        <img
                          src={contract.propiedadImagenUrl}
                          alt={contract.propiedadNombre}
                        />
                      </div>
                    )}
                    <div className={styles.entityInfo}>
                      <div className={styles.entityIcon}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className={styles.entityLabel}>Propiedad</p>
                        <p className={styles.entityName}>
                          {contract.propiedadNombre}
                        </p>
                        <p className={styles.entityMeta}>
                          {contract.propiedadId}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.entityEmpty}>
                    <MapPin size={20} className={styles.entityEmptyIcon} />
                    <p>Sin propiedad asignada</p>
                    <button className={styles.btnLink}>
                      Asignar propiedad
                    </button>
                  </div>
                )}
              </div>

              {/* Cliente/Contraparte */}
              <div className={styles.entityCard}>
                {contract.contraparte ? (
                  <div className={styles.entityInfo}>
                    <div className={styles.entityIcon}>
                      <User size={16} />
                    </div>
                    <div>
                      <p className={styles.entityLabel}>Contraparte</p>
                      <p className={styles.entityName}>
                        {contract.contraparte}
                      </p>
                      <p className={styles.entityMeta}>
                        {formatMoney(contract.monto, contract.moneda)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.entityEmpty}>
                    <User size={20} className={styles.entityEmptyIcon} />
                    <p>Sin cliente asignado</p>
                    <button className={styles.btnLink}>Asignar cliente</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Preview del documento */}
          {hasFile && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Vista Previa del Documento
              </h3>
              <div className={styles.previewCard}>
                <div className={styles.previewIcon}>
                  <FileText size={32} />
                </div>
                <div className={styles.previewInfo}>
                  <p className={styles.previewName}>
                    {contract.metadata?.fileName ||
                      `contrato-${contract.id}.pdf`}
                  </p>
                  <div className={styles.previewMeta}>
                    <span>{formatFileSize(contract.metadata?.size)}</span>
                    <span>•</span>
                    <span>
                      Actualizado: {formatDate(contract.metadata?.uploadedAt)}
                    </span>
                  </div>
                </div>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                  Verificado
                </span>
              </div>
            </section>
          )}

          {/* Checklist */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Checklist Previo a Firma</h3>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${contract.porcentajeCompletado}%` }}
                  role="progressbar"
                  aria-valuenow={contract.porcentajeCompletado}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <span className={styles.progressText}>
                {contract.porcentajeCompletado}% completado
              </span>
            </div>
            <ul className={styles.checklist}>
              {contract.checklist && contract.checklist.length > 0 ? (
                contract.checklist.map((item) => (
                  <li key={item.id} className={styles.checklistItem}>
                    <div className={styles.checklistIcon}>
                      {item.completada ? (
                        <CheckCircle2
                          size={18}
                          className={styles.iconSuccess}
                        />
                      ) : (
                        <Clock size={18} className={styles.iconPending} />
                      )}
                    </div>
                    <span className={styles.checklistLabel}>{item.tarea}</span>
                  </li>
                ))
              ) : (
                <li className={styles.emptyState}>
                  No hay tareas registradas en el checklist
                </li>
              )}
            </ul>
          </section>

          {/* Expediente Digital */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Expediente Digital</h3>
              <button className={styles.btnLink}>
                <Plus size={14} />
                Agregar documento
              </button>
            </div>
            {contract.documentos && contract.documentos.length > 0 ? (
              <div className={styles.documentsList}>
                {contract.documentos.map((doc) => (
                  <div key={doc.id} className={styles.documentItem}>
                    <FileText size={18} className={styles.documentIcon} />
                    <div className={styles.documentInfo}>
                      <p className={styles.documentName}>{doc.nombre}</p>
                      <p className={styles.documentMeta}>
                        v{doc.version} • {formatDate(doc.fecha)} • {doc.origen}
                      </p>
                    </div>
                    <button
                      className={styles.btnIconSmall}
                      aria-label="Descargar documento"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>
                No hay documentos en el expediente
              </p>
            )}
          </section>

          {/* Información del Contrato */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Información del Contrato</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={styles.infoValue}>
                  {getContractTypeLabel(contract.tipoContrato)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Plantilla</span>
                <span className={styles.infoValue}>—</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Emisión</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.fechaCreacion)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Vencimiento</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.vigencia)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Creado</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.fechaCreacion)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Actualizado</span>
                <span className={styles.infoValue}>
                  {formatDate(contract.metadata?.uploadedAt)}
                </span>
              </div>
            </div>
          </section>

          {/* Zona de riesgo */}
          {canDelete && (
            <section className={styles.section}>
              <h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
                Zona de Riesgo
              </h3>
              <div className={styles.dangerZone}>
                <div>
                  <p className={styles.dangerLabel}>Eliminar contrato</p>
                  <p className={styles.dangerText}>
                    Esta acción no se puede deshacer. El contrato será eliminado
                    permanentemente.
                  </p>
                </div>
                <button className={styles.btnDanger}>
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ContractDetailSideSheet;
