import React, { useEffect, useMemo, useState } from "react";
import styles from "./DesignBanner.module.css";

const STORAGE_PREFIX = "novalia:design-banner:";

export interface DesignBannerProps {
  note: string;
  storageKey?: string;
  className?: string;
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage write errors (private mode, etc.)
  }
}

export function DesignBanner({ note, storageKey, className }: DesignBannerProps) {
  const key = useMemo(() => `${STORAGE_PREFIX}${storageKey ?? note}`, [note, storageKey]);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return safeGetItem(key) !== "dismissed";
  });

  useEffect(() => {
    if (!visible) return;
    if (typeof window === "undefined") return;
    if (safeGetItem(key) === "dismissed") {
      setVisible(false);
    }
  }, [key, visible]);

  if (!visible) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    safeSetItem(key, "dismissed");
  };

  return (
    <div className={`${styles.banner} ${className ?? ""}`} role="status">
      <div className={styles.content}>
        <span className={styles.badge}>TODO</span>
        <span>{note}</span>
        <span className={styles.hint}>
          Oculta este aviso cuando integres los assets finales y elimines los placeholders.
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.dismiss} onClick={handleDismiss}>
          Ocultar
        </button>
      </div>
    </div>
  );
}

export default DesignBanner;
