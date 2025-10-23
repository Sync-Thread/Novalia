import Modal from "../components/Modal";
import styles from "./DeletePropertyModal.module.css";

export interface DeletePropertyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  propertyTitle?: string;
}

/**
 * Modal de confirmación para eliminar la propiedad. Solo estiliza los botones y textos.
 */
export function DeletePropertyModal({ open, onClose, onConfirm, loading, propertyTitle }: DeletePropertyModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar propiedad"
      actions={
        <div className={styles.acciones}>
          <button type="button" onClick={onClose} className={styles.boton}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`${styles.boton} ${styles.botonPeligro}`}>
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      }
    >
      <p className={styles.texto}>
        Esta acción enviará <strong>{propertyTitle ?? "la propiedad"}</strong> a la papelera y dejará de mostrarse en el
        portal.
      </p>
      <p className={styles.nota}>Podrás recuperarla desde el panel de propiedades eliminadas.</p>
    </Modal>
  );
}

export default DeletePropertyModal;
