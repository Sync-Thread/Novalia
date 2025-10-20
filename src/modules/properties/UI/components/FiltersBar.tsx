import React, { useCallback, useEffect, useState } from "react";
import { Grid, List, RotateCcw } from "lucide-react";
import type { PropertyListFilters, PropertyStatusFilter } from "../hooks/usePropertyList";
import type { ListFiltersInput } from "../../application/validators/filters.schema";
import styles from "./FiltersBar.module.css";

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

const STATUS_OPTIONS: { value: PropertyStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicadas" },
  { value: "sold", label: "Vendidas" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Departamento" },
  { value: "land", label: "Terreno" },
  { value: "office", label: "Oficina" },
  { value: "commercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Otro" },
];

const SORT_OPTIONS: { value: ListFiltersInput["sortBy"]; label: string }[] = [
  { value: "recent", label: "Recientes" },
  { value: "price_asc", label: "Precio (menor a mayor)" },
  { value: "price_desc", label: "Precio (mayor a menor)" },
  { value: "completeness_desc", label: "Completitud" },
];

const parseNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Barra de filtros del listado. Solo se ajusta la presentación; la lógica de filtros se mantiene intacta.
 */
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

  return (
    <form onSubmit={handleSubmit} className={styles.barra}>
      <div className={styles.campos}>
        <label className={styles.campo}>
          <span className={styles.etiqueta}>Buscar</span>
          <input
            type="search"
            placeholder="Buscar por título o ID"
            value={local.q}
            onChange={event => setLocal(prev => ({ ...prev, q: event.target.value }))}
            onBlur={event => onChange({ q: event.target.value.trim() || undefined })}
            disabled={disabled}
            className={styles.control}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Estado</span>
          <select
            value={values.status}
            onChange={event => onChange({ status: event.target.value as PropertyStatusFilter })}
            disabled={disabled}
            className={styles.control}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Tipo</span>
          <select
            value={values.propertyType ?? ""}
            onChange={event => onChange({ propertyType: event.target.value || undefined })}
            disabled={disabled}
            className={styles.control}
          >
            {TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Ciudad</span>
          <input
            type="text"
            value={local.city}
            onChange={event => setLocal(prev => ({ ...prev, city: event.target.value }))}
            onBlur={event => onChange({ city: event.target.value.trim() || undefined })}
            disabled={disabled}
            className={styles.control}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Estado</span>
          <input
            type="text"
            value={local.state}
            onChange={event => setLocal(prev => ({ ...prev, state: event.target.value }))}
            onBlur={event => onChange({ state: event.target.value.trim() || undefined })}
            disabled={disabled}
            className={styles.control}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Precio mín. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMin}
            onChange={event => setLocal(prev => ({ ...prev, priceMin: event.target.value }))}
            onBlur={event => onChange({ priceMin: parseNumber(event.target.value) })}
            disabled={disabled}
            className={styles.control}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Precio máx. (MXN)</span>
          <input
            type="number"
            min={0}
            value={local.priceMax}
            onChange={event => setLocal(prev => ({ ...prev, priceMax: event.target.value }))}
            onBlur={event => onChange({ priceMax: parseNumber(event.target.value) })}
            disabled={disabled}
            className={styles.control}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Ordenar por</span>
          <select
            value={values.sortBy}
            onChange={event => onChange({ sortBy: event.target.value as ListFiltersInput["sortBy"] })}
            disabled={disabled}
            className={styles.control}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.pie}>
        <div>
          <span className={styles.etiqueta}>Vista</span>
          <div role="group" aria-label="Cambiar vista" className={styles.vista}>
            <button
              type="button"
              onClick={() => onChange({ viewMode: "grid" })}
              aria-pressed={values.viewMode === "grid"}
              disabled={disabled}
              className={styles.toggle}
            >
              <Grid size={16} />
              Grid
            </button>
            <button
              type="button"
              onClick={() => onChange({ viewMode: "list" })}
              aria-pressed={values.viewMode === "list"}
              disabled={disabled}
              className={styles.toggle}
            >
              <List size={16} />
              Lista
            </button>
          </div>
        </div>
        <div className={styles.acciones}>
          <button type="submit" disabled={disabled} className={styles.aplicar}>
            Aplicar filtros
          </button>
          <button type="button" onClick={onReset} disabled={disabled || !hasFilters} className={styles.limpiar}>
            <RotateCcw size={16} />
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}

export default FiltersBar;
