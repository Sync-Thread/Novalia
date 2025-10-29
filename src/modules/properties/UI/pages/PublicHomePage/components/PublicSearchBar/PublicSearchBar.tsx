import type { FormEvent, KeyboardEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CustomSelect,
  type SelectOption,
} from "../../../../components/CustomSelect";
import {
  MEXICO_STATES_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "../../../../constants";
import type { PublicSearchFilters } from "../../types";
import {
  clampRange,
  formatPrice,
  hasActiveFilters,
} from "../../utils/filterUtils";
import { useStateCityOptions } from "./hooks/useStateCityOptions";
import styles from "./PublicSearchBar.module.css";

export interface PublicSearchBarHandle {
  hasActiveFilters: boolean;
}

export interface PublicSearchBarProps {
  value: PublicSearchFilters;
  onChange: (
    patch: Partial<PublicSearchFilters>,
    options?: { apply?: boolean }
  ) => void;
  onSubmit?: () => void;
  onReset: () => void;
  isCollapsedHero: boolean;
}

function parseInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value.trim().replace(/[^\d]/g, ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatPriceSummary(min?: number | null, max?: number | null) {
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (hasMin && hasMax) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  if (hasMin) return `Desde ${formatPrice(min)}`;
  if (hasMax) return `Hasta ${formatPrice(max)}`;
  return "Precio";
}

function toInputValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "";
}

export const PublicSearchBar = forwardRef<
  PublicSearchBarHandle,
  PublicSearchBarProps
>(function PublicSearchBar(
  { value, onChange, onReset, isCollapsedHero, onSubmit },
  ref
) {
  const [searchDraft, setSearchDraft] = useState(() => value.q ?? "");
  const [priceOpen, setPriceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState({
    min: toInputValue(value.priceMin ?? null),
    max: toInputValue(value.priceMax ?? null),
  });

  const searchDebounceRef = useRef<number | null>(null);
  const priceDialogRef = useRef<HTMLDivElement | null>(null);
  const priceMinInputRef = useRef<HTMLInputElement | null>(null);
  const moreDialogRef = useRef<HTMLDivElement | null>(null);
  const moreFirstFieldRef = useRef<HTMLInputElement | null>(null);

  const searchId = useId();
  const cityStatusId = useId();

  const {
    cities,
    loading: loadingCities,
    statusMessage,
  } = useStateCityOptions(value.state);
  const showCity = Boolean(value.state);

  const typeOptions = useMemo<SelectOption[]>(
    () => [{ value: "", label: "Todos" }, ...PROPERTY_TYPE_OPTIONS],
    []
  );

  const stateOptions = useMemo<SelectOption[]>(
    () =>
      MEXICO_STATES_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  const cityOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Todas" },
      ...cities.map((city) => ({ value: city.value, label: city.label })),
    ],
    [cities]
  );

  const cityDisabled = !showCity || loadingCities || cityOptions.length === 1;

  const hasFilters = useMemo(() => hasActiveFilters(value), [value]);

  const applyChange = useCallback(
    (patch: Partial<PublicSearchFilters>, options?: { apply?: boolean }) => {
      onChange(patch, options);
    },
    [onChange]
  );

  const flushSearch = useCallback(
    (apply: boolean) => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
      const normalized = searchDraft.trim();
      applyChange({ q: normalized }, { apply });
    },
    [applyChange, searchDraft]
  );

  useImperativeHandle(
    ref,
    () => ({
      hasActiveFilters: hasFilters,
    }),
    [hasFilters]
  );

  useEffect(() => {
    setSearchDraft(value.q ?? "");
  }, [value.q]);

  useEffect(() => {
    setPriceDraft({
      min: toInputValue(value.priceMin ?? null),
      max: toInputValue(value.priceMax ?? null),
    });
  }, [value.priceMin, value.priceMax]);

  useEffect(() => {
    if (searchDraft === (value.q ?? "")) return;

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      applyChange({ q: searchDraft });
    }, 320);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [applyChange, searchDraft, value.q]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!moreDialogRef.current) return;
      if (moreDialogRef.current.contains(event.target as Node)) return;
      setMoreOpen(false);
    };
    const handleEsc = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    window.setTimeout(() => {
      moreFirstFieldRef.current?.focus();
    }, 10);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!isCollapsedHero) return;
    setPriceOpen(false);
    setMoreOpen(false);
  }, [isCollapsedHero]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      flushSearch(true);
      onSubmit?.();
    },
    [flushSearch, onSubmit]
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        flushSearch(true);
        onSubmit?.();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSearchDraft("");
        applyChange({ q: "" }, { apply: true });
      }
    },
    [applyChange, flushSearch, onSubmit]
  );

  const handleReset = useCallback(() => {
    setSearchDraft("");
    onReset();
  }, [onReset]);

  const applyPriceDraft = useCallback(() => {
    const min = parseInteger(priceDraft.min);
    const max = parseInteger(priceDraft.max);
    const { min: safeMin, max: safeMax } = clampRange(min, max);
    applyChange(
      {
        priceMin: safeMin ?? null,
        priceMax: safeMax ?? null,
      },
      { apply: true }
    );
    setPriceDraft({
      min: toInputValue(safeMin ?? null),
      max: toInputValue(safeMax ?? null),
    });
    setPriceOpen(false);
  }, [applyChange, priceDraft.max, priceDraft.min]);

  useEffect(() => {
    if (!priceOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!priceDialogRef.current) return;
      if (priceDialogRef.current.contains(event.target as Node)) return;
      setPriceOpen(false);
    };
    const handleKeys = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key === "Escape") {
        setPriceDraft({
          min: toInputValue(value.priceMin ?? null),
          max: toInputValue(value.priceMax ?? null),
        });
        setPriceOpen(false);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        applyPriceDraft();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeys);
    window.setTimeout(() => {
      priceMinInputRef.current?.focus();
    }, 10);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeys);
    };
  }, [applyPriceDraft, priceOpen, value.priceMin, value.priceMax]);

  const priceSummary = formatPriceSummary(
    value.priceMin ?? null,
    value.priceMax ?? null
  );
  const priceDisplay = priceSummary;

  return (
    <form
      className={styles.searchBar}
      role="search"
      aria-labelledby={searchId}
      onSubmit={handleSubmit}
    >
      <span id={searchId} className={styles.srOnly}>
        Buscar propiedades publicas
      </span>

      <div className={`${styles.control} ${styles.searchControl}`}>
        <label className={styles.srOnly} htmlFor={`${searchId}-query`}>
          Buscar por palabras clave
        </label>
        <div className={styles.searchField}>
          <SearchIcon size={18} aria-hidden="true" />
          <input
            id={`${searchId}-query`}
            type="search"
            inputMode="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar..."
            autoComplete="off"
            aria-label="Buscar por nombre, palabra clave o ubicacion"
          />
          {searchDraft.trim().length > 0 && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => {
                setSearchDraft("");
                applyChange({ q: "" }, { apply: true });
              }}
              aria-label="Limpiar busqueda"
              title="Limpiar busqueda"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.control} ${styles.typeControl}`}>
        <div className={styles.selectShell}>
          <CustomSelect
            value={value.propertyType}
            options={typeOptions}
            onChange={(next) =>
              applyChange({ propertyType: next }, { apply: true })
            }
            placeholder="Todos"
            ariaLabel="Filtrar por tipo de propiedad"
          />
        </div>
      </div>

      <div
        className={`${styles.control} ${styles.cityControl}`}
        data-visible={showCity || loadingCities || undefined}
      >
        <div
          className={styles.selectShell}
          data-disabled={cityDisabled || undefined}
        >
          <CustomSelect
            value={value.city}
            options={cityOptions}
            onChange={(next) => applyChange({ city: next }, { apply: true })}
            disabled={cityDisabled}
            placeholder="Todas"
            ariaLabel="Filtrar por ciudad"
            ariaDescribedBy={statusMessage ? cityStatusId : undefined}
          />
        </div>
        {/* {statusMessage && (
          <span
            className={styles.srOnly}
            id={cityStatusId}
            role="status"
            aria-live="polite"
          >
            {statusMessage}dsd
          </span>
        )} */}
      </div>

      <div className={`${styles.control} ${styles.stateControl}`}>
        <div className={styles.selectShell}>
          <CustomSelect
            value={value.state}
            options={[{ value: "", label: "Todos" }, ...stateOptions]}
            onChange={(next) =>
              applyChange({ state: next, city: "" }, { apply: true })
            }
            ariaLabel="Filtrar por estado"
          />
        </div>
      </div>

      <div className={`${styles.control} ${styles.priceControl}`}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setPriceOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={priceOpen}
          title="Filtrar por rango de precios"
          aria-label="Filtrar por precio"
        >
          <span>{priceDisplay}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {priceOpen && (
          <div
            ref={priceDialogRef}
            className={styles.pricePopover}
            role="dialog"
            aria-label="Rango de precios"
          >
            <div className={styles.priceInputs}>
              <label className={styles.popoverLabel}>
                Min
                <input
                  ref={priceMinInputRef}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={priceDraft.min}
                  onChange={(event) =>
                    setPriceDraft((prev) => ({
                      ...prev,
                      min: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                Max
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={priceDraft.max}
                  onChange={(event) =>
                    setPriceDraft((prev) => ({
                      ...prev,
                      max: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className={styles.popoverActions}>
              <button
                type="button"
                className={styles.popoverSecondary}
                onClick={() => {
                  setPriceDraft({ min: "", max: "" });
                  applyChange(
                    { priceMin: null, priceMax: null },
                    { apply: true }
                  );
                  setPriceOpen(false);
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                className={styles.popoverPrimary}
                onClick={applyPriceDraft}
              >
                Aplicar
              </button>
            </div>
            <button
              type="button"
              className={styles.popoverClose}
              onClick={() => setPriceOpen(false)}
              aria-label="Cerrar rango de precios"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className={`${styles.control} `}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-label="Mas filtros"
          title="Mas filtros"
          data-active={moreOpen || undefined}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
        </button>
        {moreOpen && (
          <div
            ref={moreDialogRef}
            className={styles.morePopover}
            role="dialog"
            aria-label="Filtros adicionales"
          >
            <div className={styles.moreGrid}>
              <label className={styles.popoverLabel}>
                Pisos
                <input
                  ref={moreFirstFieldRef}
                  type="number"
                  min={0}
                  value={toInputValue(value.levels ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { levels: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                Recamaras
                <input
                  type="number"
                  min={0}
                  value={toInputValue(value.bedrooms ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { bedrooms: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                Banos
                <input
                  type="number"
                  min={0}
                  value={toInputValue(value.bathrooms ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { bathrooms: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                Estacionamientos
                <input
                  type="number"
                  min={0}
                  value={toInputValue(value.parkingSpots ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { parkingSpots: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                m2 min
                <input
                  type="number"
                  min={0}
                  value={toInputValue(value.areaMin ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { areaMin: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
              <label className={styles.popoverLabel}>
                m2 max
                <input
                  type="number"
                  min={0}
                  value={toInputValue(value.areaMax ?? null)}
                  onChange={(event) =>
                    applyChange(
                      { areaMax: parseInteger(event.target.value) },
                      { apply: false }
                    )
                  }
                />
              </label>
            </div>
            <div className={styles.popoverActions}>
              <button
                type="button"
                className={styles.popoverSecondary}
                onClick={() => {
                  applyChange(
                    {
                      levels: null,
                      bedrooms: null,
                      bathrooms: null,
                      parkingSpots: null,
                      areaMin: null,
                      areaMax: null,
                    },
                    { apply: true }
                  );
                  setMoreOpen(false);
                }}
              >
                Limpiar
              </button>
              <button
                type="button"
                className={styles.popoverPrimary}
                onClick={() => setMoreOpen(false)}
              >
                Listo
              </button>
            </div>
            <button
              type="button"
              className={styles.popoverClose}
              onClick={() => setMoreOpen(false)}
              aria-label="Cerrar filtros adicionales"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {hasFilters && (
        <div className={`${styles.control} ${styles.resetControl}`}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleReset}
            aria-label="Restablecer filtros"
            title="Restablecer filtros"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </form>
  );
});

PublicSearchBar.displayName = "PublicSearchBar";
