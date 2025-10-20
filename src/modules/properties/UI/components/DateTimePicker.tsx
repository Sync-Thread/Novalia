import { useMemo } from "react";
import styles from "./DateTimePicker.module.css";

function toInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

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

  const controlClass = `${styles.control} ${error ? styles.errorField : ""}`.trim();

  return (
    <label className={styles.wrapper}>
      {label && (
        <span className={styles.labelText}>
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
        onChange={event => {
          const next = toIsoString(event.target.value);
          onChange?.(next);
        }}
        className={controlClass}
      />
      {description && (
        <span id={helpId} className={styles.description}>
          {description}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </label>
  );
}

export default DateTimePicker;


