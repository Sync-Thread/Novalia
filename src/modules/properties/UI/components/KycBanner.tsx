// Aviso compacto para recordar la verificación KYC.
// No tocar lógica de Application/Domain.
import React from "react";

export interface KycBannerProps {
  visible: boolean;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function KycBanner({
  visible,
  message = "Para publicar necesitas tu KYC (INE) verificado.",
  actionHref = "/kyc",
  actionLabel = "Completar verificación",
  onActionClick,
}: KycBannerProps) {
  if (!visible) return null;

  return (
    <section
      role="region"
      aria-live="polite"
      className="card"
      style={{
        background: "rgba(41, 93, 255, 0.08)",
        borderColor: "rgba(41, 93, 255, 0.2)",
        padding: "var(--gap)",
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--gap)",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="stack" style={{ gap: "4px" }}>
        <span style={{ fontWeight: 600 }}>Verificación necesaria</span>
        <span className="muted" style={{ fontSize: "0.9rem" }}>
          {message}
        </span>
      </div>
      <a href={actionHref} onClick={onActionClick} className="btn btn-primary">
        {actionLabel}
      </a>
    </section>
  );
}

export default KycBanner;
