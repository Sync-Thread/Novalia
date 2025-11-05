// DTO: Contrato para listado
export interface ContractListItemDTO {
  id: string;
  title: string;
  contractType: "intermediacion" | "oferta" | "promesa";
  status: "draft" | "pending_signature" | "signed" | "active" | "expired" | "cancelled";
  propertyId: string | null;
  propertyName: string | null;
  propertyInternalId: string | null;
  propertyCoverImageS3Key: string | null;
  clientContactId: string | null;
  clientName: string | null;
  issuedOn: string;
  dueOn: string | null;
  s3Key: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
