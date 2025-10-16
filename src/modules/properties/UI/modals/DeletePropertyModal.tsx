import Modal from "../../../../shared/UI/Modal";

export interface DeletePropertyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  propertyTitle?: string;
}

export function DeletePropertyModal({ open, onClose, onConfirm, loading, propertyTitle }: DeletePropertyModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar propiedad"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "#fff",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              borderRadius: 10,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 12px 28px rgba(220,38,38,0.25)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </>
      }
    >
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: "#475569",
          lineHeight: 1.6,
        }}
      >
        Esta accion enviara la propiedad <strong>{propertyTitle ?? ""}</strong> a la papelera y dejara de mostrarse en
        el portal. Podras recuperarla desde el panel de propiedades eliminadas.
      </p>
    </Modal>
  );
}

export default DeletePropertyModal;

