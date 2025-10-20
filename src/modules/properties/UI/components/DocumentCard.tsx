import React, { useId, useRef } from "react";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatDate, formatVerification } from "../utils/format";
import styles from "./DocumentCard.module.css";

const LABELS: Record<DocumentTypeDTO, string> = {
  rpp_certificate: "Certificado RPP",
  deed: "Escritura",
  id_doc: "Identificación",
  floorplan: "Plano",
  other: "Otro",
};

const STATUS_STYLE: Record<VerificationStatusDTO, { bg: string; color: string }> = {
  pending: { bg: "rgba(234,179,8,0.18)", color: "#b45309" },
  verified: { bg: "rgba(16,185,129,0.18)", color: "#047857" },
  rejected: { bg: "rgba(248,113,113,0.18)", color: "#b91c1c" },
};

export interface DocumentCardProps {
  docType: DocumentTypeDTO;
  document?: DocumentDTO | null;
  onUpload?: (file: File) => void;
  onDelete?: () => void;
  onView?: (document: DocumentDTO) => void;
  onVerify?: (status: VerificationStatusDTO) => void;
  uploading?: boolean;
  deleting?: boolean;
  verifying?: boolean;
  allowVerification?: boolean;
}

/**
 * Tarjeta para gestionar la carga y verificación de un documento específico.
 * Mantiene el API y solo interviene en estilos.
 */
export function DocumentCard({
  docType,
  document = null,
  onUpload,
  onDelete,
  onView,
  onVerify,
  uploading,
  deleting,
  verifying,
  allowVerification,
}: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseId = useId();
  const isUploaded = Boolean(document);
  const canVerify = allowVerification ?? docType === "rpp_certificate";

  const triggerFileDialog = () => fileInputRef.current?.click();

  return (
    <article className={styles.tarjeta} aria-live="polite">
      <header className={styles.encabezado}>
        <div>
          <h4 className={styles.titulo}>{LABELS[docType]}</h4>
          <p className={styles.descripcion}>{isUploaded ? "Documento cargado" : "Sin documento adjunto"}</p>
        </div>
        <div className={styles.meta}>
          {isUploaded && document?.verification && (
            <span
              className={styles.estado}
              style={{
                background: STATUS_STYLE[document.verification].bg,
                color: STATUS_STYLE[document.verification].color,
              }}
            >
              {formatVerification(document.verification)}
            </span>
          )}
          <span>{isUploaded && document?.createdAt ? `Subido el ${formatDate(document.createdAt)}` : "Pendiente"}</span>
        </div>
      </header>

      <div className={styles.acciones}>
        <button type="button" onClick={triggerFileDialog} disabled={uploading} className={`${styles.boton} ${styles.botonPrimario}`}>
          {uploading ? "Subiendo..." : isUploaded ? "Reemplazar archivo" : "Adjuntar archivo"}
        </button>
        {isUploaded && onView && document?.url && (
          <button type="button" onClick={() => onView(document)} className={styles.boton}>
            Ver documento
          </button>
        )}
        {isUploaded && onDelete && (
          <button type="button" onClick={onDelete} disabled={deleting} className={`${styles.boton} ${styles.botonPeligro}`}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        )}
      </div>

      {canVerify && isUploaded && onVerify && (
        <div className={styles.acciones}>
          <label htmlFor={`${baseId}-verification`} className={styles.titulo}>
            Estado de verificación
          </label>
          <select
            id={`${baseId}-verification`}
            defaultValue={document?.verification ?? "pending"}
            onChange={event => onVerify(event.target.value as VerificationStatusDTO)}
            disabled={verifying}
            className={styles.select}
          >
            <option value="pending">Pendiente</option>
            <option value="verified">Verificado</option>
            <option value="rejected">Rechazado</option>
          </select>
          {verifying && <span className={styles.ayuda}>Actualizando...</span>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={docType === "id_doc" ? "image/*,.pdf" : ".pdf,image/*"}
        style={{ display: "none" }}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file && onUpload) {
            onUpload(file);
            event.target.value = "";
          }
        }}
      />
    </article>
  );
}

export default DocumentCard;
