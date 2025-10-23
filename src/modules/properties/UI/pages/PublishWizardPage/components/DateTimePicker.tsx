import { useMemo } from "react";
import styles from "./DateTimePicker.module.css";

const toInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export interface DateTimePickerProps {
  id?: string;
  label?: string;
  value?: string | null;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  error?: string | null;
  onChange?: (value: string | null) => void;
}

/**
 * Input para fecha y hora. Ajusta estilos sin modificar validaciones ni conversiones existentes.
 */
export function DateTimePicker({
  id,
  label,
  value,
  min,
  max,
  required,
  disabled,
  description,
  error,
  onChange,
}: DateTimePickerProps) {
  const inputValue = useMemo(() => toInputValue(value), [value]);
  const minValue = useMemo(() => toInputValue(min), [min]);
  const maxValue = useMemo(() => toInputValue(max), [max]);
  const helpId = description ? `${id ?? "datetime"}-help` : undefined;
  const errorId = error ? `${id ?? "datetime"}-error` : undefined;

  return (
    <label className={styles.grupo}>
      {label && (
        <span className={styles.etiqueta}>
          {label}
          {required ? " *" : null}
        </span>
      )}
      <input
        id={id}
        type="datetime-local"
        value={inputValue}
        min={minValue || undefined}
        max={maxValue || undefined}
        required={required}
        disabled={disabled}
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error)}
        onChange={event => onChange?.(toIsoString(event.target.value))}
        className={`${styles.control} ${error ? styles.error : ""}`.trim()}
      />
      {description && (
        <span id={helpId} className={styles.ayuda}>
          {description}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.mensajeError}>
          {error}
        </span>
      )}
    </label>
  );
}

export default DateTimePicker;
