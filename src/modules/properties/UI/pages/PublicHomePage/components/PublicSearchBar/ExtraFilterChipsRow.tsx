import { X } from "lucide-react";
import type { ActiveExtraFilter } from "../../utils/filterUtils";
import styles from "./ExtraFilterChipsRow.module.css";

export interface ExtraFilterChipsRowProps {
  items: ActiveExtraFilter[];
  onClearAll?: () => void;
}

export function ExtraFilterChipsRow({
  items,
  onClearAll,
}: ExtraFilterChipsRowProps) {
  if (items.length === 0) {
    return null;
  }

  const showClearAll = items.length >= 2 && onClearAll;

  return (
    <div className={styles.chipsRow} role="list" aria-label="Filtros activos">
      {items.map((item) => (
        <div key={item.key} className={styles.chip} role="listitem">
          <span className={styles.chipLabel}>
            {item.label}: <strong>{item.value}</strong>
          </span>
          <button
            type="button"
            className={styles.chipClose}
            onClick={item.clear}
            aria-label={`Quitar ${item.label}`}
            title={`Quitar ${item.label}`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      {showClearAll && (
        <button
          type="button"
          className={styles.clearAllChip}
          onClick={onClearAll}
          aria-label="Limpiar todos los filtros extras"
          title="Limpiar todos los filtros extras"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
