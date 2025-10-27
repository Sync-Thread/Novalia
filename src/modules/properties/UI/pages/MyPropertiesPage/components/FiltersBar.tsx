import React, { useCallback, useEffect, useRef, useState } from "react";
import { Grid, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type {
  PropertyListFilters,
  PropertyStatusFilter,
} from "../../../hooks/usePropertyList";
import type { ListFiltersInput } from "../../../../application/validators/filters.schema";
import {
  CustomSelect,
  type SelectOption,
} from "../../../components/CustomSelect";

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

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicadas" },
  { value: "sold", label: "Vendidas" },
];

const TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Todos los tipos" },
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Departamento" },
  { value: "land", label: "Terreno" },
  { value: "office", label: "Oficina" },
  { value: "commercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Otro" },
];

const SORT_OPTIONS: SelectOption[] = [
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

export function FiltersBar({
  values,
  onChange,
  onReset,
  disabled,
}: FiltersBarProps) {
  const [local, setLocal] = useState(() => ({
    q: values.q ?? "",
    city: values.city ?? "",
    state: values.state ?? "",
    priceMin: values.priceMin?.toString() ?? "",
    priceMax: values.priceMax?.toString() ?? "",
  }));
  const [moreOpen, setMoreOpen] = useState(false);
  const fromValuesRef = useRef(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fromValuesRef.current = true;
    setLocal({
      q: values.q ?? "",
      city: values.city ?? "",
      state: values.state ?? "",
      priceMin: values.priceMin?.toString() ?? "",
      priceMax: values.priceMax?.toString() ?? "",
    });
  }, [values]);

  useEffect(() => {
    if (fromValuesRef.current) {
      fromValuesRef.current = false;
      return;
    }
    const handler = window.setTimeout(() => {
      onChange({
        q: local.q.trim() || undefined,
        city: local.city.trim() || undefined,
        state: local.state.trim() || undefined,
        priceMin: parseNumber(local.priceMin),
        priceMax: parseNumber(local.priceMax),
      });
    }, 450);
    return () => window.clearTimeout(handler);
  }, [local, onChange]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!moreRef.current) return;
      if (moreRef.current.contains(event.target as Node)) return;
      setMoreOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (disabled) {
      setMoreOpen(false);
    }
  }, [disabled]);

  const hasFilters =
    (values.q ?? "") !== "" ||
    values.status !== "all" ||
    (values.propertyType ?? "") !== "" ||
    (values.city ?? "") !== "" ||
    (values.state ?? "") !== "" ||
    typeof values.priceMin === "number" ||
    typeof values.priceMax === "number" ||
    values.sortBy !== "recent";

  const extraFiltersActive =
    (values.city ?? "") !== "" ||
    (values.state ?? "") !== "" ||
    typeof values.priceMin === "number" ||
    typeof values.priceMax === "number";

  const handleReset = useCallback(() => {
    setMoreOpen(false);
    onReset();
  }, [onReset]);

  const pillClass = (options?: { noArrow?: boolean; withIcon?: boolean }) =>
    [
      "select-control",
      "select-control--compact",
      options?.noArrow ? "select-control--no-arrow" : "",
      options?.withIcon ? "select-control--with-icon" : "",
      "filters-bar__pill",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <form
      className="filters-bar"
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <div className="filters-bar__primary">
        <div
          className={pillClass({ noArrow: true, withIcon: true })}
          data-disabled={disabled || undefined}
        >
          <span className="select-control__icon">
            <Search size={16} aria-hidden="true" />
          </span>
          <input
            type="search"
            aria-label="Buscar por título o ID"
            placeholder="Buscar por título"
            value={local.q}
            onChange={(event) =>
              setLocal((prev) => ({ ...prev, q: event.target.value }))
            }
            disabled={disabled}
            className="select-control__input"
          />
        </div>

        <div
          className={pillClass({ noArrow: true })}
          data-disabled={disabled || undefined}
        >
          <CustomSelect
            value={values.status}
            options={STATUS_OPTIONS}
            onChange={(value) =>
              onChange({ status: value as PropertyStatusFilter })
            }
            disabled={disabled}
            placeholder="Estado"
          />
        </div>

        <div
          className={pillClass({ noArrow: true })}
          data-disabled={disabled || undefined}
        >
          <CustomSelect
            value={values.propertyType ?? ""}
            options={TYPE_OPTIONS}
            onChange={(value) => onChange({ propertyType: value || undefined })}
            disabled={disabled}
            placeholder="Tipo"
          />
        </div>

        <div
          className={pillClass({ noArrow: true })}
          data-disabled={disabled || undefined}
        >
          <CustomSelect
            value={values.sortBy}
            options={SORT_OPTIONS}
            onChange={(value) =>
              onChange({
                sortBy: value as ListFiltersInput["sortBy"],
              })
            }
            disabled={disabled}
            placeholder="Ordenar"
          />
        </div>
      </div>

      <div className="filters-bar__actions">
        <div className="filters-bar__actions-left">
          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled}
              className="filters-bar__reset"
              aria-label="Restablecer filtros"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <div ref={moreRef} className="filters-bar__more">
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              className="filters-bar__more-button"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              disabled={disabled}
              data-active={extraFiltersActive || undefined}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Más filtros
            </button>
            {moreOpen && !disabled && (
              <div
                className="filters-bar__more-panel"
                role="dialog"
                aria-label="Filtros adicionales"
              >
                <div className="filters-bar__more-field">
                  <span className="filters-bar__more-label">Ciudad</span>
                  <input
                    type="text"
                    value={local.city}
                    onChange={(event) =>
                      setLocal((prev) => ({
                        ...prev,
                        city: event.target.value,
                      }))
                    }
                    className="filters-bar__more-input"
                    placeholder="Todas"
                  />
                </div>
                <div className="filters-bar__more-field">
                  <span className="filters-bar__more-label">Estado</span>
                  <input
                    type="text"
                    value={local.state}
                    onChange={(event) =>
                      setLocal((prev) => ({
                        ...prev,
                        state: event.target.value,
                      }))
                    }
                    className="filters-bar__more-input"
                    placeholder="Todos"
                  />
                </div>
                <div className="filters-bar__more-group">
                  <div className="filters-bar__more-field">
                    <span className="filters-bar__more-label">Precio mín.</span>
                    <input
                      type="number"
                      min={0}
                      value={local.priceMin}
                      onChange={(event) =>
                        setLocal((prev) => ({
                          ...prev,
                          priceMin: event.target.value,
                        }))
                      }
                      className="filters-bar__more-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="filters-bar__more-field">
                    <span className="filters-bar__more-label">Precio máx.</span>
                    <input
                      type="number"
                      min={0}
                      value={local.priceMax}
                      onChange={(event) =>
                        setLocal((prev) => ({
                          ...prev,
                          priceMax: event.target.value,
                        }))
                      }
                      className="filters-bar__more-input"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          role="group"
          aria-label="Cambiar vista"
          className="filters-bar__view-toggle"
        >
          <button
            type="button"
            onClick={() => onChange({ viewMode: "grid" })}
            aria-pressed={values.viewMode === "grid"}
            disabled={disabled}
            className="filters-bar__view-button"
          >
            <Grid size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChange({ viewMode: "list" })}
            aria-pressed={values.viewMode === "list"}
            disabled={disabled}
            className="filters-bar__view-button"
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </form>
  );
}

export default FiltersBar;
