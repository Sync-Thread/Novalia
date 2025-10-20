import React, { useId, useRef } from "react";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatDate, formatVerification } from "../utils/format";
import styles from "./DocumentCard.module.css";

const typeLabels: Record<DocumentTypeDTO, string> = {
  rpp_certificate: "Certificado RPP",
  deed: "Escritura",
  id_doc: "Identificación",
  floorplan: "Plano",
  other: "Otro",
};

const verificationStyles: Record<VerificationStatusDTO, { bg: string; color: string }> = {
  pending: { bg: "rgba(234,179,8,0.15)", color: "#B45309" },
  verified: { bg: "rgba(16,185,129,0.18)", color: "#047857" },
  rejected: { bg: "rgba(248,113,113,0.18)", color: "#B91C1C" },
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
  const shouldAllowVerification = allowVerification ?? docType === "rpp_certificate";

  return (
    <div className={styles.card} aria-live="polite">
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h4 className={styles.title}>{typeLabels[docType]}</h4>
          <p className={styles.subtitle}>{isUploaded ? "Documento cargado" : "Sin documento adjunto"}</p>
        </div>
        <div className={styles.meta}>
          {isUploaded && document?.verification && (
            <span
              className={styles.statusTag}
              style={{
                background: verificationStyles[document.verification].bg,
                color: verificationStyles[document.verification].color,
              }}
            >
              {formatVerification(document.verification)}
            </span>
          )}
          <span className={styles.timestamp}>
            {isUploaded && document?.createdAt ? `Subido el ${formatDate(document.createdAt)}` : "Pendiente"}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={styles.primaryBtn}
          style={{ opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Subiendo..." : isUploaded ? "Reemplazar archivo" : "Adjuntar archivo"}
        </button>
        {isUploaded && onView && document?.url && (
          <button type="button" onClick={() => onView(document)} className={styles.secondaryBtn}>
            Ver documento
          </button>
        )}
        {isUploaded && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className={`${styles.secondaryBtn} ${styles.danger}`.trim()}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        )}
      </div>

      {shouldAllowVerification && isUploaded && onVerify && (
        <div className={styles.verifyRow}>
          <label htmlFor={`${baseId}-verification`} className={styles.verifyLabel}>
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
          {verifying && <span className={styles.verifyHint}>Actualizando...</span>}
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
    </div>
  );
}

export default DocumentCard;
