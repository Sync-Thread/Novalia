// Utility formatters for public property detail page

/**
 * formatMoney: formatea una cantidad a moneda con símbolo (MXN por defecto).
 */
export function formatMoney(amount: number, currency = "MXN"): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

/**
 * formatArea: formatea m² con etiqueta "m²".
 */
export function formatArea(m2?: number | null): string {
  if (!m2 || !Number.isFinite(m2)) return "N/D";
  return `${Math.round(m2)} m²`;
}

/**
 * formatAddressFull: construye "colonia, ciudad, estado" omitiendo vacíos, sin separadores extra.
 */
export function formatAddressFull(
  colonia?: string | null,
  ciudad?: string | null,
  estado?: string | null
): string {
  const segments = [colonia, ciudad, estado]
    .map((seg) => (seg ?? "").trim())
    .filter((seg) => seg.length > 0);

  return segments.length > 0 ? segments.join(", ") : "Ubicación reservada";
}

/**
 * formatPropertyType: mapeo de tipos de propiedad a labels en español.
 */
export function formatPropertyType(type?: string | null): string {
  const typeMap: Record<string, string> = {
    apartment: "Departamento",
    house: "Casa",
    commercial: "Comercial",
    land: "Terreno",
    office: "Oficina",
    industrial: "Industrial",
    warehouse: "Bodega",
    duplex: "Dúplex",
    studio: "Estudio",
    loft: "Loft",
    villa: "Villa",
  };
  return type ? typeMap[type] ?? type : "N/D";
}

/**
 * formatNumber: formatea un número con separadores de miles.
 */
export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/D";
  }
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(value);
}
