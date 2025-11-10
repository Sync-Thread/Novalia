// DTOs para propiedades en el contexto de contracts
export interface PropertySummaryDTO {
  id: string;
  title: string;
  internalId: string | null;
  addressLine: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  coverImageS3Key: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
