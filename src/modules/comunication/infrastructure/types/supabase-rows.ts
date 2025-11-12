export type ChatThreadRow = {
  id: string;
  org_id: string | null;
  property_id: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
};

export type ChatParticipantRow = {
  thread_id?: string;
  user_id: string | null;
  contact_id: string | null;
  // Estos campos se agregan después del enriquecimiento
  // Supabase puede usar cualquiera de estos nombres dependiendo del query
  user_profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  contacts?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lead_contacts?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_type: "user" | "contact" | "system";
  sender_user_id: string | null;
  sender_contact_id: string | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

export type PropertySummaryRow = {
  id: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  state: string | null;
  operation_type: string | null;
  status: string | null;
};

export type LeadContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};
