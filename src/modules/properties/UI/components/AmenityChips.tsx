
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

export function AmenityChips({
  selected,
  onChange,
  groups,
  extraValue,
  onExtraChange,
  extraPlaceholder = "Escribe amenidades adicionales…",
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        {groups.map(group => (
          <section key={group.id} aria-labelledby={`amenities-${group.id}`}>
            <h3
              id={`amenities-${group.id}`}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: 10,
              }}
            >
              {group.label}
            </h3>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {group.items.map(item => {
                const active = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAmenity(item.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: active ? "1px solid rgba(41,93,255,0.4)" : "1px solid rgba(148,163,184,0.4)",
                      background: active ? "rgba(41,93,255,0.12)" : "#fff",
                      color: active ? "#1d4ed8" : "#475569",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: disabled ? "not-allowed" : "pointer",
                      boxShadow: active ? "0 8px 18px rgba(41,93,255,0.15)" : "none",
                      transition: "all 0.2s ease",
                    }}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            htmlFor="amenities-extra"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            Otras amenidades
          </label>
          <textarea
            id="amenities-extra"
            placeholder={extraPlaceholder}
            value={extraValue ?? ""}
            onChange={event => onExtraChange(event.target.value)}
            disabled={disabled}
            rows={3}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.5)",
              padding: "12px 14px",
              fontSize: 14,
              fontFamily: "'Inter', system-ui, sans-serif",
              resize: "vertical",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default AmenityChips;

