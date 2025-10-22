// Modal mínimo accesible.
// No tocar lógica de Application/Domain.
import { useEffect, useId } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, actions, children }: ModalProps) {
  const titleId = useId();

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

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        onClick={event => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId} style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Cerrar modal">
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
}

export default Modal;
