// Modal para registrar la fecha de venta.
// No tocar lógica de Application/Domain.
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import DateTimePicker from "../components/DateTimePicker";

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
        <>
          <button type="button" onClick={onClose} className="btn">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => soldAt && onConfirm({ soldAt, note: note.trim() || undefined })}
            disabled={!canSubmit || loading}
            className="btn btn-primary"
          >
            {loading ? "Guardando..." : "Confirmar venta"}
          </button>
        </>
      }
    >
      <p>
        Indica la fecha en que se concretó la venta para actualizar el historial de la propiedad.
      </p>
      <DateTimePicker label="Fecha y hora de venta" value={soldAt} onChange={setSoldAt} required />
      <label className="field-group">
        <span className="field-label">Nota (opcional)</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Información adicional sobre la venta..."
          className="textarea"
        />
      </label>
    </Modal>
  );
}

export default MarkSoldModal;
