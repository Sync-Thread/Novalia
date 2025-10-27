// Modal mínimo accesible.
// No tocar lógica de Application/Domain.
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  zIndex?: number;
}

const MODAL_ROOT_ID = "novalia-modal-root";

const ensureModalRoot = (): HTMLElement | null => {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(MODAL_ROOT_ID);
  if (existing) return existing;
  const node = document.createElement("div");
  node.id = MODAL_ROOT_ID;
  document.body.appendChild(node);
  return node;
};

export function Modal({
  open,
  onClose,
  title,
  actions,
  children,
  zIndex = 1600,
}: ModalProps) {
  const titleId = useId();
  const resolvedZIndex = Math.max(1600, zIndex);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, open]);

  if (!open) return null;

  const modalRoot = ensureModalRoot();
  if (!modalRoot) return null;

  const overlay = (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--gap, 16px)",
        zIndex: resolvedZIndex,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          borderRadius: "var(--radius, 8px)",
          background: "var(--bg, white)",
          boxShadow: "var(--shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1))",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap, 16px)",
          padding: "calc(var(--gap, 16px) * 1.25)",
        }}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId} style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </header>
        <div className="stack" style={{ gap: "12px" }}>
          {children}
        </div>
        {actions && <footer className="modal-actions">{actions}</footer>}
      </section>
    </div>
  );

  return createPortal(overlay, modalRoot);
}

export default Modal;
