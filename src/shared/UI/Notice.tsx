// src/shared/UI/Notice.tsx
import React from "react";

type Variant = "success" | "error" | "info" | "warning";

export default function Notice({
  variant = "info",
  title,
  children,
  onClose,
}: {
  variant?: Variant;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  const palette: Record<Variant, { bg: string; border: string; text: string }> = {
    success: { bg: "#e8f5e9", border: "#43a047", text: "#1b5e20" },
    error:   { bg: "#ffebee", border: "#e53935", text: "#b71c1c" },
    info:    { bg: "#e3f2fd", border: "#1e88e5", text: "#0d47a1" },
    warning: { bg: "#fff8e1", border: "#f9a825", text: "#795548" },
  };

  const { bg, border, text } = palette[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        margin: "0 0 20px",
        fontSize: "14px",
        lineHeight: "1.5",
      }}
    >
      <div style={{ flex: 1 }}>
        {title && <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onClose}
          style={{
            background: "transparent",
            border: 0,
            fontSize: 18,
            cursor: "pointer",
            color: text,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
