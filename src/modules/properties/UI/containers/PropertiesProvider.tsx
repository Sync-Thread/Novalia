import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPropertiesContainer } from "../../properties.container";
import type { PropertiesContainer, PropertiesUseCases } from "../../properties.container";

type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastDescriptor {
  id: string;
  title?: string;
  description: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastDescriptor[];
  showToast: (toast: Omit<ToastDescriptor, "id">) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

interface PropertiesContextValue {
  useCases: PropertiesUseCases;
  toast: Pick<ToastContextValue, "showToast" | "dismissToast">;
}

const PropertiesContext = createContext<PropertiesContextValue | undefined>(undefined);
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastViewport({ toasts, onDismiss }: { toasts: ToastDescriptor[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 9999,
        maxWidth: 360,
        pointerEvents: "none",
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.14)",
            border: "1px solid rgba(37, 93, 255, 0.12)",
            padding: "16px 18px",
            pointerEvents: "auto",
            fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {toast.title}
                </div>
              )}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: toast.variant === "error" ? "#b91c1c" : "#334155",
                }}
              >
                {toast.description}
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => onDismiss(toast.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "#334155",
                fontSize: 20,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function useStableContainer(provided?: PropertiesContainer): PropertiesContainer {
  const ref = useRef<PropertiesContainer | null>(null);
  if (!ref.current) {
    ref.current = provided ?? createPropertiesContainer();
  }
  return ref.current;
}

export interface PropertiesProviderProps {
  container?: PropertiesContainer;
  children: ReactNode;
}

export function PropertiesProvider({ container, children }: PropertiesProviderProps) {
  const stableContainer = useStableContainer(container);

  const [toasts, setToasts] = useState<ToastDescriptor[]>([]);

  const showToast = useCallback((toast: Omit<ToastDescriptor, "id">) => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts(current => [...current, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const toastValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearToasts,
    }),
    [toasts, showToast, dismissToast, clearToasts],
  );

  const contextValue = useMemo<PropertiesContextValue>(
    () => ({
      useCases: stableContainer.useCases,
      toast: {
        showToast,
        dismissToast,
      },
    }),
    [stableContainer.useCases, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={toastValue}>
      <PropertiesContext.Provider value={contextValue}>
        {children}
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </PropertiesContext.Provider>
    </ToastContext.Provider>
  );
}

export function usePropertiesContext(): PropertiesContextValue {
  const ctx = useContext(PropertiesContext);
  if (!ctx) {
    throw new Error("usePropertiesContext must be used inside PropertiesProvider");
  }
  return ctx;
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToastContext must be used inside PropertiesProvider");
  }
  return ctx;
}

