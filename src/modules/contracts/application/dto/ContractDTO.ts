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
  clientContactId: string | null; // ID desde lead_contacts (puede ser null)
  clientProfileId: string | null; // ID desde profiles (puede ser null) - NUEVO
  clientName: string | null; // Nombre del cliente (de cualquiera de las dos tablas)
  clientType: "lead_contact" | "profile" | null; // Tipo de cliente - NUEVO
  issuedOn: string;
  dueOn: string | null;
  s3Key: string | null;
  metadata: {
    fileName?: string;
    size?: number;
    contentType?: string;
    uploadedAt?: string;
  } | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
