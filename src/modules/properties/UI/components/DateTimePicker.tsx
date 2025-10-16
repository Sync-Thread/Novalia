import { useMemo } from "react";

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

  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
        color: "#0f172a",
      }}
    >
      {label && (
        <span style={{ fontWeight: 600 }}>
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
        style={{
          borderRadius: 12,
          border: `1px solid ${error ? "#f87171" : "#cbd5f5"}`,
          padding: "12px 14px",
          fontSize: 15,
          fontFamily: "'Inter', system-ui, sans-serif",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          transition: "border 0.2s ease, box-shadow 0.2s ease",
        }}
        onFocus={event => {
          event.currentTarget.style.border = `1px solid #295DFF`;
          event.currentTarget.style.boxShadow = "0 0 0 3px rgba(41,93,255,0.18)";
        }}
        onBlur={event => {
          event.currentTarget.style.border = `1px solid ${error ? "#f87171" : "#cbd5f5"}`;
          event.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.08)";
        }}
      />
      {description && (
        <span id={helpId} style={{ color: "#64748b", fontSize: 13 }}>
          {description}
        </span>
      )}
      {error && (
        <span id={errorId} style={{ color: "#ef4444", fontSize: 13 }}>
          {error}
        </span>
      )}
    </label>
  );
}

export default DateTimePicker;


