import { useEffect, useState } from "react";
import Modal from "../../../../shared/UI/Modal";
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
            onClick={() => soldAt && onConfirm({ soldAt, note: note.trim() || undefined })}
            disabled={!canSubmit || loading}
            style={{
              borderRadius: 10,
              border: "none",
              background: "#295DFF",
              color: "#fff",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: !canSubmit || loading ? "not-allowed" : "pointer",
              boxShadow: "0 12px 30px rgba(41,93,255,0.22)",
              opacity: !canSubmit || loading ? 0.7 : 1,
            }}
          >
            {loading ? "Guardando..." : "Confirmar venta"}
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
        Indica la fecha en que se concreto la venta para actualizar el historico de la propiedad.
      </p>
      <DateTimePicker label="Fecha y hora de venta" value={soldAt} onChange={value => setSoldAt(value)} required />
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontSize: 14,
          color: "#475569",
        }}
      >
        <span style={{ fontWeight: 600 }}>Nota (opcional)</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Informacion adicional sobre la venta..."
          style={{
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.4)",
            padding: "12px 14px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </label>
    </Modal>
  );
}

export default MarkSoldModal;

