import { useEffect, useState } from "react";
import Modal from "../../../../shared/UI/Modal";
import DateTimePicker from "../components/DateTimePicker";
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

export function MarkSoldModal({ open, onClose, onConfirm, loading, defaultDate }: MarkSoldModalProps) {
  const [soldAt, setSoldAt] = useState<string | null>(defaultDate ?? new Date().toISOString());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSoldAt(defaultDate ?? new Date().toISOString());
      setNote("");
    }
  }, [defaultDate, open]);

  const canSubmit = Boolean(soldAt);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como vendida"
      actions={
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancel}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => soldAt && onConfirm({ soldAt, note: note.trim() || undefined })}
            disabled={!canSubmit || loading}
            className={styles.confirm}
          >
            {loading ? "Guardando..." : "Confirmar venta"}
          </button>
        </div>
      }
    >
      <p className={styles.description}>
        Indica la fecha en que se concret\u00f3 la venta para actualizar el historial de la propiedad.
      </p>
      <DateTimePicker label="Fecha y hora de venta" value={soldAt} onChange={value => setSoldAt(value)} required />
      <label className={styles.noteWrapper}>
        <span className={styles.noteLabel}>Nota (opcional)</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Informaci\u00f3n adicional sobre la venta..."
          className={styles.noteField}
        />
      </label>
    </Modal>
  );
}

export default MarkSoldModal;
