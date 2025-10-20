import React from "react";
import styles from "./KycBanner.module.css";

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
  actionLabel = "Completar verificaci\u00f3n",
  onActionClick,
}: KycBannerProps) {
  if (!visible) return null;

  return (
    <div role="region" aria-live="polite" className={styles.banner}>
      <div className={styles.copy}>
        <span className={styles.title}>Verificaci\u00f3n necesaria</span>
        <span className={styles.message}>{message}</span>
      </div>
      <a href={actionHref} onClick={onActionClick} className={styles.action}>
        {actionLabel}
      </a>
    </div>
  );
}

export default KycBanner;
