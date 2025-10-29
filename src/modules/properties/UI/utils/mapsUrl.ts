// Construye URL de Google Maps desde coordenadas o dirección textual

interface MapsUrlParams {
  lat?: number | null;
  lng?: number | null;
  colonia?: string | null;
  ciudad?: string | null;
  estado?: string | null;
}

/**
 * buildMapsUrl: genera URL de Google Maps.
 * Prioridad: coords (lat/lng) > query por dirección.
 */
export function buildMapsUrl(params: MapsUrlParams): string {
  const { lat, lng, colonia, ciudad, estado } = params;

  // Si hay coordenadas, usarlas directamente
  if (
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  // Fallback: construir query con dirección textual
  const addressParts = [colonia, ciudad, estado]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0);

  if (addressParts.length === 0) {
    // Sin datos, abrir Google Maps genérico
    return "https://www.google.com/maps";
  }

  const addressLine = addressParts.join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;
}
