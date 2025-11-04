import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "./ContractsPage.module.css";

import ContractList from "../components/ContractList";
import ContractDetailSideSheet from "../components/ContractDetailSideSheet";
import NewDocumentQuickView from "../components/NewDocumentQuickView";

import type { IContract } from "../../domain/entities/contractType";

import { mockContracts } from "../../domain/entities/contractType";

import { SearchIcon, X, PlusIcon } from "lucide-react";

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<IContract[]>(mockContracts);
  const [selectedContract, setSelectedContract] = useState<IContract | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showNewDocQuickView, setShowNewDocQuickView] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce para búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = [
    { label: "Todos", value: "Todos" },
    { label: "Pendiente de Firma", value: "PendienteDeFirma" },
    { label: "Vigente", value: "Vigente" },
    { label: "Cerrados/Archivados", value: "Cerrados/Archivados" },
  ];

  // Filtrado por estado y búsqueda
  const filteredContracts = contracts.filter((contract) => {
    // Filtro por estado
    let matchesFilter = true;
    if (activeFilter !== "Todos") {
      if (
        activeFilter === "PendienteDeFirma" &&
        contract.estadoFirma !== "PendienteDeFirma"
      ) {
        matchesFilter = false;
      } else if (
        activeFilter === "Vigente" &&
        contract.estadoFirma !== "Vigente"
      ) {
        matchesFilter = false;
      } else if (
        activeFilter === "Cerrados/Archivados" &&
        contract.estadoFirma !== "Archivado" &&
        contract.estadoFirma !== "Rechazado"
      ) {
        matchesFilter = false;
      }
    }

    // Filtro por búsqueda (ID, propiedad, contraparte)
    let matchesSearch = true;
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      matchesSearch =
        contract.id.toLowerCase().includes(query) ||
        contract.propiedadNombre.toLowerCase().includes(query) ||
        contract.contraparte.toLowerCase().includes(query);
    }

    return matchesFilter && matchesSearch;
  });

  const handleRowClick = (contract: IContract) => {
    setSelectedContract(contract);
  };

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setDebouncedQuery(searchQuery);
      }
    },
    [searchQuery]
  );

  const handleMenuAction = (action: string, contractId: string) => {
    // Normalize action names coming from KebabMenu (Spanish labels)
    console.log(`Acción: ${action} en contrato: ${contractId}`);
    if (action === "ver-detalle" || action === "viewDetail") {
      const contract = contracts.find((c) => c.id === contractId);
      setSelectedContract(contract || null);
      return;
    }

    if (action === "descargar" || action === "download") {
      // Placeholder: implement download logic
      console.log("Descargando contrato", contractId);
      return;
    }

    if (action === "eliminar" || action === "delete") {
      // Simulate deletion from local mock data
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
      if (selectedContract?.id === contractId) setSelectedContract(null);
      return;
    }
  };

  return (
    <>
      <div className={styles.pageContainer}>
        {/* Header con título/subtítulo y CTA */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Gestión de Contratos</h1>
              <p className={styles.subtitle}>
                Administra y firma contratos y expedientes de tus propiedades
              </p>
            </div>
            <div className={styles.headerRight}>
              <button
                className="btn btn-primary"
                onClick={() => setShowNewDocQuickView(true)}
                aria-label="Crear nuevo documento"
              >
                <PlusIcon size={18} />
                Nuevo documento
              </button>
            </div>
          </div>
        </header>

        {/* Barra de búsqueda con debounce y filtros */}
        <div className={styles.filterSection}>
          <div className={styles.searchBar}>
            <div className={styles.searchIcon}>
              <SearchIcon size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por ID, propiedad o contraparte…"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Buscar contratos"
            />
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className={styles.filterButtons}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter.value;
              // decide color class only when active
              const colorClass = isActive
                ? filter.value === "Todos"
                  ? styles.activeBlue
                  : filter.value === "Vigente"
                    ? styles.activeBlue //falta definir color diferente para vigente
                    : filter.value === "PendienteDeFirma"
                      ? styles.activeOrange
                      : filter.value === "Cerrados/Archivados"
                        ? styles.activeGray
                        : ""
                : "";

              return (
                <button
                  key={filter.value}
                  className={`${styles.filterButton} ${
                    isActive ? styles.active : ""
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
              loading={false}
              onNewDocument={() => setShowNewDocQuickView(true)}
            />
          </div>
        </div>
      </div>

      <ContractDetailSideSheet
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
      />

      <NewDocumentQuickView
        open={showNewDocQuickView}
        onClose={() => setShowNewDocQuickView(false)}
        onSuccess={(documentId) => {
          console.log("Documento creado:", documentId);
          // TODO: Mostrar toast de éxito y actualizar lista
        }}
      />
    </>
  );
};

export default ContractsPage;
