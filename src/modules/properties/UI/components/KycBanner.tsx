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
  actionLabel = "Completar verificaciÃ³n",
  onActionClick,
}: KycBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      style={{
        background: "linear-gradient(90deg, rgba(41,93,255,0.15), rgba(41,93,255,0.05))",
        border: "1px solid rgba(41,93,255,0.25)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div>
        <strong
          style={{
            display: "block",
            marginBottom: 4,
            fontSize: 15,
            color: "#1D4ED8",
          }}
        >
          VerificaciÃ³n necesaria
        </strong>
        <span
          style={{
            fontSize: 14,
            color: "#1e293b",
            lineHeight: 1.5,
          }}
        >
          {message}
        </span>
      </div>
      <a
        href={actionHref}
        onClick={onActionClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#295DFF",
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          boxShadow: "0 10px 25px rgba(41,93,255,0.15)",
        }}
      >
        {actionLabel}
      </a>
    </div>
  );
}

export default KycBanner;


