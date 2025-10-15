
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  contact_id uuid references public.lead_contacts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
create table if not exists public.chat_participants (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  contact_id uuid references public.lead_contacts(id) on delete cascade,
  primary key (thread_id, user_id, contact_id)
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_type sender_type_enum not null,
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_contact_id uuid references public.lead_contacts(id) on delete set null,
  body text,
  payload jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz
);
create index if not exists idx_chat_messages_thread_time on public.chat_messages(thread_id, created_at);
