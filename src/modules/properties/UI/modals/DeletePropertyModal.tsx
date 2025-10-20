import Modal from "../../../../shared/UI/Modal";
import styles from "./DeletePropertyModal.module.css";

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
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancel}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={styles.confirm}>
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      }
    >
      <p className={styles.description}>
        Esta acci\u00f3n enviar\u00e1 la propiedad <strong>{propertyTitle ?? ""}</strong> a la papelera y dejar\u00e1 de mostrarse en el
        portal. Podr\u00e1s recuperarla desde el panel de propiedades eliminadas.
      </p>
    </Modal>
  );
}

export default DeletePropertyModal;

