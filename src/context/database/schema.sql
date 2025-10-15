-- NOVALIA – Esquema base (orden corregido: integration_providers antes de usarla)

-- 0) EXTENSIONES
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists citext;

-- 1) ENUMS
do $$begin create type org_type_enum            as enum ('agency','agent','seller_individual','notary','platform_admin'); exception when duplicate_object then null; end$$;
do $$begin create type property_status_enum     as enum ('draft','published','archived');                               exception when duplicate_object then null; end$$;
do $$begin create type property_type_enum       as enum ('house','apartment','land','office','commercial','industrial','other'); exception when duplicate_object then null; end$$;
do $$begin create type operation_type_enum      as enum ('sale','rent');                                                exception when duplicate_object then null; end$$;
do $$begin create type media_type_enum          as enum ('image','video','document');                                   exception when duplicate_object then null; end$$;
do $$begin create type verification_status_enum as enum ('pending','verified','rejected');                              exception when duplicate_object then null; end$$;
do $$begin create type doc_type_enum            as enum ('deed','no_predial_debt','ine','rpp_certificate','plan','other'); exception when duplicate_object then null; end$$;
do $$begin create type event_type_enum          as enum ('page_view','property_click','share','open_outbound','chat_open','first_contact','chat_message'); exception when duplicate_object then null; end$$;
do $$begin create type contract_type_enum       as enum ('intermediacion','oferta','promesa');                          exception when duplicate_object then null; end$$;
do $$begin create type contract_status_enum     as enum ('draft','sent','signed','cancelled','expired');                exception when duplicate_object then null; end$$;
do $$begin create type invoice_status_enum      as enum ('pending','issued','cancelled','paid','failed');               exception when duplicate_object then null; end$$;
do $$begin create type sender_type_enum         as enum ('user','contact','system');                                    exception when duplicate_object then null; end$$;
do $$begin create type currency_enum            as enum ('MXN','USD');                                                  exception when duplicate_object then null; end$$;
do $$begin create type channel_enum             as enum ('email','sms','whatsapp','push','webhook');                    exception when duplicate_object then null; end$$;
do $$begin create type message_status_enum      as enum ('queued','sent','delivered','failed','bounced');               exception when duplicate_object then null; end$$;
do $$begin create type payment_method_enum      as enum ('card','spei','split_notary');                                 exception when duplicate_object then null; end$$;
do $$begin create type payment_status_enum      as enum ('initiated','confirmed','failed','refunded');                  exception when duplicate_object then null; end$$;

-- 2) HELPERS sin dependencias
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;

-- 3) IAM
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type org_type_enum not null default 'agency',
  rfc text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger organizations_updated_at before update on public.organizations
for each row execute procedure public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  full_name text,
  email citext unique,
  phone text,
  role_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text
);
create table if not exists public.user_org_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id  uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  primary key (user_id, org_id, role_id)
);

-- 4) HELPER que usa tablas IAM
create or replace function public.is_in_org(p_org uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.org_id = p_org);
$$;

-- 5) CATÁLOGOS / PLANES
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null
);
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  geom geometry(multipolygon,4326),
  created_at timestamptz not null default now()
);
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  commission_rate numeric(6,5) not null default 0.02000,
  features jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.org_plan_subscriptions (
  org_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  primary key (org_id, plan_id, starts_at)
);

-- 6) *INTEGRATION PROVIDERS* (MOVIDO ARRIBA: requerido por mensajería/webhooks/integrations)
create table if not exists public.integration_providers (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,   -- 'sat','ine','rpp','whatsapp','sms','email','payments'
  name text not null
);

-- 7) PROPIEDADES
create or replace function properties_update_tsv() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.address_line,'')), 'C');
  return new;
end$$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  lister_user_id uuid references public.profiles(id) on delete set null,
  status property_status_enum not null default 'draft',
  property_type property_type_enum not null,
  operation_type operation_type_enum not null,
  title text not null,
  description text,
  price numeric(14,2) not null check (price > 0),
  currency currency_enum not null default 'MXN',
  bedrooms int check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4,1) check (bathrooms is null or bathrooms >= 0),
  parking_spots int check (parking_spots is null or parking_spots >= 0),
  construction_m2 numeric(12,2) check (construction_m2 is null or construction_m2 >= 0),
  land_m2 numeric(12,2) check (land_m2 is null or land_m2 >= 0),
  amenities text[] default '{}',
  address_line text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  location geography(point,4326),
  normalized_address jsonb,
  rpp_verified verification_status_enum not null default 'pending',
  completeness_score int default 0,
  trust_score int default 0,
  tags_cached text[] default '{}',
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint properties_published_requires_date check (status <> 'published' or published_at is not null)
);
create trigger properties_tsv_trigger before insert or update of title,description,address_line
on public.properties for each row execute procedure properties_update_tsv();
create trigger properties_updated_at before update on public.properties
for each row execute procedure public.set_updated_at();

create table if not exists public.property_tags (
  property_id uuid not null references public.properties(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (property_id, tag_id)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  media_type media_type_enum not null,
  s3_key text,
  url text,
  position int default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  related_type text not null,
  related_id uuid not null,
  doc_type doc_type_enum not null default 'other',
  verification verification_status_enum not null default 'pending',
  source text,
  hash_sha256 text,
  s3_key text,
  url text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger documents_updated_at before update on public.documents
for each row execute procedure public.set_updated_at();

create index if not exists idx_properties_geo on public.properties using gist (location);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_search on public.properties using gin (search_vector);
create index if not exists idx_properties_tags_cached on public.properties using gin (tags_cached);
create index if not exists idx_documents_related on public.documents(related_type, related_id);

-- 8) TRACKING & ATRIBUCIÓN
create table if not exists public.fingerprints (
  id uuid primary key default gen_random_uuid(),
  fp_hash text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique(fp_hash)
);
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  fingerprint_id uuid not null references public.fingerprints(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  utm jsonb,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  event_type event_type_enum not null,
  payload jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_events_time on public.events(occurred_at desc);
create index if not exists idx_events_property_type on public.events(property_id, event_type);

create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email citext,
  phone text,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_lead_contacts_email_unique on public.lead_contacts (lower(email)) where email is not null;
create unique index if not exists idx_lead_contacts_phone_unique on public.lead_contacts ((regexp_replace(phone,'\D','','g'))) where phone is not null;

create table if not exists public.property_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  contact_id uuid not null references public.lead_contacts(id) on delete cascade,
  first_event_id uuid references public.events(id) on delete set null,
  status text default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.attributions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  lead_id uuid not null references public.property_leads(id) on delete cascade,
  method text not null,
  confidence numeric(5,4) not null default 0.8000,
  window_days int not null default 180,
  valid_until timestamptz not null default (now() + interval '180 days'),
  locked boolean not null default false,
  evidence jsonb,
  created_at timestamptz not null default now(),
  unique(property_id, lead_id)
);
create index if not exists idx_leads_property on public.property_leads(property_id, created_at desc);
create index if not exists idx_attributions_valid on public.attributions(valid_until, locked);

create table if not exists public.attribution_disputes (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.attributions(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'open',
  reason text,
  evidence jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 9) CHAT + MENSAJERÍA
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

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  channel channel_enum not null,
  name text not null,
  subject text,
  body_markdown text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique(org_id, code, channel)
);

-- (AQUÍ ya existe integration_providers, así que FK es válida)
create table if not exists public.message_dispatches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.message_templates(id) on delete set null,
  channel channel_enum not null,
  provider_id uuid references public.integration_providers(id) on delete set null,
  to_address text not null,
  payload jsonb,
  status message_status_enum not null default 'queued',
  error text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz
);
create index if not exists idx_dispatches_status_next on public.message_dispatches(status, next_retry_at);

-- 10) KYC / INE
create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  status verification_status_enum not null default 'pending',
  evidence jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger kyc_verif_updated_at before update on public.kyc_verifications
for each row execute procedure public.set_updated_at();

-- 11) CONTRATOS / NOTARÍA
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  contract_type contract_type_enum not null,
  body_markdown text not null,
  version int not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  template_id uuid references public.contract_templates(id) on delete set null,
  contract_type contract_type_enum not null,
  status contract_status_enum not null default 'draft',
  seller_org_id uuid references public.organizations(id) on delete set null,
  buyer_contact_id uuid references public.lead_contacts(id) on delete set null,
  file_url text,
  metadata jsonb,
  fiel_signer_rfc text,
  fiel_seal text,
  fiel_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_signed_requires_fiel check (status <> 'signed' or (fiel_signer_rfc is not null and fiel_seal is not null and fiel_signed_at is not null))
);
create trigger contracts_updated_at before update on public.contracts
for each row execute procedure public.set_updated_at();

create table if not exists public.notary_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  notary_org_id uuid references public.organizations(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  status text not null default 'open',
  checklist jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger notary_cases_updated_at before update on public.notary_cases
for each row execute procedure public.set_updated_at();
create index if not exists idx_contracts_status on public.contracts(status, created_at desc);

-- 12) FACTURACIÓN / COMISIÓN / PAGOS
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  cfdi_uuid text,
  serie text,
  folio text,
  emitter_rfc text,
  receiver_rfc text,
  subtotal numeric(14,2) not null,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  currency currency_enum not null default 'MXN',
  status invoice_status_enum not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_paid_requires_paid_at check (status <> 'paid' or paid_at is not null)
);
create trigger invoices_updated_at before update on public.invoices
for each row execute procedure public.set_updated_at();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null,
  amount numeric(14,2) not null
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  rate numeric(6,5) not null default 0.02000,
  penalty_factor numeric(6,3) not null default 1.50,
  effective_from date not null default now()::date,
  effective_to date,
  unique(org_id, effective_from)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  method payment_method_enum not null,
  status payment_status_enum not null default 'initiated',
  amount numeric(14,2) not null check (amount >= 0),
  provider_ref text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated_at before update on public.payments
for each row execute procedure public.set_updated_at();
create index if not exists idx_payments_invoice_method_status on public.payments(invoice_id, method, status);
create index if not exists idx_invoices_status_due on public.invoices(status, due_at);

-- 13) INTEGRACIONES (usa integration_providers ya creada)
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  provider_id uuid not null references public.integration_providers(id) on delete cascade,
  credentials jsonb,
  settings jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(org_id, provider_id)
);
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  provider_id uuid references public.integration_providers(id) on delete set null,
  url text not null,
  secret text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid references public.webhooks(id) on delete set null,
  request jsonb,
  response jsonb,
  status_code int,
  created_at timestamptz not null default now()
);

-- 14) JOBS / COLAS
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  queue text not null,
  payload jsonb not null,
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger jobs_updated_at before update on public.jobs
for each row execute procedure public.set_updated_at();

-- 15) AUDITORÍA
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  ip inet,
  payload jsonb
);
create index if not exists idx_audit_time on public.audit_logs(occurred_at desc);

-- 16) RLS (activar al final)
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_org_roles enable row level security;

alter table public.properties enable row level security;
alter table public.media_assets enable row level security;
alter table public.documents enable row level security;

alter table public.fingerprints enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.property_leads enable row level security;
alter table public.attributions enable row level security;
alter table public.attribution_disputes enable row level security;

alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

alter table public.message_templates enable row level security;
alter table public.message_dispatches enable row level security;

alter table public.kyc_verifications enable row level security;

alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.notary_cases enable row level security;

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.commission_rules enable row level security;
alter table public.payments enable row level security;

alter table public.plans enable row level security;
alter table public.org_plan_subscriptions enable row level security;

alter table public.integration_providers enable row level security;
alter table public.integrations enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_logs enable row level security;

alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.tags enable row level security;
alter table public.property_tags enable row level security;
alter table public.zones enable row level security;

-- POLÍTICAS (idénticas a la versión anterior)
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

create policy org_member_read on public.organizations for select using (public.is_in_org(id));
create policy user_org_roles_select on public.user_org_roles
  for select using (org_id in (select org_id from public.profiles where id = auth.uid()));
create policy roles_read_all on public.roles for select using (true);

create policy properties_public_read_published on public.properties for select using (status = 'published');
create policy properties_org_rw on public.properties
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy media_org_rw on public.media_assets
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy documents_org_rw on public.documents
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));

create policy fingerprints_anon_insert on public.fingerprints for insert with check (true);
create policy sessions_anon_insert     on public.sessions     for insert with check (true);
create policy events_anon_insert       on public.events       for insert with check (true);
create policy events_org_read          on public.events       for select using (org_id is not null and public.is_in_org(org_id));

create policy leads_org_rw on public.property_leads
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy attributions_org_rw on public.attributions
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy attribution_disputes_org_rw on public.attribution_disputes
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy threads_org_rw on public.chat_threads
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy participants_org_rw on public.chat_participants
  for all using (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)))
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)));
create policy messages_thread_scope on public.chat_messages
  for all using (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)))
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id)));

create policy templates_read    on public.message_templates for select using (true);
create policy templates_org_rw  on public.message_templates
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));
create policy dispatches_org_rw on public.message_dispatches
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy kyc_self_or_org_read on public.kyc_verifications
  for select using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.org_id is not null));
create policy kyc_self_insert on public.kyc_verifications for insert with check (user_id = auth.uid());

create policy contracts_org_rw on public.contracts
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy notary_cases_org_rw on public.notary_cases
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy invoices_org_rw on public.invoices
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy invoice_items_cascade on public.invoice_items
  for all using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)));
create policy commission_rules_rw on public.commission_rules
  for all using (org_id is null or public.is_in_org(org_id))
  with check (org_id is null or public.is_in_org(org_id));
create policy payments_cascade on public.payments
  for all using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id)));

create policy plans_read on public.plans for select using (true);
create policy org_plan_rw on public.org_plan_subscriptions
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy integration_providers_ro on public.integration_providers for select using (true);
create policy integrations_org_rw on public.integrations
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy webhooks_org_rw on public.webhooks
  for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy webhook_logs_org_r on public.webhook_logs
  for select using (exists (select 1 from public.webhooks w where w.id = webhook_id and public.is_in_org(w.org_id)));

create policy audit_org_read on public.audit_logs for select using (org_id is not null and public.is_in_org(org_id));
create policy tags_public_read on public.tags for select using (true);
create policy zones_public_read on public.zones for select using (true);
create policy property_tags_public_read on public.property_tags for select using (true);








-- Exporta el esquema actual
pg_dump --schema-only --no-owner --no-privileges -d postgres://<connection> > novalia_backup_before_auth.sql




alter table public.organizations
  add column if not exists org_code text;

update public.organizations
set org_code = encode(gen_random_bytes(4), 'hex')
where org_code is null;

alter table public.organizations
  alter column org_code set not null;

create unique index if not exists uq_organizations_org_code
  on public.organizations (org_code);





alter table public.user_org_roles drop constraint if exists user_org_roles_pkey;

alter table public.user_org_roles
  add constraint user_org_roles_pk primary key (user_id, org_id);

create unique index if not exists uq_user_single_org on public.user_org_roles(user_id);

alter table public.user_org_roles
  alter column role_id set not null;






create or replace function public.join_org_by_code(p_org_code text, p_role_code text default 'agent')
returns void
language plpgsql
security definer
as $$
declare
  v_org uuid;
  v_role uuid;
begin
  select id into v_org from public.organizations where org_code = p_org_code;
  if v_org is null then
    raise exception 'Código de organización inválido';
  end if;

  select id into v_role from public.roles where code = coalesce(p_role_code, 'agent');
  if v_role is null then
    raise exception 'Rol inválido';
  end if;

  if exists (select 1 from public.user_org_roles where user_id = auth.uid()) then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  update public.profiles set org_id = v_org where id = auth.uid();

  insert into public.user_org_roles(user_id, org_id, role_id)
  values (auth.uid(), v_org, v_role);
end;
$$;

revoke all on function public.join_org_by_code(text, text) from public;
grant execute on function public.join_org_by_code(text, text) to authenticated;







create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email::citext,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();





create or replace function public.properties_check_kyc_publish()
returns trigger language plpgsql as $$
declare
  v_ok boolean;
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at := now();
    end if;

    if new.lister_user_id is null then
      new.lister_user_id := old.lister_user_id;
    end if;

    select exists(
      select 1 from public.kyc_verifications kv
      where kv.user_id = new.lister_user_id
        and kv.status = 'verified'
    ) into v_ok;

    if not v_ok then
      raise exception 'KYC (INE) requerido para publicar';
    end if;
  end if;

  return new;
end$$;

drop trigger if exists trg_properties_check_kyc on public.properties;
create trigger trg_properties_check_kyc
before update of status on public.properties
for each row
when (new.status is distinct from old.status)
execute procedure public.properties_check_kyc_publish();







drop trigger if exists trg_properties_check_kyc on public.properties;

create or replace function public.properties_require_publisher_kyc()
returns trigger language plpgsql as $$
declare
  v_ok boolean;
begin
  if new.status = 'published' then
    select exists(
      select 1 from public.kyc_verifications
      where user_id = new.lister_user_id
        and status = 'verified'
    ) into v_ok;
    if not v_ok then
      raise exception 'El usuario que publica debe tener KYC verificado (INE)';
    end if;
  end if;
  return new;
end$$;

create trigger trg_properties_require_publisher_kyc
before update of status on public.properties
for each row
when (new.status is distinct from old.status)
execute procedure public.properties_require_publisher_kyc();




alter table public.properties
  alter column org_id drop not null;
-- 1.1 Asegurar NULL/DEFAULTs seguros
alter table public.profiles
  alter column full_name drop not null,
  alter column email drop not null,
  alter column phone drop not null,
  alter column role_hint drop not null;

-- (los timestamps ya tienen DEFAULT now())

-- 1.2 (Opcional) Si en algún entorno se quedó un NOT NULL “fantasma”:
-- Validar rápidamente (no falla si no existe):
-- select column_name, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='profiles';





create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- inserta perfil base
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email::citext,
    coalesce(new.raw_user_meta_data->>'full_name','')
  )
  on conflict (id) do nothing;

  -- si el conflicto es por email en otra fila, no rompas el alta:
  -- intenta un "do nothing" explícito vía email para que la inserción de auth.users no falle.
  -- (si el email ya existe con OTRO id, dejamos la corrección para un proceso de coherencia posterior)
  begin
    insert into public.profiles (id, email)
    values (new.id, new.email::citext)
    on conflict (email) do nothing;
  exception when unique_violation then
    -- de ser necesario, podrías LOGuear, pero jamás RAISE aquí.
    null;
  end;

  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();



alter table public.profiles enable row level security;

-- Ver solo mi perfil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_self_select'
  ) then
    create policy profiles_self_select on public.profiles
      for select using (id = auth.uid());
  end if;

  -- Actualizar solo mi perfil
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_self_update'
  ) then
    create policy profiles_self_update on public.profiles
      for update using (id = auth.uid()) with check (id = auth.uid());
  end if;
end$$;





drop function if exists public.join_org_by_code(text, text);

create or replace function public.join_org_by_code(p_org_code text, p_role_code text default 'agent')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_role uuid;
begin
  select id into v_org from public.organizations where org_code = p_org_code;
  if v_org is null then
    raise exception 'Código de organización inválido';
  end if;

  select id into v_role from public.roles where code = coalesce(p_role_code, 'agent');
  if v_role is null then
    raise exception 'Rol inválido';
  end if;

  if exists (select 1 from public.user_org_roles where user_id = auth.uid()) then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  update public.profiles set org_id = v_org where id = auth.uid();

  insert into public.user_org_roles(user_id, org_id, role_id)
  values (auth.uid(), v_org, v_role);

  return v_org;
end$$;

revoke all on function public.join_org_by_code(text, text) from public;
grant execute on function public.join_org_by_code(text, text) to authenticated;




select u.id as auth_id, u.email as auth_email, p.email as profile_email, p.full_name
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc
limit 5;





create or replace function public.email_available(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
      and u.deleted_at is null
  );
$$;

revoke all on function public.email_available(text) from public;
grant execute on function public.email_available(text) to anon, authenticated;







-- =========================================================
-- NOVALIA - Patch BD Propiedades (solo compraventa + sold)
-- Seguro e idempotente (PostgreSQL 13+ / Supabase)
-- =========================================================

-- 0) Enums nuevos / ampliaciones
do $$begin
  create type public.condition_enum as enum ('new','excellent','good','needs_renovation','unknown');
exception when duplicate_object then null; end$$;

do $$begin
  create type public.orientation_enum as enum ('north','northeast','east','southeast','south','southwest','west','northwest');
exception when duplicate_object then null; end$$;

-- Añadir 'sold' al status (el esquema actual trae 'draft','published','archived')
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'property_status_enum' and e.enumlabel = 'sold'
  ) then
    alter type public.property_status_enum add value 'sold';
  end if;
end$$;

-- 1) properties: columnas nuevas y defaults alineados a UX
alter table public.properties
  add column if not exists internal_id             text,
  add column if not exists display_address         boolean not null default false,
  add column if not exists levels                  int,
  add column if not exists year_built              int,
  add column if not exists floor                   int,
  add column if not exists hoa_fee                 numeric(12,2),
  add column if not exists condition               public.condition_enum,
  add column if not exists furnished               boolean,
  add column if not exists pet_friendly            boolean,
  add column if not exists orientation             public.orientation_enum,
  add column if not exists sold_at                 timestamptz;

-- Validación de año razonable
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_year_built_reasonable') then
    alter table public.properties
      add constraint properties_year_built_reasonable
      check (year_built is null or year_built between 1800 and extract(year from now())::int + 1);
  end if;
end$$;

-- ⚠️ Cambio mínimo: comparar por texto para evitar "unsafe use" del enum recién extendido
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_sold_requires_date') then
    alter table public.properties
      add constraint properties_sold_requires_date
      check (status::text <> 'sold' or sold_at is not null);
  end if;
end$$;

-- Único parcial (org_id, internal_id) cuando internal_id no es null
create unique index if not exists uq_properties_org_internal_id
  on public.properties(org_id, internal_id)
  where internal_id is not null;

-- Sólo compraventa: default de operación en 'sale'
alter table public.properties
  alter column operation_type set default 'sale';

-- 2) Publicación: asegurar published_at automáticamente
create or replace function public.properties_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end$$;

drop trigger if exists a_properties_set_published_at on public.properties;
create trigger a_properties_set_published_at
before insert or update of status on public.properties
for each row
when (new.status = 'published')
execute procedure public.properties_set_published_at();

-- 3) Completeness Score
create or replace function public.property_completeness(p_property uuid)
returns int language plpgsql as $$
declare
  v_title_ok boolean;
  v_desc_len int;
  v_price_ok boolean;
  v_loc_ok boolean;
  v_beds_ok boolean;
  v_baths_ok boolean;
  v_area_ok boolean;
  v_amen_cnt int;
  v_photos int;
  v_rpp_doc boolean;
  v_rpp_verified boolean;
  v_score int := 0;
begin
  select
    (p.title is not null and length(p.title) >= 6),
    coalesce(length(p.description),0),
    (p.price is not null and p.price > 0),
    (p.location is not null),
    (p.bedrooms is not null),
    (p.bathrooms is not null),
    (coalesce(p.construction_m2,0) > 0 or coalesce(p.land_m2,0) > 0),
    coalesce(cardinality(p.amenities),0),
    (select count(*) from public.media_assets m where m.property_id = p.id and m.media_type = 'image'),
    exists(select 1 from public.documents d where d.related_type='property' and d.related_id=p.id and d.doc_type='rpp_certificate'),
    (p.rpp_verified = 'verified')
  into v_title_ok, v_desc_len, v_price_ok, v_loc_ok, v_beds_ok, v_baths_ok, v_area_ok, v_amen_cnt, v_photos, v_rpp_doc, v_rpp_verified
  from public.properties p
  where p.id = p_property;

  if v_title_ok then v_score := v_score + 10; end if;
  if v_desc_len >= 300 then v_score := v_score + 10; elsif v_desc_len >= 120 then v_score := v_score + 6; elsif v_desc_len > 0 then v_score := v_score + 3; end if;
  if v_price_ok then v_score := v_score + 10; end if;
  if v_loc_ok then v_score := v_score + 10; end if;
  if v_beds_ok then v_score := v_score + 5; end if;
  if v_baths_ok then v_score := v_score + 5; end if;
  if v_area_ok then v_score := v_score + 5; end if;

  if v_photos >= 8 then v_score := v_score + 20;
  elsif v_photos >= 4 then v_score := v_score + 12;
  elsif v_photos >= 1 then v_score := v_score + 6;
  end if;

  if v_amen_cnt >= 6 then v_score := v_score + 5;
  elsif v_amen_cnt >= 1 then v_score := v_score + 2;
  end if;

  if v_rpp_doc then v_score := v_score + 8; end if;
  if v_rpp_verified then v_score := v_score + 10; end if;

  if v_score > 100 then v_score := 100; end if;
  return v_score;
end$$;

create or replace function public.update_property_completeness(p_property uuid)
returns void language plpgsql as $$
begin
  update public.properties
     set completeness_score = public.property_completeness(p_property),
         updated_at = now()
   where id = p_property;
end$$;

-- Helper PERMANENTE para triggers (antes estaba en pg_temp)
create or replace function public.tg__update_property_completeness()
returns trigger language plpgsql as $$
begin
  perform public.update_property_completeness(new.id);
  return null;
end$$;

-- Triggers en properties para recalcular en alta/updates
drop trigger if exists z_properties_recompute_completeness on public.properties;
create trigger z_properties_recompute_completeness
after insert or update on public.properties
for each row execute procedure public.tg__update_property_completeness();

-- Helpers PERMANENTES para media/documents (antes estaban en pg_temp)
create or replace function public.tg__recompute_from_media()
returns trigger language plpgsql as $$
declare v_prop uuid;
begin
  v_prop := coalesce(new.property_id, old.property_id);
  if v_prop is not null then
    perform public.update_property_completeness(v_prop);
  end if;
  return null;
end$$;

create or replace function public.tg__recompute_from_docs()
returns trigger language plpgsql as $$
declare v_prop uuid;
begin
  if coalesce(new.related_type, old.related_type) = 'property' then
    v_prop := coalesce(new.related_id, old.related_id);
    if v_prop is not null then
      perform public.update_property_completeness(v_prop);
    end if;
  end if;
  return null;
end$$;

-- Triggers en media/documents
drop trigger if exists properties_recompute_on_media on public.media_assets;
create trigger properties_recompute_on_media
after insert or update or delete on public.media_assets
for each row execute procedure public.tg__recompute_from_media();

drop trigger if exists properties_recompute_on_docs on public.documents;
create trigger properties_recompute_on_docs
after insert or update or delete on public.documents
for each row execute procedure public.tg__recompute_from_docs();

-- 4) Índices útiles para listado/orden
create index if not exists idx_properties_published_at on public.properties(published_at desc);
create index if not exists idx_properties_created_at  on public.properties(created_at desc);
