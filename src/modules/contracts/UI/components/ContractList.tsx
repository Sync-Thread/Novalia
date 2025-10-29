import React from 'react';
import styles from './ContractList.module.css';
import KebabMenu from './KebabMenu';
import type { IContract } from '../../domain/entities/contractType';

interface ContractListProps {
  contracts: IContract[];
  onRowClick: (contract: IContract) => void;
  onMenuAction: (action: string, contractId: string) => void;
}

const formatMoney = (amount: number, currency: string = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const parts = dateString.split('/');
  if (parts.length !== 3) return dateString;

  // Los meses en JavaScript son 0-indexados (0 = Enero)
  const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getEstadoClass = (estado: IContract['estadoFirma']) => {
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

const ContractList: React.FC<ContractListProps> = ({
  contracts,
  onRowClick,
  onMenuAction,
}) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.contractTable}>
        <colgroup>
          <col className={styles.colProperty} />
          <col className={styles.colTipo} />
          <col className={styles.colClient} />
          <col className={styles.colMonto} />
          <col className={styles.colStatus} />
          <col className={styles.colVigencia} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.thProperty}>Propiedad</th>
            <th className={styles.thTipo}>Tipo de Contrato</th>
            <th className={styles.thClient}>Contraparte</th>
            <th className={styles.thMonto}>Monto</th>
            <th className={styles.thStatus}>Estado</th>
            <th className={styles.thVigencia}>Vigencia</th>
            <th className={styles.thActions} aria-label="Acciones">
              <span>Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr
              key={contract.id}
              onClick={() => onRowClick(contract)}
              className={styles.rowItem}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') onRowClick(contract);
              }}
            >
              <td className={styles.tdProperty}>
                <img
                  src={contract.propiedadImagenUrl || '/path/to/thumb.jpg'}
                  alt={`Imagen de ${contract.propiedadNombre}`}
                  className={styles.propertyThumb}
                />
                <div className={styles.propertyInfo}>
                  <div className={styles.propertyTitle}>
                    {contract.propiedadNombre}
                  </div>
                  <div className={styles.propertyId}>{contract.id}</div>
                </div>
              </td>
              <td className={styles.tdTipo}>
                {contract.tipoContrato === 'Intermediacion'
                  ? 'Intermediación (2%)'
                  : contract.tipoContrato}
              </td>
              <td className={styles.tdClient}>{contract.contraparte}</td>
              <td className={styles.tdMonto}>
                <div>{formatMoney(contract.monto, contract.moneda)}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {contract.moneda}
                </div>
              </td>
              <td className={styles.tdStatus}>
                <span
                  className={`${styles.pill} ${getEstadoClass(
                    contract.estadoFirma
                  )}`}
                >
                  {contract.estadoFirma === 'PendienteDeFirma'
                    ? 'Pendiente'
                    : contract.estadoFirma.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </td>
              <td className={styles.tdVigencia}>
                {formatDate(contract.vigencia)}
              </td>
              <td
                className={styles.tdActions}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <KebabMenu
                  contract={contract}
                  onActionClick={onMenuAction}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractList;