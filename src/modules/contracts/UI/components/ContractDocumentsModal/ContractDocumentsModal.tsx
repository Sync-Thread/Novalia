import React from "react";
import { X, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import styles from "./ContractDocumentsModal.module.css";
import { useContractDocuments } from "../../hooks/useContractDocuments";
import type { IContract } from "../../../domain/entities/contractType";

interface ContractDocumentsModalProps {
  contract: IContract | null;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ContractDocumentsModal: React.FC<ContractDocumentsModalProps> = ({
  contract,
  onClose,
}) => {
  const { documents, loading, error } = useContractDocuments(contract?.id || null);

  if (!contract) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.icon}>
              <FileText size={24} />
            </div>
            <div>
              <h2 className={styles.title}>Documentos del Contrato</h2>
              <p className={styles.subtitle}>
                {contract.propiedadNombre} • ID: {contract.id.substring(0, 8)}...
              </p>
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={32} className="animate-spin" style={{ color: "#295dff" }} />
              <p style={{ marginTop: "12px", color: "#6b7280" }}>Cargando documentos...</p>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FileText size={48} />
              </div>
              <h3 className={styles.emptyTitle}>Error al cargar documentos</h3>
              <p className={styles.emptyText}>{error}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FileText size={48} />
              </div>
              <h3 className={styles.emptyTitle}>No hay documentos</h3>
              <p className={styles.emptyText}>
                Aún no se han cargado documentos para este contrato
              </p>
            </div>
          ) : (
            <div className={styles.documentList}>
              {documents.map((doc) => (
                <div key={doc.id} className={styles.documentCard}>
                  <div className={styles.documentIcon}>
                    <FileText size={20} />
                  </div>
                  <div className={styles.documentInfo}>
                    <div className={styles.documentName}>{doc.fileName}</div>
                    <div className={styles.documentMeta}>
                      <span className={styles.metaItem}>
                        v{doc.version}
                      </span>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.metaItem}>
                        {formatDate(doc.uploadedAt)}
                      </span>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.metaItem}>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>
                  <div className={styles.documentActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => {
                        // TODO: Implement download from S3
                        console.log("Download:", doc.s3Key);
                      }}
                      title="Descargar documento"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => {
                        // TODO: Implement view from S3
                        console.log("View:", doc.s3Key);
                      }}
                      title="Ver documento"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            {documents.length > 0 && (
              <span className={styles.documentCount}>
                {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
              </span>
            )}
          </div>
          <button className={styles.closeFooterButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractDocumentsModal;
