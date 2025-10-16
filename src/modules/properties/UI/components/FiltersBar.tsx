import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Grid, List, RotateCcw } from "lucide-react";
import type { PropertyListFilters, PropertyStatusFilter } from "../hooks/usePropertyList";
import type { ListFiltersInput } from "../../application/validators/filters.schema";

export type ViewMode = "grid" | "list";

export interface FiltersBarValues extends PropertyListFilters {
  viewMode: ViewMode;
}

export interface FiltersBarProps {
  values: FiltersBarValues;
  onChange: (patch: Partial<FiltersBarValues>) => void;
  onReset: () => void;
  disabled?: boolean;
}

const statusOptions: { value: PropertyStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicadas" },
  { value: "sold", label: "Vendidas" },
];

const propertyTypeOptions: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Departamento" },
  { value: "land", label: "Terreno" },
  { value: "office", label: "Oficina" },
  { value: "commercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Otro" },
];

const sortOptions: { value: ListFiltersInput["sortBy"]; label: string }[] = [
  { value: "recent", label: "Recientes" },
  { value: "price_asc", label: "Precio ↑" },
  { value: "price_desc", label: "Precio ↓" },
  { value: "completeness_desc", label: "Completitud" },
];

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function FiltersBar({ values, onChange, onReset, disabled }: FiltersBarProps) {
  const [local, setLocal] = useState(() => ({
    q: values.q ?? "",
    city: values.city ?? "",
    state: values.state ?? "",
    priceMin: values.priceMin?.toString() ?? "",
    priceMax: values.priceMax?.toString() ?? "",
  }));

  useEffect(() => {
    setLocal({
      q: values.q ?? "",
      city: values.city ?? "",
      state: values.state ?? "",
      priceMin: values.priceMin?.toString() ?? "",
      priceMax: values.priceMax?.toString() ?? "",
    });
  }, [values.q, values.city, values.state, values.priceMin, values.priceMax]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onChange({
        q: local.q.trim() || undefined,
        city: local.city.trim() || undefined,
        state: local.state.trim() || undefined,
        priceMin: parseNumber(local.priceMin),
        priceMax: parseNumber(local.priceMax),
      });
    },
    [local, onChange],
  );

  const resetDisabled = useMemo(() => {
    const hasFilters =
      (values.q ?? "") !== "" ||
      values.status !== "all" ||
      (values.propertyType ?? "") !== "" ||
      (values.city ?? "") !== "" ||
      (values.state ?? "") !== "" ||
      typeof values.priceMin === "number" ||
      typeof values.priceMax === "number" ||
      values.sortBy !== "recent";
    return !hasFilters || disabled;
  }, [disabled, values]);

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 16,
        padding: "20px 24px",
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
        border: "1px solid rgba(15,23,42,0.05)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <label style={labelStyle}>
          <span style={spanStyle}>Buscar</span>
          <div style={inputWrapperStyle}>
          <input
            type="search"
            placeholder="Título o ID"
            value={local.q}
            onChange={event => setLocal(prev => ({ ...prev, q: event.target.value }))}
            onBlur={event =>
              onChange({
                q: event.target.value.trim() || undefined,
              })
            }
              disabled={disabled}
              style={inputStyle}
            />
          </div>
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Estado</span>
          <select
            value={values.status}
            onChange={event =>
              onChange({
                status: event.target.value as PropertyStatusFilter,
              })
            }
            disabled={disabled}
            style={inputStyle}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Tipo</span>
          <select
            value={values.propertyType ?? ""}
            onChange={event =>
              onChange({
                propertyType: event.target.value || undefined,
              })
            }
            disabled={disabled}
            style={inputStyle}
          >
            {propertyTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Ciudad</span>
          <input
            type="text"
            value={local.city}
            onChange={event => setLocal(prev => ({ ...prev, city: event.target.value }))}
            onBlur={event => onChange({ city: event.target.value.trim() || undefined })}
            disabled={disabled}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Estado</span>
          <input
            type="text"
            value={local.state}
            onChange={event => setLocal(prev => ({ ...prev, state: event.target.value }))}
            onBlur={event => onChange({ state: event.target.value.trim() || undefined })}
            disabled={disabled}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Precio mín. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMin}
            onChange={event => setLocal(prev => ({ ...prev, priceMin: event.target.value }))}
            onBlur={event => onChange({ priceMin: parseNumber(event.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Precio máx. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMax}
            onChange={event => setLocal(prev => ({ ...prev, priceMax: event.target.value }))}
            onBlur={event => onChange({ priceMax: parseNumber(event.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={spanStyle}>Ordenar por</span>
          <select
            value={values.sortBy}
            onChange={event =>
              onChange({
                sortBy: event.target.value as ListFiltersInput["sortBy"],
              })
            }
            disabled={disabled}
            style={inputStyle}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#64748b" }}>Vista</span>
          <div
            role="group"
            aria-label="Cambiar vista"
            style={{
              display: "inline-flex",
              borderRadius: 999,
              background: "#eef2ff",
              padding: 4,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => onChange({ viewMode: "grid" })}
              disabled={disabled}
              aria-pressed={values.viewMode === "grid"}
              style={{
                ...viewToggleStyle,
                background: values.viewMode === "grid" ? "#295DFF" : "transparent",
                color: values.viewMode === "grid" ? "#fff" : "#1e293b",
              }}
            >
              <Grid size={16} strokeWidth={2} />
              <span style={{ fontSize: 12 }}>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ viewMode: "list" })}
              disabled={disabled}
              aria-pressed={values.viewMode === "list"}
              style={{
                ...viewToggleStyle,
                background: values.viewMode === "list" ? "#295DFF" : "transparent",
                color: values.viewMode === "list" ? "#fff" : "#1e293b",
              }}
            >
              <List size={16} strokeWidth={2} />
              <span style={{ fontSize: 12 }}>Lista</span>
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="submit"
            disabled={disabled}
            style={{
              background: "#295DFF",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(41,93,255,0.15)",
            }}
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            aria-label="Limpiar filtros"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 10,
              padding: "10px 16px",
              color: resetDisabled ? "#9CA3AF" : "#1e293b",
              fontSize: 13,
              cursor: resetDisabled ? "not-allowed" : "pointer",
            }}
          >
            <RotateCcw size={16} strokeWidth={2} />
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 14,
  color: "#0f172a",
};

const spanStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#1e293b",
};

const inputWrapperStyle: React.CSSProperties = {
  position: "relative",
};

const inputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.6)",
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "'Inter', system-ui, sans-serif",
  transition: "border 0.2s ease, box-shadow 0.2s ease",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  outline: "none",
};

const viewToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

export default FiltersBar;

