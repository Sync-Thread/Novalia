import styles from "./AmenityChips.module.css";

export interface AmenityChip {
  id: string;
  label: string;
}

export interface AmenityGroup {
  id: string;
  label: string;
  items: AmenityChip[];
}

export const DEFAULT_AMENITY_GROUPS: AmenityGroup[] = [
  {
    id: "interior",
    label: "Interior",
    items: [
      { id: "closets", label: "Closets" },
      { id: "air_conditioning", label: "Aire acondicionado" },
      { id: "equipped_kitchen", label: "Cocina equipada" },
    ],
  },
  {
    id: "exterior",
    label: "Exterior",
    items: [
      { id: "garden", label: "Jardín" },
      { id: "terrace", label: "Terraza" },
      { id: "grill", label: "Asador" },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad",
    items: [
      { id: "cctv", label: "Circuito cerrado" },
      { id: "controlled_access", label: "Acceso controlado" },
      { id: "security_24h", label: "Seguridad 24/7" },
    ],
  },
  {
    id: "comunes",
    label: "Áreas comunes",
    items: [
      { id: "pool", label: "Alberca" },
      { id: "gym", label: "Gimnasio" },
      { id: "events_room", label: "Salón de eventos" },
    ],
  },
  {
    id: "sustentabilidad",
    label: "Sustentabilidad",
    items: [
      { id: "solar_panels", label: "Paneles solares" },
      { id: "rain_harvest", label: "Captación pluvial" },
      { id: "led_lights", label: "Iluminación LED" },
    ],
  },
  {
    id: "accesibilidad",
    label: "Accesibilidad",
    items: [
      { id: "elevator", label: "Elevador" },
      { id: "wheelchair_access", label: "Acceso silla de ruedas" },
      { id: "wide_doors", label: "Puertas amplias" },
    ],
  },
];

export interface AmenityChipsProps {
  selected: string[];
  onChange: (next: string[]) => void;
  groups: AmenityGroup[];
  extraValue?: string;
  onExtraChange?: (value: string) => void;
  extraPlaceholder?: string;
  disabled?: boolean;
}

/**
 * Selector de amenidades con chips. Solo maqueta; no altera la lógica de selección.
 */
export function AmenityChips({
  selected,
  onChange,
  groups,
  extraValue,
  onExtraChange,
  extraPlaceholder = "Escribe amenidades adicionales...",
  disabled,
}: AmenityChipsProps) {
  const toggleAmenity = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={styles.grupo}>
      <div>
        {groups.map(group => (
          <section key={group.id} className={styles.bloque} aria-labelledby={`amenities-${group.id}`}>
            <h3 id={`amenities-${group.id}`} className={styles.titulo}>
              {group.label}
            </h3>
            <div className={styles.chips}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAmenity(item.id)}
                  disabled={disabled}
                  aria-pressed={selected.includes(item.id)}
                  className={styles.chip}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {onExtraChange && (
        <label htmlFor="amenities-extra" className={styles.texto}>
          <span className={styles.titulo}>Otras amenidades</span>
          <textarea
            id="amenities-extra"
            placeholder={extraPlaceholder}
            value={extraValue ?? ""}
            onChange={event => onExtraChange(event.target.value)}
            disabled={disabled}
            rows={3}
            className={styles.input}
          />
        </label>
      )}
    </div>
  );
}

export default AmenityChips;
