const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, currency = "MXN"): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return currencyFormatter.format(amount);
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string | Date | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return "â€”";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "â€”";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Borrador",
    published: "Publicada",
    sold: "Vendida",
    archived: "Archivada",
  };
  return map[status] ?? status;
}

export function formatVerification(status: string | null | undefined): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    verified: "Verificado",
    rejected: "Rechazado",
  };
  if (!status) return "Sin documento";
  return map[status] ?? status;
}

export function shortenId(id: string, prefix = "PROP"): string {
  if (!id) return "";
  const last = id.slice(-6).toUpperCase();
  return `${prefix}-${last}`;
}


