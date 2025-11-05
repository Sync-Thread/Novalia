import React, { useEffect, useState } from "react";
import styles from "./ContractList.module.css";
import type { IContract } from "../../domain/entities/contractType";
import { FileText, Loader2, PlusIcon } from "lucide-react";
import { getPresignedUrlForDisplay } from "../../../properties/infrastructure/adapters/MediaStorage";

interface ContractListProps {
  contracts: IContract[];
  onRowClick: (contract: IContract) => void;
  onMenuAction?: (action: string, contractId: string) => void;
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
  const parts = dateString.split("/");
  if (parts.length !== 3) return dateString;

  // Los meses en JavaScript son 0-indexados (0 = Enero)
  const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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
  loading = false,
  onNewDocument,
}) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});

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
        } catch (error) {
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

  // Loading state
  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div style={{ padding: "48px", textAlign: "center" }}>
          <Loader2
            size={48}
            className="animate-spin"
            style={{ color: "#295dff", margin: "0 auto" }}
          />
          <p style={{ marginTop: "16px", color: "#6b7280", fontSize: "15px" }}>
            Cargando contratos...
          </p>
        </div>
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
              Comienza creando un nuevo documento para tu propiedad
            </p>
          </div>
          {onNewDocument && (
            <button
              className="btn btn-primary"
              onClick={onNewDocument}
              style={{ marginTop: "8px", gap: "8px" }}
            >
              <PlusIcon size={18} />
              Nuevo documento
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
          <col className={styles.colMonto} />
          <col className={styles.colStatus} />
          <col className={styles.colVigencia} />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.thProperty}>Propiedad</th>
            <th className={styles.thTipo}>Tipo de Contrato</th>
            <th className={styles.thClient}>Contraparte</th>
            <th className={styles.thMonto}>Monto</th>
            <th className={styles.thStatus}>Estado</th>
            <th className={styles.thVigencia}>Vigencia</th>
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
                {contract.tipoContrato === "Intermediacion"
                  ? "Intermediación (2%)"
                  : contract.tipoContrato}
              </td>
              <td className={styles.tdClient}>{contract.contraparte}</td>
              <td className={styles.tdMonto}>
                <div>{formatMoney(contract.monto, contract.moneda)}</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {contract.moneda}
                </div>
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
              <td className={styles.tdVigencia}>
                {formatDate(contract.vigencia)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractList;
