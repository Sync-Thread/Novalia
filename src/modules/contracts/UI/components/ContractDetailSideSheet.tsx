import React from "react";
import { useNavigate } from "react-router-dom";
import type { IContract } from "../../domain/entities/contractType";
import {
  AlertTriangleIcon,
  CheckIcon,
  CircleCheckIcon,
  ClockIcon,
  DownloadIcon,
  FileIcon,
  SendIcon,
} from "lucide-react";

interface DetailSheetProps {
  contract: IContract | null;
  onClose: () => void;
}

const ContractDetailSideSheet: React.FC<DetailSheetProps> = ({
  contract,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!contract) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    if (dateString.includes("T")) {
      return new Date(dateString).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    const parts = dateString.split("/");
    if (parts.length !== 3) return dateString;

    // Los meses en JavaScript son 0-indexados (0 = Enero)
    const date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatMoney = (
    amount: number | undefined,
    currency: string = "MXN"
  ) => {
    if (amount == null) return "-";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isSignable =
    contract.porcentajeCompletado === 100 &&
    contract.estadoFirma === "PendienteDeFirma";

  return (
    <div className="sheet" role="presentation">
      <div
        role="presentation"
        className="quickview-scrim"
        onClick={onClose}
        style={{ cursor: "pointer" }}
      />
      <aside
        className="sheet-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-detail-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className="btn btn-ghost btn-icon sheet-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="sheet-body">
          <header className="quickview-header">
            <div className="quickview-header__left">
              <div className="quickview-header__title">
                <h2 id="contract-detail-title" tabIndex={-1}>
                  Detalle del Contrato
                </h2>
                <div className="quickview-header__tags">
                  <span className="badge badge-neutral quickview-id">
                    {contract.id}
                  </span>
                  <span
                    className={`badge ${
                      contract.estadoFirma === "Firmado"
                        ? "badge-success"
                        : contract.estadoFirma === "PendienteDeFirma"
                          ? "badge-warning"
                          : contract.estadoFirma === "Rechazado"
                            ? "badge-error"
                            : contract.estadoFirma === "Vigente"
                              ? "badge-info"
                              : "badge-neutral"
                    }`}
                  >
                    {contract.estadoFirma === "PendienteDeFirma"
                      ? "Pendiente"
                      : contract.estadoFirma.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              </div>
              <div className="quickview-header__subtitle">
                <span className="quickview-price">
                  {formatMoney(contract.monto, contract.moneda)}
                </span>
                <span className="muted">{contract.propiedadNombre}</span>
                <span className="muted">
                  Contraparte: {contract.contraparte}
                </span>
              </div>
            </div>
          </header>

          {contract.propiedadImagenUrl && (
            <section className="quickview-section">
              <div className="quickview-gallery">
                <div className="quickview-thumb">
                  <img
                    src={contract.propiedadImagenUrl}
                    alt={`Imagen de ${contract.propiedadNombre}`}
                    style={{
                      width: "100%",
                      height: "110px",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="quickview-section">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "16px",
                background: "var(--bg-subtle)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--accent)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                >
                  <FileIcon size={24} />
                </div>
                <div>
                  <p style={{ fontWeight: 500, marginBottom: "4px" }}>
                    Vista previa del contrato
                  </p>
                  <p className="muted" style={{ fontSize: "0.875rem" }}>
                    Documento generado el{" "}
                    {formatDate(contract.fechaCreacion || contract.vigencia)}
                  </p>
                </div>
              </div>

              <button
                className={`btn btn-primary ${!isSignable ? "" : ""}`} // "btn-disabled" : ""}`}
                onClick={() => {
                  navigate(`/contracts/${contract.id}/sign`);
                  onClose();
                }}
                // disabled={!isSignable}
                aria-label={
                  !isSignable
                    ? "Completa el checklist para habilitar la firma"
                    : "Firmar con FIEL"
                }
                style={{ width: "100%", gap: "8px" }}
              >
                <CircleCheckIcon size={18} /> Firmar con FIEL
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-secondary"
                  aria-label="Descargar PDF"
                  style={{ flex: 1, gap: "8px" }}
                >
                  <DownloadIcon size={18} /> Descargar
                </button>
                <button
                  className="btn btn-secondary"
                  aria-label="Enviar por email"
                  style={{ flex: 1, gap: "8px" }}
                >
                  <SendIcon size={18} /> Enviar
                </button>
              </div>
            </div>
          </section>

          {!isSignable && (
            <section className="quickview-section">
              <div className="quickview-alert">
                <AlertTriangleIcon size={18} />
                <span>
                  Completa el checklist para habilitar la firma electrónica
                </span>
              </div>
            </section>
          )}

          <section
            className="quickview-section"
            aria-labelledby="checklist-title"
          >
            <h3 id="checklist-title">Checklist para Cierre Notarial</h3>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "var(--bg-subtle)",
                borderRadius: "9999px",
                overflow: "hidden",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  width: `${contract.porcentajeCompletado}%`,
                  height: "100%",
                  background: "var(--accent)",
                  transition: "width 0.3s ease",
                }}
                role="progressbar"
                aria-valuenow={contract.porcentajeCompletado}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p
              className="muted"
              style={{ marginTop: "8px", fontSize: "0.875rem" }}
            >
              {contract.porcentajeCompletado}% completado
            </p>
            <ul className="quickview-checklist" role="list">
              {contract.checklist && contract.checklist.length > 0 ? (
                contract.checklist.map((item) => (
                  <li key={item.id}>
                    <div className="quickview-checklist__item">
                      <span
                        className={
                          item.completada
                            ? "quickview-icon--ok"
                            : "quickview-icon--warn"
                        }
                      >
                        {item.completada ? (
                          <CheckIcon size={18} />
                        ) : (
                          <ClockIcon size={18} />
                        )}
                      </span>
                      <span className="quickview-checklist__label">
                        {item.tarea}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <span className="muted">No hay tareas registradas</span>
                </li>
              )}
            </ul>
          </section>

          <section
            className="quickview-section"
            aria-labelledby="expediente-title"
          >
            <h3 id="expediente-title">Expediente Digital</h3>
            {contract.documentos && contract.documentos.length > 0 ? (
              <div className="quickview-docs">
                {contract.documentos.map((doc) => (
                  <div key={doc.id} role="button" tabIndex={0}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{doc.nombre}</span>
                      <small className="muted" style={{ marginLeft: "8px" }}>
                        v{doc.version}
                      </small>
                    </div>
                    <span className="badge badge-neutral">{doc.origen}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No hay documentos</p>
            )}
          </section>

          <section className="quickview-section">
            <h3>Información del Contrato</h3>
            <div className="quickview-grid">
              <div>
                <strong>Estado</strong>
                <span>
                  <span
                    className={`badge ${
                      contract.estadoFirma === "Firmado"
                        ? "badge-success"
                        : contract.estadoFirma === "PendienteDeFirma"
                          ? "badge-warning"
                          : contract.estadoFirma === "Rechazado"
                            ? "badge-error"
                            : contract.estadoFirma === "Vigente"
                              ? "badge-info"
                              : "badge-neutral"
                    }`}
                  >
                    {contract.estadoFirma === "PendienteDeFirma"
                      ? "Pendiente"
                      : contract.estadoFirma.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </span>
              </div>
              <div>
                <strong>Fecha de creación</strong>
                <span>
                  {formatDate(contract.fechaCreacion || contract.vigencia)}
                </span>
              </div>
              <div>
                <strong>Vigencia</strong>
                <span>{formatDate(contract.vigencia)}</span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

export default ContractDetailSideSheet;
