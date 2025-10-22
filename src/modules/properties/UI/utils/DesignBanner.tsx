import React, { useMemo, useState } from "react";
import styles from "./DesignBanner.module.css";

const STORAGE_KEY = "novalia:design-banner:";

export interface DesignBannerProps {
  note: string;
  storageId: string;
}

/**
 * Banner temporal para recordar dónde falta conectar lógica o reemplazar assets.
 * Se puede ocultar por vista y el estado queda guardado en localStorage.
 */
export function DesignBanner({ note, storageId }: DesignBannerProps) {
  const key = useMemo(() => `${STORAGE_KEY}${storageId}`, [storageId]);
  const [visible, setVisible] = useState(() => {
    try {
      return window.localStorage.getItem(key) !== "hidden";
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const hideBanner = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(key, "hidden");
    } catch {
      // Ignoramos errores de almacenamiento privado.
    }
  };

  return (
    <aside className={styles.banner} role="status">
      <div className={styles.note}>
        <span className={styles.pill}>TODO</span>
        <span>{note}</span>
      </div>
      <button type="button" className={styles.dismiss} onClick={hideBanner}>
        Ocultar
      </button>
    </aside>
  );
}

export default DesignBanner;
