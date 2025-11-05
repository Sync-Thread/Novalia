// DTOs para clientes/contactos en el contexto de contracts
export interface ClientSummaryDTO {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
}
