import React from 'react';
import styles from './ContractDetailSideSheet.module.css';
import type { IContract } from '../../domain/entities/contractType';
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleCheckIcon,
  ClockIcon,
  DownloadIcon,
  FileIcon,
  SendIcon,
} from 'lucide-react';

interface DetailSheetProps {
  contract: IContract | null;
  onClose: () => void;
}

const getEstadoPillClass = (estado: IContract['estadoFirma']) => {
  switch (estado) {
    case 'Firmado':
      return styles.pillSigned;
    case 'PendienteDeFirma':
      return styles.pillPending;
    case 'Rechazado':
      return styles.pillRejected;
    case 'Vigente':
      return styles.pillVigente;
    case 'Archivado':
      return styles.pillArchived;
    default:
      return '';
  }
};

const ContractDetailSideSheet: React.FC<DetailSheetProps> = ({
  contract,
  onClose,
}) => {
  if (!contract) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';

    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;

    // Los meses en JavaScript son 0-indexados (0 = Enero)
    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatMoney = (amount: number | undefined, currency: string = 'MXN') => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isSignable =
    contract.porcentajeCompletado === 100 &&
    contract.estadoFirma === 'PendienteDeFirma';

  return (
    <div
      className={styles.sideSheetOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <aside
        className={styles.sideSheet}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Detalle del contrato ${contract.id}`}
      >
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Detalle del Contrato</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            {' '}
            ✕{' '}
          </button>
        </div>

        <div className={styles.scrollContent}>
          <p className={styles.contractId}>{contract.id}</p>

          <div className={styles.propertyBlock}>
            <img
              src={contract.propiedadImagenUrl || '/path/to/image.jpg'}
              alt={`Imagen de ${contract.propiedadNombre}`}
              className={styles.propertyImage}
            />
            <h3 className={styles.propertyName}>
              {contract.propiedadNombre}
            </h3>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                Contraparte: {contract.contraparte}
              </span>
              <span className={styles.metaItem}>
                Monto: {formatMoney(contract.monto, contract.moneda)}
              </span>
            </div>

            <div className={styles.previewArea}>
              <div className={styles.documentIcon}>
                <FileIcon />
              </div>
              <p>Vista previa del contrato</p>
              <p className={styles.documentDate}>
                Documento generado el{' '}
                {formatDate(contract.fechaCreacion || contract.vigencia)}
              </p>
            </div>

            <button
              className={`${styles.fielButton} ${
                !isSignable ? styles.disabled : ''
              }`}
              disabled={!isSignable}
              aria-label={
                !isSignable
                  ? 'Completa el checklist para habilitar la firma'
                  : 'Firmar con FIEL'
              }
              style={{ width: '100%', marginBottom: '8px' }}
            >
              <CircleCheckIcon /> Firmar con FIEL
            </button>

            <div className={styles.actionButtons}>
              <button className={styles.secondaryButton} aria-label="Descargar PDF">
                <DownloadIcon /> Descargar PDF
              </button>
              <button className={styles.secondaryButton} aria-label="Enviar por email">
                <SendIcon /> Enviar por Email
              </button>
            </div>
          </div>

          {!isSignable && (
            <div className={styles.alertBanner} role="status">
              <AlertTriangleIcon /> Completa el checklist para habilitar la
              firma electrónica
            </div>
          )}

          <section className={styles.section} aria-labelledby="checklist-title">
            <h3 id="checklist-title" className={styles.sectionTitle}>
              Checklist para Cierre Notarial
            </h3>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBar}
                style={{ width: `${contract.porcentajeCompletado}%` }}
                role="progressbar"
                aria-valuenow={contract.porcentajeCompletado}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className={styles.progressText}>
              {contract.porcentajeCompletado}% completado
            </p>
            <ul className={styles.checklist} role="list">
              {contract.checklist && contract.checklist.length > 0 ? (
                contract.checklist.map((item) => (
                  <li
                    key={item.id}
                    className={item.completada ? styles.checked : styles.pending}
                  >
                    <span
                      className={
                        item.completada ? styles.checkIcon : styles.timeIcon
                      }
                    >
                      {item.completada ? <CheckIcon /> : <ClockIcon />}
                    </span>
                    {item.tarea}
                  </li>
                ))
              ) : (
                <li className={styles.pending}>No hay tareas registradas</li>
              )}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="expediente-title">
            <h3 id="expediente-title" className={styles.sectionTitle}>
              Expediente Digital
            </h3>
            {contract.documentos && contract.documentos.length > 0 ? (
              contract.documentos.map((doc) => (
                <div
                  key={doc.id}
                  className={styles.documentItem}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <span>{doc.nombre}</span>
                    <small style={{ color: '#6b7280', marginLeft: 8 }}>
                      v{doc.version}
                    </small>
                  </div>
                  <span className={styles.tag}>{doc.origen}</span>
                </div>
              ))
            ) : (
              <div className={styles.documentItem}>No hay documentos</div>
            )}
          </section>

          <div className={styles.footerMeta}>
            <div>
              <div className={styles.metaLabel}>Estado</div>
              <div>
                <span
                  className={`${styles.pill} ${getEstadoPillClass(
                    contract.estadoFirma
                  )}`}
                >
                  {contract.estadoFirma === 'PendienteDeFirma'
                    ? 'Pendiente'
                    : contract.estadoFirma.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>Fecha de creación</div>
              <div>{formatDate(contract.fechaCreacion || contract.vigencia)}</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Vigencia</div>
              <div>{formatDate(contract.vigencia)}</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ContractDetailSideSheet;