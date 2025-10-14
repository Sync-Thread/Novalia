// src/shared/UI/Modal.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;      // id de título para accesibilidad
  children: React.ReactNode;
  className?: string;       // clases extra para el panel
};

export default function Modal({ open, onClose, labelledBy, children, className = "" }: Props) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [show, setShow] = useState(false);

  // Animación (fade-in) y lock de scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => setShow(true));
    return () => {
      setShow(false);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`modal-overlay ${show ? "show" : ""}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden={!open}
    >
      <section
        ref={panelRef as any}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`modal ${show ? "show" : ""} ${className}`}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}
