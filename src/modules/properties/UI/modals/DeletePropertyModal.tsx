// Modal para confirmar eliminación de propiedad.
// No tocar lógica de Application/Domain.
import Modal from "../components/Modal";

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
          <button type="button" onClick={onClose} className="btn">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn btn-primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }}>
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </>
      }
    >
      <p>
        Esta acción enviará <strong>{propertyTitle ?? "la propiedad"}</strong> a la papelera y dejará de mostrarse en el portal.
      </p>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Podrás recuperarla desde el panel de propiedades eliminadas.
      </p>
    </Modal>
  );
}

export default DeletePropertyModal;
