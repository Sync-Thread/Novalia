import { useState } from 'react';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { getPresignedUrlForDisplay } from '../../../../properties/infrastructure/adapters/MediaStorage';
import styles from './DocumentAttachment.module.css';

interface DocumentAttachmentProps {
  fileName: string;
  s3Key: string;
  documentUrl?: string;
  contractProperty?: string;
  contractId?: string;
}

/**
 * Componente para renderizar un archivo PDF/documento adjunto en el chat
 * 
 * @param fileName - Nombre del archivo
 * @param s3Key - Clave del archivo en S3
 * @param documentUrl - URL presigned (opcional, se genera si no existe)
 * @param contractProperty - Nombre de la propiedad del contrato
 * @param contractId - ID del contrato
 */
export function DocumentAttachment({
  fileName,
  s3Key,
  documentUrl,
  contractProperty,
}: DocumentAttachmentProps) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      // Use existing URL or generate new presigned URL
      const url = documentUrl || await getPresignedUrlForDisplay(s3Key);
      
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No se pudo obtener la URL del documento');
      }
    } catch (error) {
      console.error('Error al abrir documento:', error);
      alert('Error al abrir el documento. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = documentUrl || await getPresignedUrlForDisplay(s3Key);
      
      if (url) {
        // Create temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No se pudo obtener la URL del documento');
      }
    } catch (error) {
      console.error('Error al descargar documento:', error);
      alert('Error al descargar el documento. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Extract file extension
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'PDF';

  return (
    <div className={styles.documentAttachment}>
      <div className={styles.documentHeader}>
        <div className={styles.iconContainer}>
          <FileText size={24} className={styles.fileIcon} />
          <span className={styles.fileType}>{fileExtension}</span>
        </div>
        
        <div className={styles.documentInfo}>
          <p className={styles.fileName} title={fileName}>
            {fileName}
          </p>
          
          {contractProperty && (
            <p className={styles.propertyName}>
              📍 {contractProperty}
            </p>
          )}
        </div>
      </div>

      <div className={styles.documentActions}>
        <button
          className={styles.actionButton}
          onClick={handleOpen}
          disabled={loading}
          aria-label="Abrir documento"
          title="Abrir documento"
        >
          {loading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <ExternalLink size={18} />
          )}
        </button>
        
        <button
          className={styles.actionButton}
          onClick={handleDownload}
          disabled={loading}
          aria-label="Descargar documento"
          title="Descargar documento"
        >
          {loading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <Download size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
