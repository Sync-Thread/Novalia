import React from "react";
import styles from "./KycBanner.module.css";

export interface KycBannerProps {
  visible: boolean;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Aviso visual que recuerda completar el KYC antes de publicar.
 * Solo estiliza, no modifica la navegación ni la lógica.
 */
export function KycBanner({
  visible,
  message = "Para publicar necesitas tu KYC (INE) verificado.",
  actionHref = "/kyc",
  actionLabel = "Completar verificación",
  onActionClick,
}: KycBannerProps) {
  if (!visible) return null;

  return (
    <section role="region" aria-live="polite" className={styles.banner}>
      <div className={styles.copy}>
        <span className={styles.title}>Verificación necesaria</span>
        <span>{message}</span>
      </div>
      <a href={actionHref} onClick={onActionClick} className={styles.action}>
        {actionLabel}
      </a>
    </section>
  );
}

export default KycBanner;
