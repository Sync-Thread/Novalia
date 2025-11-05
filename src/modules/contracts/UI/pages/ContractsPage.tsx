import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "./ContractsPage.module.css";

import ContractList from "../components/ContractList";
import ContractDetailSideSheet from "../components/ContractDetailSideSheet";
import NewDocumentQuickView from "../components/NewDocumentQuickView";
import { useContractsActions } from "../hooks/useContractsActions";

import type { IContract } from "../../domain/entities/contractType";
import type { ContractListItemDTO } from "../../application/dto/ContractDTO";

import { SearchIcon, X, PlusIcon } from "lucide-react";

// Función helper para mapear DTO a IContract (mock interface)
function mapDtoToContract(dto: ContractListItemDTO): IContract {
  // console.log(`📋 Mapeo contrato ${dto.id}:`, {
  //   clientContactId: dto.clientContactId,
  //   clientProfileId: dto.clientProfileId,
  //   clientName: dto.clientName,
  //   clientType: dto.clientType,
  // });

  return {
    id: dto.id,
    propiedadId: dto.propertyId || "",
    propiedadNombre: dto.propertyName || "Sin propiedad",
    propiedadImagenUrl: dto.propertyCoverImageS3Key || "",
    s3Key: dto.s3Key || undefined,
    metadata: dto.metadata || undefined,
    tipoContrato:
      dto.contractType === "intermediacion"
        ? "Intermediacion"
        : dto.contractType === "oferta"
          ? "Oferta"
          : "Promesa",
    contraparte: dto.clientName || "Sin cliente",
    monto: 0, // TODO: Agregar monto al DTO cuando se implemente
    moneda: "MXN",
    estadoFirma:
      dto.status === "draft"
        ? "PendienteDeFirma"
        : dto.status === "active"
          ? "Vigente"
          : dto.status === "cancelled" || dto.status === "expired"
            ? "Archivado"
            : "PendienteDeFirma",
    vigencia: dto.dueOn
      ? new Date(dto.dueOn).toLocaleDateString("es-MX")
      : new Date(dto.issuedOn).toLocaleDateString("es-MX"),
    porcentajeCompletado: 0, // TODO: Calcular basado en checklist cuando se implemente
  };
}

const ContractsPage: React.FC = () => {
  const { listContracts, loading } = useContractsActions();

  const [allContracts, setAllContracts] = useState<IContract[]>([]); // Todos los contratos sin filtrar
  const [filteredContracts, setFilteredContracts] = useState<IContract[]>([]); // Contratos después de filtros
  const [selectedContract, setSelectedContract] = useState<IContract | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDocQuickView, setShowNewDocQuickView] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar TODOS los contratos una sola vez al montar
  const loadAllContracts = useCallback(async () => {
    const result = await listContracts({
      search: "", // Sin búsqueda en BD
      status: "Todos", // Todos los estados
      pageSize: 1000, // Cargar todos
    });

    if (result) {
      const mappedContracts = result.items.map(mapDtoToContract);
      setAllContracts(mappedContracts);
      console.log("📦 Contratos cargados desde BD:", mappedContracts.length);
    }
  }, [listContracts]);

  // Filtrar contratos localmente (búsqueda + estado)
  useEffect(() => {
    let filtered = [...allContracts];

    // Filtro por estado
    if (activeFilter !== "Todos") {
      filtered = filtered.filter((c) => c.estadoFirma === activeFilter);
    }

    // Filtro por búsqueda (busca en ID, propiedad, cliente)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const matchId = c.id.toLowerCase().includes(query);
        const matchProperty = c.propiedadNombre.toLowerCase().includes(query);
        const matchClient = c.contraparte.toLowerCase().includes(query);
        return matchId || matchProperty || matchClient;
      });
    }

    console.log("🔍 Filtros aplicados:", {
      total: allContracts.length,
      estado: activeFilter,
      busqueda: searchQuery,
      resultados: filtered.length,
    });

    setFilteredContracts(filtered);
  }, [allContracts, activeFilter, searchQuery]);

  // Cargar contratos solo al montar el componente
  useEffect(() => {
    loadAllContracts();
  }, [loadAllContracts]);

  const filters = [
    { label: "Todos", value: "Todos" },
    { label: "Pendiente de Firma", value: "PendienteDeFirma" },
    { label: "Vigente", value: "Vigente" },
    { label: "Cerrados/Archivados", value: "Cerrados/Archivados" },
  ];

  const handleRowClick = (contract: IContract) => {
    setSelectedContract(contract);
  };

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  const handleMenuAction = (action: string, contractId: string) => {
    // Normalize action names coming from KebabMenu (Spanish labels)
    console.log(`Acción: ${action} en contrato: ${contractId}`);
    if (action === "ver-detalle" || action === "viewDetail") {
      const contract = filteredContracts.find((c) => c.id === contractId);
      setSelectedContract(contract || null);
      return;
    }

    if (action === "descargar" || action === "download") {
      // Placeholder: implement download logic
      console.log("Descargando contrato", contractId);
      return;
    }

    if (action === "eliminar" || action === "delete") {
      // Simulate deletion from local data
      setAllContracts((prev) => prev.filter((c) => c.id !== contractId));
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
              loading={loading.contracts}
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
          // Recargar lista de contratos
          loadAllContracts();
          setShowNewDocQuickView(false);
        }}
      />
    </>
  );
};

export default ContractsPage;
