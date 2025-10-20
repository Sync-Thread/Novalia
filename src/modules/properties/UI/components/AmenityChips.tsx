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
      { id: "garden", label: "Jard\u00edn" },
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
    label: "\u00c1reas comunes",
    items: [
      { id: "pool", label: "Alberca" },
      { id: "gym", label: "Gimnasio" },
      { id: "events_room", label: "Sal\u00f3n de eventos" },
    ],
  },
  {
    id: "sustentabilidad",
    label: "Sustentabilidad",
    items: [
      { id: "solar_panels", label: "Paneles solares" },
      { id: "rain_harvest", label: "Captaci\u00f3n pluvial" },
      { id: "led_lights", label: "Iluminaci\u00f3n LED" },
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
    <div className={styles.wrapper}>
      <div>
        {groups.map(group => (
          <section key={group.id} aria-labelledby={`amenities-${group.id}`} className={styles.group}>
            <h3 id={`amenities-${group.id}`} className={styles.groupTitle}>
              {group.label}
            </h3>
            <div className={styles.chips}>
              {group.items.map(item => {
                const active = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAmenity(item.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`${styles.chip} ${active ? styles.chipActive : ""}`.trim()}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {onExtraChange && (
        <div className={styles.extra}>
          <label htmlFor="amenities-extra" className={styles.extraLabel}>
            Otras amenidades
          </label>
          <textarea
            id="amenities-extra"
            placeholder={extraPlaceholder}
            value={extraValue ?? ""}
            onChange={event => onExtraChange(event.target.value)}
            disabled={disabled}
            rows={3}
            className={styles.extraField}
          />
        </div>
      )}
    </div>
  );
}

export default AmenityChips;
