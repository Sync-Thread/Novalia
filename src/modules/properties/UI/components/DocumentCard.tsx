// Tarjeta simple para documentos requeridos en propiedades.
// No tocar lógica de Application/Domain.
import React, { useId, useRef } from "react";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatDate, formatVerification } from "../utils/format";

const typeLabels: Record<DocumentTypeDTO, string> = {
  rpp_certificate: "Certificado RPP",
  deed: "Escritura",
  id_doc: "Identificación",
  floorplan: "Plano",
  other: "Otro",
};

const verificationTone: Record<VerificationStatusDTO, string> = {
  pending: "status status-warn",
  verified: "status status-success",
  rejected: "status status-error",
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
    <article className="card" aria-live="polite">
      <div className="card-body">
        <header className="stack" style={{ gap: "8px" }}>
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>{typeLabels[docType]}</h4>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              {isUploaded ? "Documento cargado" : "Sin documento adjunto"}
            </p>
          </div>
          <div className="card-meta" style={{ justifyContent: "space-between" }}>
            {isUploaded && document?.verification && (
              <span className={verificationTone[document.verification]}>{formatVerification(document.verification)}</span>
            )}
            <span>{isUploaded && document?.createdAt ? `Subido el ${formatDate(document.createdAt)}` : "Pendiente"}</span>
          </div>
        </header>

        <div className="stack" style={{ gap: "8px" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading ? "Subiendo..." : isUploaded ? "Reemplazar archivo" : "Adjuntar archivo"}
          </button>
          {isUploaded && onView && document?.url && (
            <button type="button" onClick={() => onView(document)} className="btn">
              Ver documento
            </button>
          )}
          {isUploaded && onDelete && (
            <button type="button" onClick={onDelete} disabled={deleting} className="btn btn-ghost" style={{ color: "var(--danger)" }}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          )}
        </div>

        {shouldAllowVerification && isUploaded && onVerify && (
          <div className="stack" style={{ gap: "6px" }}>
            <label htmlFor={`${baseId}-verification`} className="field-label">
              Estado de verificación
            </label>
            <select
              id={`${baseId}-verification`}
              defaultValue={document?.verification ?? "pending"}
              onChange={event => onVerify(event.target.value as VerificationStatusDTO)}
              disabled={verifying}
              className="select"
            >
              <option value="pending">Pendiente</option>
              <option value="verified">Verificado</option>
              <option value="rejected">Rechazado</option>
            </select>
            {verifying && <span className="muted" style={{ fontSize: "0.8rem" }}>Actualizando...</span>}
          </div>
        )}
      </div>

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
