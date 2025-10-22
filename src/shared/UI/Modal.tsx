import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  labelledBy?: string;
};

export default function Modal({ open, onClose, title, children, actions, labelledBy }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const dialogEl = dialogRef.current;
    dialogEl?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogEl) return;

      const focusable = dialogEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex="0"]',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const headingId = labelledBy ?? (title ? "modal-title" : undefined);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      onMouseDown={event => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        style={{
          width: "min(480px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
          padding: "24px 28px",
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {title && (
          <header>
            <h2
              id={headingId}
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {title}
            </h2>
          </header>
        )}
        <div style={{ color: "#475569", fontSize: 15 }}>{children}</div>
        {actions && (
          <footer
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            {actions}
          </footer>
        )}
      </div>
    </div>
  );
}
