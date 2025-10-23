import { useId, useRef } from "react";
import type {
  DocumentDTO,
  DocumentTypeDTO,
  VerificationStatusDTO,
} from "../../../../application/dto/DocumentDTO";
import { formatDate, formatVerification } from "../../../utils/format";
import styles from "./DocumentCard.module.css";

const LABELS: Record<DocumentTypeDTO, string> = {
  deed: "Escritura",
  plan: "Planos",
  other: "Otros",
};

const STATUS_STYLE: Record<
  VerificationStatusDTO,
  { bg: string; color: string }
> = {
  pending: { bg: "rgba(234,179,8,0.18)", color: "#b45309" },
  verified: { bg: "rgba(16,185,129,0.18)", color: "#047857" },
  rejected: { bg: "rgba(248,113,113,0.18)", color: "#b91c1c" },
};

export interface DocumentCardProps {
  docType: DocumentTypeDTO;
  documents?: DocumentDTO[]; // Cambiado a array para soportar múltiples
  document?: DocumentDTO | null; // Mantener para compatibilidad
  onUpload?: (file: File) => void;
  onDelete?: (documentId: string) => void; // Agregado ID para identificar cual eliminar
  onView?: (document: DocumentDTO) => void;
  onVerify?: (status: VerificationStatusDTO) => void;
  uploading?: boolean;
  deleting?: boolean;
  verifying?: boolean;
  allowVerification?: boolean;
  allowMultiple?: boolean; // Nuevo: permitir múltiples archivos
}

/**
 * Tarjeta para gestionar la carga y verificación de un documento específico.
 * Mantiene el API y solo interviene en estilos.
 */
export function DocumentCard({
  docType,
  documents = [],
  document = null,
  onUpload,
  onDelete,
  onView,
  onVerify,
  uploading,
  deleting,
  verifying,
  allowVerification,
  allowMultiple = false,
}: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseId = useId();

  // Combinar document y documents en un solo array
  const allDocuments =
    documents && documents.length > 0 ? documents : document ? [document] : [];

  const isUploaded = allDocuments.length > 0;
  const canVerify = allowVerification ?? false;

  const triggerFileDialog = () => fileInputRef.current?.click();

  // Extraer información del archivo
  const getFileExtension = (doc: DocumentDTO) => {
    if (!doc?.metadata) return "FILE";
    const metadata = doc.metadata as {
      fileName?: string;
      contentType?: string;
    };

    // Intentar obtener extensión del fileName
    if (metadata.fileName) {
      const parts = metadata.fileName.split(".");
      if (parts.length > 1) {
        return parts[parts.length - 1].toUpperCase();
      }
    }

    // Fallback: obtener de contentType
    if (metadata.contentType) {
      if (metadata.contentType.includes("pdf")) return "PDF";
      if (metadata.contentType.includes("image")) return "IMG";
      if (metadata.contentType.includes("word")) return "DOC";
    }

    return "FILE";
  };

  const getFileName = (doc: DocumentDTO) => {
    if (!doc?.metadata) return "Documento";
    const metadata = doc.metadata as { fileName?: string };
    return metadata.fileName || "Documento sin nombre";
  };

  return (
    <article className={styles.tarjeta} aria-live="polite">
      <header className={styles.encabezado}>
        <div>
          <h4 className={styles.titulo}>{LABELS[docType]}</h4>
          <p className={styles.descripcion}>
            {isUploaded
              ? `${allDocuments.length} documento${allDocuments.length !== 1 ? "s" : ""} cargado${allDocuments.length !== 1 ? "s" : ""}`
              : "Sin documento adjunto"}
          </p>
        </div>
      </header>

      {/* Lista de archivos subidos */}
      {isUploaded && allDocuments.length > 0 && (
        <div className={styles.archivoLista}>
          {allDocuments.map((doc) => (
            <div key={doc.id} className={styles.archivoItem}>
              {/* Icono de tipo de archivo */}
              <div className={styles.archivoIcono}>
                <span className={styles.archivoExt}>
                  {getFileExtension(doc)}
                </span>
              </div>

              {/* Información del archivo */}
              <div className={styles.archivoInfo}>
                <p className={styles.archivoNombre}>{getFileName(doc)}</p>
                <p className={styles.archivoFecha}>
                  {formatDate(doc.createdAt)}
                  {doc.verification && (
                    <span
                      className={styles.estadoChip}
                      style={{
                        background: STATUS_STYLE[doc.verification].bg,
                        color: STATUS_STYLE[doc.verification].color,
                      }}
                    >
                      {formatVerification(doc.verification)}
                    </span>
                  )}
                </p>
              </div>

              {/* Acciones del archivo */}
              <div className={styles.archivoAcciones}>
                {onView && doc.url && (
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    className={styles.botonIcono}
                    title="Ver documento"
                  >
                    👁️
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    disabled={deleting}
                    className={styles.botonIcono}
                    title="Eliminar"
                  >
                    {deleting ? "⏳" : "🗑️"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subir/reemplazar */}
      <div className={styles.acciones}>
        <button
          type="button"
          onClick={triggerFileDialog}
          disabled={uploading}
          className={`${styles.boton} ${styles.botonPrimario}`}
        >
          {uploading
            ? "Subiendo..."
            : isUploaded
              ? "Reemplazar archivo"
              : "Adjuntar archivo"}
        </button>
      </div>

      {canVerify && isUploaded && onVerify && (
        <div className={styles.acciones}>
          <label htmlFor={`${baseId}-verification`} className={styles.titulo}>
            Estado de verificación
          </label>
          <div
            className="select-control"
            data-disabled={verifying || undefined}
          >
            <select
              id={`${baseId}-verification`}
              defaultValue={document?.verification ?? "pending"}
              onChange={(event) =>
                onVerify(event.target.value as VerificationStatusDTO)
              }
              disabled={verifying}
              className="select-control__native"
            >
              <option value="pending">Pendiente</option>
              <option value="verified">Verificado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>
          {verifying && <span className={styles.ayuda}>Actualizando...</span>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        style={{ display: "none" }}
        onChange={(event) => {
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
