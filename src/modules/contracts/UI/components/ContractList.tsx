import React, { useEffect, useState } from "react";
import styles from "./ContractList.module.css";
import type { IContract } from "../../domain/entities/contractType";
import { FileText, PlusIcon, Files } from "lucide-react";
import { getPresignedUrlForDisplay } from "../../../properties/infrastructure/adapters/MediaStorage";
import { useContractDocumentCounts } from "../hooks/useContractDocumentCounts";

interface ContractListProps {
  contracts: IContract[];
  onRowClick: (contract: IContract) => void;
  onMenuAction?: (action: string, contractId: string) => void;
  onViewDocuments?: (contract: IContract) => void;
  loading?: boolean;
  onNewDocument?: () => void;
}

const formatMoney = (amount: number, currency: string = "MXN") => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  // Si viene en formato DD/MM/YYYY
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  // Si viene en formato ISO
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatDateShort = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
};

const getContractTypeLabel = (type: IContract["tipoContrato"]) => {
  switch (type) {
    case "Intermediacion":
      return "Intermediación";
    case "Oferta":
      return "Oferta de Compra";
    case "Promesa":
      return "Promesa de Compraventa";
    default:
      return type;
  }
};

const getEstadoClass = (estado: IContract["estadoFirma"]) => {
  switch (estado) {
    case "Firmado":
      return styles.pillSigned;
    case "PendienteDeFirma":
      return styles.pillPending;
    case "Rechazado":
      return styles.pillRejected;
    case "Vigente":
      return styles.pillVigente;
    case "Archivado":
      return styles.pillArchived;
    default:
      return "";
  }
};

const ContractList: React.FC<ContractListProps> = ({
  contracts,
  onRowClick,
  onViewDocuments,
  loading = false,
  onNewDocument,
}) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  
  // Get document counts for all contracts
  const contractIds = contracts.map(c => c.id);
  const { counts: documentCounts } = useContractDocumentCounts(contractIds);

  // Cargar previews de imágenes
  useEffect(() => {
    contracts.forEach(async (contract) => {
      // Si el contrato tiene una URL que parece un s3Key (no empieza con http)
      if (
        contract.propiedadImagenUrl &&
        !contract.propiedadImagenUrl.startsWith("http")
      ) {
        try {
          const previewUrl = await getPresignedUrlForDisplay(
            contract.propiedadImagenUrl
          );
          setPreviews((prev) => ({ ...prev, [contract.id]: previewUrl }));
        } catch {
          // Silencioso - las imágenes son opcionales
          if (import.meta.env.DEV) {
            console.debug(
              "No se pudo cargar preview para contrato:",
              contract.id
            );
          }
        }
      }
    });
  }, [contracts]);

  // Loading state con skeletons
  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.contractTable}>
          <colgroup>
            <col className={styles.colProperty} />
            <col className={styles.colTipo} />
            <col className={styles.colClient} />
            <col className={styles.colStatus} />
            <col className={styles.colFechas} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.thProperty}>Propiedad & ID</th>
              <th className={styles.thTipo}>Tipo de Contrato</th>
              <th className={styles.thClient}>Contraparte</th>
              <th className={styles.thStatus}>Estado</th>
              <th className={styles.thFechas}>Fechas</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className={styles.rowSkeleton}>
                <td className={styles.tdProperty}>
                  <div className={styles.skeletonThumb} />
                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.skeletonText}
                      style={{ width: "70%" }}
                    />
                    <div
                      className={styles.skeletonText}
                      style={{ width: "40%", marginTop: "6px" }}
                    />
                  </div>
                </td>
                <td className={styles.tdTipo}>
                  <div
                    className={styles.skeletonText}
                    style={{ width: "80%" }}
                  />
                  <div
                    className={styles.skeletonText}
                    style={{ width: "50%", marginTop: "6px" }}
                  />
                </td>
                <td className={styles.tdClient}>
                  <div
                    className={styles.skeletonText}
                    style={{ width: "60%" }}
                  />
                  <div
                    className={styles.skeletonBar}
                    style={{ marginTop: "8px" }}
                  />
                </td>
                <td className={styles.tdStatus}>
                  <div className={styles.skeletonPill} />
                </td>
                <td className={styles.tdFechas}>
                  <div
                    className={styles.skeletonText}
                    style={{ width: "80%" }}
                  />
                  <div
                    className={styles.skeletonText}
                    style={{ width: "70%", marginTop: "6px" }}
                  />
                </td>
                <td className={styles.tdActions}>
                  <div className={styles.skeletonButton} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (contracts.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div
          style={{
            padding: "64px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#f0f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={40} style={{ color: "#295dff" }} />
          </div>
          <div>
            <h3
              style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}
            >
              No hay contratos registrados
            </h3>
            <p
              style={{ color: "#6b7280", fontSize: "15px", maxWidth: "400px" }}
            >
              Comienza creando un nuevo contrato para tu propiedad
            </p>
          </div>
          {onNewDocument && (
            <button
              className="btn btn-primary"
              onClick={onNewDocument}
              style={{ marginTop: "8px", gap: "8px" }}
            >
              <PlusIcon size={18} />
              Nuevo contrato
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.contractTable}>
        <colgroup>
          <col className={styles.colProperty} />
          <col className={styles.colTipo} />
          <col className={styles.colClient} />
          <col className={styles.colStatus} />
          <col className={styles.colFechas} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.thProperty}>Propiedad & ID</th>
            <th className={styles.thTipo}>Tipo de Contrato</th>
            <th className={styles.thClient}>Contraparte</th>
            <th className={styles.thStatus}>Estado</th>
            <th className={styles.thFechas}>Fechas</th>
            <th className={styles.thActions}>Documentos</th>
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
                if (e.key === "Enter") onRowClick(contract);
              }}
            >
              <td className={styles.tdProperty}>
                {previews[contract.id] ? (
                  <img
                    src={previews[contract.id]}
                    alt={`Imagen de ${contract.propiedadNombre}`}
                    className={styles.propertyThumb}
                  />
                ) : (
                  <div
                    className={styles.propertyThumb}
                    style={{
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={20} style={{ color: "#9ca3af" }} />
                  </div>
                )}
                <div className={styles.propertyInfo}>
                  <div className={styles.propertyTitle}>
                    {contract.propiedadNombre}
                  </div>
                  <div className={styles.propertyId}>{contract.id}</div>
                </div>
              </td>
              <td className={styles.tdTipo}>
                <div className={styles.tipoLabel}>
                  {getContractTypeLabel(contract.tipoContrato)}
                </div>
                {contract.monto > 0 && (
                  <div className={styles.tipoMonto}>
                    {formatMoney(contract.monto, contract.moneda)}
                  </div>
                )}
              </td>
              <td className={styles.tdClient}>
                <div className={styles.clientName}>{contract.contraparte}</div>
                {contract.porcentajeCompletado !== undefined && (
                  <div
                    className={styles.progressWrapper}
                    title={`Completitud del contrato: ${contract.porcentajeCompletado}% - Indica el avance en la recopilación de documentos requeridos (escrituras, avalúos, identificaciones, etc.)`}
                  >
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${contract.porcentajeCompletado}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {contract.porcentajeCompletado}%
                    </span>
                  </div>
                )}
              </td>
              <td className={styles.tdStatus}>
                <span
                  className={`${styles.pill} ${getEstadoClass(
                    contract.estadoFirma
                  )}`}
                >
                  {contract.estadoFirma === "PendienteDeFirma"
                    ? "Pendiente"
                    : contract.estadoFirma.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </td>
              <td className={styles.tdFechas}>
                <div className={styles.fechasWrapper}>
                  {contract.fechaCreacion && (
                    <div className={styles.fechaItem}>
                      <span className={styles.fechaLabel}>Creado:</span>
                      <span className={styles.fechaValue}>
                        {formatDateShort(contract.fechaCreacion)}
                      </span>
                    </div>
                  )}
                  <div className={styles.fechaItem}>
                    <span className={styles.fechaLabel}>Vigencia:</span>
                    <span className={styles.fechaValue}>
                      {formatDate(contract.vigencia)}
                    </span>
                  </div>
                </div>
              </td>
              <td className={styles.tdActions}>
                <button
                  className={styles.documentsButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocuments?.(contract);
                  }}
                  title={`Ver documentos (${documentCounts[contract.id] || 0})`}
                >
                  <Files size={18} />
                  <span>{documentCounts[contract.id] || 0}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractList;
