import React, { useState } from 'react';
import styles from './ContractsPage.module.css';

import ContractList from '../components/ContractList';
import ContractDetailSideSheet from '../components/ContractDetailSideSheet';

import type { IContract } from '../../domain/entities/contractType';

import { mockContracts } from '../../domain/entities/contractType';

import { useWindowSize } from '../hooks/useWindowSize';

import HeaderUpbarNovalia from '../../../../shared/components/HeaderUpbarNovalia/HeaderUpbarNovalia';

import { SearchIcon } from 'lucide-react';

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<IContract[]>(mockContracts);
  const [selectedContract, setSelectedContract] = useState<IContract | null>(null);
  const [activeFilter, setActiveFilter] = useState('Todos');

  const windowSize = useWindowSize();
  console.log('tamaño de ventana:', windowSize.width);

  const filters = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Pendiente de Firma', value: 'PendienteDeFirma' },
    { label: 'Vigente', value: 'Vigente' },
    { label: 'Cerrados/Archivados', value: 'Cerrados/Archivados' },
  ];

  const filteredContracts = contracts.filter((contract) => {
    if (activeFilter === 'Todos') return true;
    if (
      activeFilter === 'PendienteDeFirma' &&
      contract.estadoFirma === 'PendienteDeFirma'
    )
      return true;
    if (activeFilter === 'Vigente' && contract.estadoFirma === 'Vigente')
      return true;
    if (
      activeFilter === 'Cerrados/Archivados' &&
      (contract.estadoFirma === 'Archivado' ||
        contract.estadoFirma === 'Rechazado')
    )
      return true;
    return false;
  });

  const handleRowClick = (contract: IContract) => {
    setSelectedContract(contract);
  };

  const handleMenuAction = (action: string, contractId: string) => {
    // Normalize action names coming from KebabMenu (Spanish labels)
    console.log(`Acción: ${action} en contrato: ${contractId}`);
    if (action === 'ver-detalle' || action === 'viewDetail') {
      const contract = contracts.find((c) => c.id === contractId);
      setSelectedContract(contract || null);
      return;
    }

    if (action === 'descargar' || action === 'download') {
      // Placeholder: implement download logic
      console.log('Descargando contrato', contractId);
      return;
    }

    if (action === 'eliminar' || action === 'delete') {
      // Simulate deletion from local mock data
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
      if (selectedContract?.id === contractId) setSelectedContract(null);
      return;
    }
  };

  return (
    <>
      {/* AQUI MODIFIQUE: Se renderiza el Header principal antes del contenido de la página. */}
      <HeaderUpbarNovalia
        role="agent_org" // Se usa 'agent_org' para mostrar los enlaces de "Mis propiedades", "Documentos", "Contratos".
      />

      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <div>
            <div className={styles.breadcrumb}>Dashboard / Contratos</div>
            <h1>Gestión de Contratos</h1>
            <p className={styles.subtitle}>
              Administra y firma contratos y expedientes de tus propiedades
            </p>
          </div>
        </header>
        <div className={styles.filterSection}>
          <div className={styles.searchBar}>
            {/* Se corrige la indentación de la estructura del buscador */}
            <div className={styles.searchIcon}>
              <SearchIcon size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar por ID, propiedad o parte..."
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterButtons}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter.value;
              // decide color class only when active
              const colorClass = isActive
                ? filter.value === 'Todos'
                  ? styles.activeBlue
                  : filter.value === 'Vigente'
                  ? styles.activeBlue //falta definir color diferente para vigente
                  : filter.value === 'PendienteDeFirma'
                  ? styles.activeOrange
                  : filter.value === 'Cerrados/Archivados'
                  ? styles.activeGray
                  : ''
                : '';

              return (
                <button
                  key={filter.value}
                  className={`${styles.filterButton} ${
                    isActive ? styles.active : ''
                  } ${colorClass}`}
                  onClick={() => setActiveFilter(filter.value)}
                  /*
                  {filter.value === 'PendienteDeFirma' ? (
                    <span aria-hidden> </span>
                  ) : null}
                    va despues de >*/
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.mainGridFull}>
          <div className={styles.mainColumn}>
            <ContractList
              contracts={filteredContracts}
              onRowClick={handleRowClick}
              onMenuAction={handleMenuAction}
            />
          </div>
        </div>
      </div>

      <ContractDetailSideSheet
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
      />
    </>
  );
};

export default ContractsPage;