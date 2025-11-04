export interface AddressParts {
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

// formatAddress construye "colonia, ciudad, estado" omitiendo valores vacíos.
export function formatAddress({ neighborhood, city, state }: AddressParts): string {
  const segments = [neighborhood, city, state]
    .map((segment) => (segment ?? "").trim())
    .filter((segment) => segment.length > 0);

  return segments.join(", ");
}

