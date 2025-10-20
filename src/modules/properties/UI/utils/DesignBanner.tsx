// Banner temporal para recordar placeholders visuales.
// No tocar lógica de Application/Domain.
import React, { useEffect, useMemo, useState } from "react";

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
    // Ignorar errores de almacenamiento (modo incógnito, etc.).
  }
}

export function DesignBanner({ note, storageKey, className }: DesignBannerProps) {
  const key = useMemo(() => `${STORAGE_PREFIX}${storageKey ?? note}`, [note, storageKey]);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return safeGetItem(key) !== "dismissed";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (safeGetItem(key) === "dismissed") {
      setVisible(false);
    }
  }, [key]);

  if (!visible) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    safeSetItem(key, "dismissed");
  };

  return (
    <aside
      role="status"
      className={`card ${className ?? ""}`}
      style={{
        padding: "var(--gap)",
        borderColor: "rgba(41,93,255,0.2)",
        background: "rgba(41,93,255,0.08)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "var(--gap)",
      }}
    >
      <div className="stack" style={{ gap: "6px" }}>
        <span className="badge badge-tonal">TODO</span>
        <span>{note}</span>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          Oculta este aviso cuando integres los assets finales y elimines los placeholders.
        </span>
      </div>
      <button type="button" className="btn btn-ghost" onClick={handleDismiss}>
        Ocultar
      </button>
    </aside>
  );
}

export default DesignBanner;
