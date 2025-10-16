import React, { useId, useRef } from "react";
import type { DocumentDTO, DocumentTypeDTO, VerificationStatusDTO } from "../../application/dto/DocumentDTO";
import { formatDate, formatVerification } from "../utils/format";

const typeLabels: Record<DocumentTypeDTO, string> = {
  rpp_certificate: "Certificado RPP",
  deed: "Escritura",
  id_doc: "IdentificaciÃ³n",
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "18px 20px",
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#fff",
        boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      aria-live="polite"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {typeLabels[docType]}
          </h4>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            {isUploaded ? "Documento cargado" : "Sin documento adjunto"}
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isUploaded && document?.verification && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                background: verificationStyles[document.verification].bg,
                color: verificationStyles[document.verification].color,
              }}
            >
              {formatVerification(document.verification)}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            {isUploaded ? `Subido el ${formatDate(document?.createdAt)}` : "Pendiente"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            ...primaryButtonStyle,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Subiendoâ€¦" : isUploaded ? "Reemplazar archivo" : "Adjuntar archivo"}
        </button>
        {isUploaded && onView && document?.url && (
          <button
            type="button"
            onClick={() => onView(document)}
            style={secondaryButtonStyle}
          >
            Ver documento
          </button>
        )}
        {isUploaded && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            style={{
              ...secondaryButtonStyle,
              color: "#b91c1c",
              borderColor: "rgba(239,68,68,0.4)",
            }}
          >
            {deleting ? "Eliminandoâ€¦" : "Eliminar"}
          </button>
        )}
      </div>

      {shouldAllowVerification && isUploaded && onVerify && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label
            htmlFor={`${baseId}-verification`}
            style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}
          >
            Estado de verificaciÃ³n
          </label>
          <select
            id={`${baseId}-verification`}
            defaultValue={document?.verification ?? "pending"}
            onChange={event => onVerify(event.target.value as VerificationStatusDTO)}
            disabled={verifying}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.5)",
              padding: "8px 12px",
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <option value="pending">Pendiente</option>
            <option value="verified">Verificado</option>
            <option value="rejected">Rechazado</option>
          </select>
          {verifying && <span style={{ fontSize: 12, color: "#64748b" }}>Actualizandoâ€¦</span>}
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

const primaryButtonStyle: React.CSSProperties = {
  background: "#295DFF",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(41,93,255,0.18)",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#fff",
  color: "#1e293b",
  border: "1px solid rgba(148,163,184,0.5)",
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

export default DocumentCard;

