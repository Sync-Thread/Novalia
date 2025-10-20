// Barra de filtros simple para listado de propiedades.
// No tocar lógica de Application/Domain.
import React, { useCallback, useEffect, useState } from "react";
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
  { value: "price_asc", label: "Precio (menor a mayor)" },
  { value: "price_desc", label: "Precio (mayor a menor)" },
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
  }, [values]);

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

  const hasFilters =
    (values.q ?? "") !== "" ||
    values.status !== "all" ||
    (values.propertyType ?? "") !== "" ||
    (values.city ?? "") !== "" ||
    (values.state ?? "") !== "" ||
    typeof values.priceMin === "number" ||
    typeof values.priceMax === "number" ||
    values.sortBy !== "recent";
  const resetDisabled = disabled || !hasFilters;

  return (
    <form
      onSubmit={handleSubmit}
      className="toolbar"
      style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--gap)" }}
    >
      <div
        className="grid"
        style={{
          gap: "var(--gap)",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <label className="field-group">
          <span className="field-label">Buscar</span>
          <input
            type="search"
            placeholder="Buscar por título o ID"
            value={local.q}
            onChange={event => setLocal(prev => ({ ...prev, q: event.target.value }))}
            onBlur={event => onChange({ q: event.target.value.trim() || undefined })}
            disabled={disabled}
            className="input"
          />
        </label>

        <label className="field-group">
          <span className="field-label">Estado</span>
          <select
            value={values.status}
            onChange={event => onChange({ status: event.target.value as PropertyStatusFilter })}
            disabled={disabled}
            className="select"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span className="field-label">Tipo</span>
          <select
            value={values.propertyType ?? ""}
            onChange={event => onChange({ propertyType: event.target.value || undefined })}
            disabled={disabled}
            className="select"
          >
            {propertyTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span className="field-label">Ciudad</span>
          <input
            type="text"
            value={local.city}
            onChange={event => setLocal(prev => ({ ...prev, city: event.target.value }))}
            onBlur={event => onChange({ city: event.target.value.trim() || undefined })}
            disabled={disabled}
            className="input"
          />
        </label>

        <label className="field-group">
          <span className="field-label">Estado</span>
          <input
            type="text"
            value={local.state}
            onChange={event => setLocal(prev => ({ ...prev, state: event.target.value }))}
            onBlur={event => onChange({ state: event.target.value.trim() || undefined })}
            disabled={disabled}
            className="input"
          />
        </label>

        <label className="field-group">
          <span className="field-label">Precio mín. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMin}
            onChange={event => setLocal(prev => ({ ...prev, priceMin: event.target.value }))}
            onBlur={event => onChange({ priceMin: parseNumber(event.target.value) })}
            disabled={disabled}
            className="input"
          />
        </label>

        <label className="field-group">
          <span className="field-label">Precio máx. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMax}
            onChange={event => setLocal(prev => ({ ...prev, priceMax: event.target.value }))}
            onBlur={event => onChange({ priceMax: parseNumber(event.target.value) })}
            disabled={disabled}
            className="input"
          />
        </label>

        <label className="field-group">
          <span className="field-label">Ordenar por</span>
          <select
            value={values.sortBy}
            onChange={event => onChange({ sortBy: event.target.value as ListFiltersInput["sortBy"] })}
            disabled={disabled}
            className="select"
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
        className="stack"
        style={{
          gap: "var(--gap)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--gap)", flexWrap: "wrap" }}>
          <span className="field-label" style={{ margin: 0 }}>
            Vista
          </span>
          <div role="group" aria-label="Cambiar vista" className="chip-list">
            <button
              type="button"
              onClick={() => onChange({ viewMode: "grid" })}
              disabled={disabled}
              aria-pressed={values.viewMode === "grid"}
              className={`chip${values.viewMode === "grid" ? " chip-active" : ""}`}
            >
              <Grid size={16} strokeWidth={2} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ viewMode: "list" })}
              disabled={disabled}
              aria-pressed={values.viewMode === "list"}
              className={`chip${values.viewMode === "list" ? " chip-active" : ""}`}
            >
              <List size={16} strokeWidth={2} />
              <span>Lista</span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--gap)", flexWrap: "wrap" }}>
          <button type="submit" disabled={disabled} className="btn btn-primary">
            Aplicar filtros
          </button>
          <button type="button" onClick={onReset} disabled={resetDisabled} className="btn btn-ghost">
            <RotateCcw size={16} strokeWidth={2} />
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}

export default FiltersBar;
