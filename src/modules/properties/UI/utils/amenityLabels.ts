// amenityLabels: mapeo de IDs de amenidades a sus labels en español
// Basado en DEFAULT_AMENITY_GROUPS de AmenityChips

export const AMENITY_LABELS: Record<string, string> = {
  // Interior
  closets: "Closets",
  air_conditioning: "Aire acondicionado",
  equipped_kitchen: "Cocina equipada",
  
  // Exterior
  garden: "Jardín",
  terrace: "Terraza",
  grill: "Asador",
  
  // Seguridad
  cctv: "Circuito cerrado",
  controlled_access: "Acceso controlado",
  security_24h: "Seguridad 24/7",
  
  // Áreas comunes
  pool: "Alberca",
  gym: "Gimnasio",
  events_room: "Salón de eventos",
  
  // Sustentabilidad
  solar_panels: "Paneles solares",
  rain_harvest: "Captación pluvial",
  led_lights: "Iluminación LED",
  
  // Accesibilidad
  elevator: "Elevador",
  wheelchair_access: "Acceso silla de ruedas",
  wide_doors: "Puertas amplias",
};

/**
 * getAmenityLabel: obtiene el label de una amenidad o retorna el ID si no está mapeado.
 */
export function getAmenityLabel(id: string): string {
  return AMENITY_LABELS[id] ?? id;
}
