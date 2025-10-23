import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import DateTimePicker from "../pages/PublishWizardPage/components/DateTimePicker";
import styles from "./MarkSoldModal.module.css";

export interface MarkSoldModalPayload {
  soldAt: string;
  note?: string;
}

export interface MarkSoldModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: MarkSoldModalPayload) => void;
  loading?: boolean;
  defaultDate?: string;
}

/**
 * Modal para marcar una propiedad como vendida. Solo maqueta inputs y botones.
 */
export function MarkSoldModal({
  open,
  onClose,
  onConfirm,
  loading,
  defaultDate,
}: MarkSoldModalProps) {
  const [soldAt, setSoldAt] = useState<string | null>(
    defaultDate ?? new Date().toISOString()
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSoldAt(defaultDate ?? new Date().toISOString());
      setNote("");
    }
  }, [defaultDate, open]);

  const canSubmit = Boolean(soldAt) && !loading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como vendida"
      actions={
        <div className={styles.acciones}>
          <button type="button" onClick={onClose} className={styles.boton}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              soldAt && onConfirm({ soldAt, note: note.trim() || undefined })
            }
            disabled={!canSubmit}
            className={`${styles.boton} ${styles.botonPrincipal}`}
          >
            {loading ? "Guardando..." : "Confirmar venta"}
          </button>
        </div>
      }
    >
      <p className={styles.texto}>
        Indica la fecha en que se concretó la venta para actualizar el
        historial.
      </p>
      <DateTimePicker
        label="Fecha y hora de venta"
        value={soldAt}
        onChange={setSoldAt}
        required
        disabled={loading}
      />
      <label className={styles.nota}>
        <span>Nota (opcional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Información adicional sobre la venta..."
          className={styles.textarea}
          disabled={loading}
        />
      </label>
    </Modal>
  );
}

export default MarkSoldModal;
