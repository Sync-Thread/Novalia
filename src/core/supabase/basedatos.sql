-- NOVALIA – Esquema base para Supabase/Postgres
-- Autor: (tu equipo) | Fecha: 2025-10-01
-- ✔ PostGIS para geobúsqueda, pg_trgm para búsqueda, citext para emails, pgcrypto para UUID
-- ✔ Enums alineados a dominio
-- ✔ RLS: público puede leer listings publicados; org members gestionan sus recursos; anon inserta tracking
-- ✔ Triggers: updated_at
-- ✔ Índices: GIST geográfico, GIN JSONB/tsvector, compuestos en eventos y mensajes
-- ------------------------------------------------------------------------------------

-- =========================
-- Extensiones
-- =========================
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists citext;

-- =========================
-- Tipos de dominio / ENUMs
-- =========================
do $$
begin
  create type org_type_enum as enum ('agency','agent','seller_individual','notary','platform_admin');
exception when duplicate_object then null; end$$;

do $$
begin
  create type property_status_enum as enum ('draft','published','archived');
exception when duplicate_object then null; end$$;

do $$
begin
  create type property_type_enum as enum ('house','apartment','land','office','commercial','industrial','other');
exception when duplicate_object then null; end$$;

do $$
begin
  create type operation_type_enum as enum ('sale','rent');
exception when duplicate_object then null; end$$;

do $$
begin
  create type media_type_enum as enum ('image','video','document');
exception when duplicate_object then null; end$$;

do $$
begin
  create type verification_status_enum as enum ('pending','verified','rejected');
exception when duplicate_object then null; end$$;

do $$
begin
  create type doc_type_enum as enum ('deed','no_predial_debt','ine','rpp_certificate','plan','other');
exception when duplicate_object then null; end$$;

do $$
begin
  create type event_type_enum as enum (
    'page_view','property_click','share','open_outbound',
    'chat_open','first_contact','chat_message'
  );
exception when duplicate_object then null; end$$;

do $$
begin
  create type contract_type_enum as enum ('intermediacion','oferta','promesa');
exception when duplicate_object then null; end$$;

do $$
begin
  create type contract_status_enum as enum ('draft','sent','signed','cancelled','expired');
exception when duplicate_object then null; end$$;

do $$
begin
  create type invoice_status_enum as enum ('pending','issued','cancelled','paid','failed');
exception when duplicate_object then null; end$$;

do $$
begin
  create type sender_type_enum as enum ('user','contact','system');
exception when duplicate_object then null; end$$;

-- =========================
-- Helpers
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- ¿Usuario pertenece a org?
create or replace function public.is_in_org(p_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid() and pr.org_id = p_org
  );
$$;

-- =========================
-- IAM / Perfiles / Organizaciones
-- =========================
create table if not exists public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  org_type        org_type_enum not null default 'agency',
  rfc             text,
  verified        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create trigger organizations_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

-- Profiles enlazado a auth.users (Supabase)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete set null,
  full_name       text,
  email           citext unique,
  phone           text,
  role_hint       text, -- opcional (parallel a user_roles)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Roles globales y asignación por organización
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,  -- e.g., org_admin, agent, notary, backoffice
  description text
);

create table if not exists public.user_org_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id  uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  primary key (user_id, org_id, role_id)
);

-- =========================
-- Catálogos / Etiquetas / Zonas
-- =========================
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null
);

create table if not exists public.zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  geom        geometry(multipolygon, 4326), -- opcional
  created_at  timestamptz not null default now()
);

-- =========================
-- Propiedades (Listings)
-- =========================
create table if not exists public.properties (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  lister_user_id      uuid references public.profiles(id) on delete set null,
  status              property_status_enum not null default 'draft',
  property_type       property_type_enum not null,
  operation_type      operation_type_enum not null,
  title               text not null,
  description         text,
  price               numeric(14,2) not null,
  currency            text not null default 'MXN',
  bedrooms            int,
  bathrooms           numeric(4,1),
  parking_spots       int,
  construction_m2     numeric(12,2),
  land_m2             numeric(12,2),
  amenities           text[] default '{}',
  address_line        text,
  neighborhood        text,
  city                text,
  state               text,
  postal_code         text,
  location            geography(point, 4326),
  normalized_address  jsonb, -- salida de normalización RPP/Geo
  rpp_verified        verification_status_enum not null default 'pending',
  completeness_score  int default 0,
  trust_score         int default 0,
  tags_cached         text[] default '{}',
  search_vector       tsvector,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz,
  deleted_at          timestamptz
);

-- tsvector para búsqueda (title + description + address_line)
create or replace function properties_update_tsv() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.address_line,'')), 'C');
  return new;
end$$;

create trigger properties_tsv_trigger
before insert or update of title, description, address_line
on public.properties
for each row execute procedure properties_update_tsv();

create trigger properties_updated_at
before update on public.properties
for each row execute procedure public.set_updated_at();

-- Relación propiedades <-> tags (catálogo)
create table if not exists public.property_tags (
  property_id uuid not null references public.properties(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  primary key (property_id, tag_id)
);

-- Media de propiedad (S3 u origen externo)
create table if not exists public.media_assets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  property_id  uuid references public.properties(id) on delete cascade,
  media_type   media_type_enum not null,
  s3_key       text,
  url          text,
  position     int default 0,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- Documentos (general, reutilizable)
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.organizations(id) on delete cascade,
  related_type  text not null, -- 'property','contract','invoice','org','profile'
  related_id    uuid not null,
  doc_type      doc_type_enum not null default 'other',
  verification  verification_status_enum not null default 'pending',
  source        text, -- 'INE','RPP','User','SAT'
  hash_sha256   text,
  s3_key        text,
  url           text,
  metadata      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger documents_updated_at
before update on public.documents
for each row execute procedure public.set_updated_at();

-- Índices relevantes
create index if not exists idx_properties_geo on public.properties using gist (location);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_search on public.properties using gin (search_vector);
create index if not exists idx_properties_tags_cached on public.properties using gin (tags_cached);
create index if not exists idx_documents_related on public.documents(related_type, related_id);

-- =========================
-- Tracking & Atribución (180 días)
-- =========================
create table if not exists public.fingerprints (
  id            uuid primary key default gen_random_uuid(),
  fp_hash       text not null,            -- hash del fingerprint (device+nav)
  user_agent    text,
  created_at    timestamptz not null default now(),
  unique (fp_hash)
);

create table if not exists public.sessions (
  id             uuid primary key default gen_random_uuid(),
  fingerprint_id uuid not null references public.fingerprints(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete set null, -- si se identifica después
  utm            jsonb,
  started_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now()
);

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  org_id        uuid references public.organizations(id) on delete set null, -- derivable por propiedad o chat
  property_id   uuid references public.properties(id) on delete set null,
  event_type    event_type_enum not null,
  payload       jsonb,
  occurred_at   timestamptz not null default now()
);

create index if not exists idx_events_time on public.events(occurred_at desc);
create index if not exists idx_events_property_type on public.events(property_id, event_type);

-- Leads & contactos (compradores)
create table if not exists public.lead_contacts (
  id            uuid primary key default gen_random_uuid(),
  full_name     text,
  email         citext,
  phone         text,
  created_at    timestamptz not null default now(),
  unique(email, phone)
);

create table if not exists public.property_leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  property_id     uuid not null references public.properties(id) on delete cascade,
  contact_id      uuid not null references public.lead_contacts(id) on delete cascade,
  first_event_id  uuid references public.events(id) on delete set null, -- usually 'first_contact'
  status          text default 'open', -- simple pipeline; tu CRM puede extenderlo
  created_at      timestamptz not null default now()
);

-- Registros de atribución (ventana 180 días; método/evidencia)
create table if not exists public.attributions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  property_id      uuid not null references public.properties(id) on delete cascade,
  lead_id          uuid not null references public.property_leads(id) on delete cascade,
  method           text not null, -- 'fingerprint','chat','url_id','mixed'
  confidence       numeric(5,4) not null default 0.8000,
  window_days      int not null default 180,
  valid_until      timestamptz not null default (now() + interval '180 days'),
  locked           boolean not null default false,
  evidence         jsonb, -- URLs con ID de propiedad, cronología de chat, hashes de eventos
  created_at       timestamptz not null default now(),
  unique (property_id, lead_id) -- una atribución activa por lead/prop
);

-- =========================
-- Chat / Inbox unificado
-- =========================
create table if not exists public.chat_threads (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  property_id    uuid references public.properties(id) on delete set null,
  contact_id     uuid references public.lead_contacts(id) on delete set null,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.chat_participants (
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  contact_id  uuid references public.lead_contacts(id) on delete cascade,
  primary key (thread_id, user_id, contact_id)
);

create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.chat_threads(id) on delete cascade,
  sender_type   sender_type_enum not null,
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_contact_id uuid references public.lead_contacts(id) on delete set null,
  body          text,
  payload       jsonb, -- adjuntos, estados de entrega
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz,
  read_at       timestamptz
);

create index if not exists idx_chat_messages_thread_time on public.chat_messages(thread_id, created_at);

-- =========================
-- Contratos / FIEL / Expedientes
-- =========================
create table if not exists public.contract_templates (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  name         text not null,
  contract_type contract_type_enum not null,
  body_markdown text not null,
  version      int not null default 1,
  created_at   timestamptz not null default now()
);

create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  property_id   uuid references public.properties(id) on delete set null,
  template_id   uuid references public.contract_templates(id) on delete set null,
  contract_type contract_type_enum not null,
  status        contract_status_enum not null default 'draft',
  seller_org_id uuid references public.organizations(id) on delete set null, -- parte vendedora
  buyer_contact_id uuid references public.lead_contacts(id) on delete set null,
  file_url      text,   -- PDF renderizado
  metadata      jsonb,  -- variables mergeadas
  -- FIEL (muestra)
  fiel_signer_rfc  text,
  fiel_seal        text,
  fiel_signed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger contracts_updated_at
before update on public.contracts
for each row execute procedure public.set_updated_at();

-- Expediente/Checklist por operación (Notaría)
create table if not exists public.notary_cases (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  notary_org_id  uuid references public.organizations(id) on delete set null,
  contract_id    uuid references public.contracts(id) on delete cascade,
  property_id    uuid references public.properties(id) on delete set null,
  status         text not null default 'open',
  checklist      jsonb,  -- requisitos por operación (cumplimiento)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger notary_cases_updated_at
before update on public.notary_cases
for each row execute procedure public.set_updated_at();

-- =========================
-- Facturación / Cobro 2% / CFDI
-- =========================
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  contract_id   uuid references public.contracts(id) on delete set null,
  property_id   uuid references public.properties(id) on delete set null,
  cfdi_uuid     text,      -- timbrado (si aplica)
  serie         text,
  folio         text,
  emitter_rfc   text,
  receiver_rfc  text,
  subtotal      numeric(14,2) not null,
  iva           numeric(14,2) not null default 0,
  total         numeric(14,2) not null,
  currency      text not null default 'MXN',
  status        invoice_status_enum not null default 'pending',
  due_at        timestamptz, -- facturación a 15 días si no hay split notarial
  metadata      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger invoices_updated_at
before update on public.invoices
for each row execute procedure public.set_updated_at();

create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  qty          numeric(12,2) not null default 1,
  unit_price   numeric(14,2) not null,
  amount       numeric(14,2) not null
);

-- Reglas de comisión (2%) y penalización anti-elusión (150% de la comisión)
create table if not exists public.commission_rules (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.organizations(id) on delete cascade, -- null => default global
  rate           numeric(6,5) not null default 0.02000, -- 2%
  penalty_factor numeric(6,3) not null default 1.50,    -- 150% de la comisión
  effective_from date not null default now()::date,
  effective_to   date,
  unique (org_id, effective_from)
);

-- =========================
-- Integraciones & Webhooks & Proveedores
-- =========================
create table if not exists public.integration_providers (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,   -- 'sat','ine','rpp','whatsapp','sms','email','payments'
  name         text not null
);

create table if not exists public.integrations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations(id) on delete cascade,
  provider_id  uuid not null references public.integration_providers(id) on delete cascade,
  credentials  jsonb,    -- cifradas externamente / KMS
  settings     jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (org_id, provider_id)
);

create table if not exists public.webhooks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations(id) on delete cascade,
  provider_id  uuid references public.integration_providers(id) on delete set null,
  url          text not null,
  secret       text,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.webhook_logs (
  id           uuid primary key default gen_random_uuid(),
  webhook_id   uuid references public.webhooks(id) on delete set null,
  request      jsonb,
  response     jsonb,
  status_code  int,
  created_at   timestamptz not null default now()
);

-- =========================
-- Auditoría / Observabilidad
-- =========================
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  org_id        uuid references public.organizations(id) on delete set null,
  action        text not null,          -- e.g., 'contract.created','invoice.issued','attribution.locked'
  target_type   text,
  target_id     uuid,
  ip            inet,
  payload       jsonb
);

create index if not exists idx_audit_time on public.audit_logs(occurred_at desc);

-- =========================
-- RLS (Row Level Security) – Políticas mínimas seguras
-- =========================

-- Habilitar RLS en tablas sensibles
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
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

alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

alter table public.contracts enable row level security;
alter table public.contract_templates enable row level security;
alter table public.notary_cases enable row level security;

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.commission_rules enable row level security;

alter table public.integrations enable row level security;
alter table public.integration_providers enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_logs enable row level security;

alter table public.audit_logs enable row level security;
alter table public.tags enable row level security;
alter table public.property_tags enable row level security;
alter table public.zones enable row level security;

-- Profiles: cada usuario ve/edita su propio perfil
create policy "profiles_self_select" on public.profiles
for select using (id = auth.uid());
create policy "profiles_self_update" on public.profiles
for update using (id = auth.uid());

-- Organizations: miembros pueden ver su org; admin service role gestiona
create policy "org_member_read" on public.organizations
for select using (public.is_in_org(id));

-- Roles y asignaciones: visibles para miembros de la org
create policy "user_org_roles_select" on public.user_org_roles
for select using (org_id in (select org_id from public.profiles where id = auth.uid()));

-- PROPERTIES: público puede leer publicadas; miembros de org gestionan las suyas
create policy "properties_public_read_published" on public.properties
for select using (status = 'published');

create policy "properties_org_rw" on public.properties
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

-- Media/Docs: sólo miembros de la org
create policy "media_org_rw" on public.media_assets
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy "documents_org_rw" on public.documents
for all using (org_id is null or public.is_in_org(org_id))
with check (org_id is null or public.is_in_org(org_id));

-- Tracking: permitir INSERT desde rol anónimo (frontend) y lectura restringida
create policy "fingerprints_anon_insert" on public.fingerprints
for insert with check (true);
create policy "sessions_anon_insert" on public.sessions
for insert with check (true);
create policy "events_anon_insert" on public.events
for insert with check (true);

-- lectura de tracking: sólo staff de la org (derivado por org_id en events/property_leads)
create policy "events_org_read" on public.events
for select using (
  org_id is not null and public.is_in_org(org_id)
);

-- Leads/Atribución: sólo org dueña
create policy "leads_org_rw" on public.property_leads
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy "attributions_org_rw" on public.attributions
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

-- Chat: sólo participantes/miembros de org
create policy "threads_org_rw" on public.chat_threads
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy "participants_org_rw" on public.chat_participants
for all using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id))
) with check (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id))
);

create policy "messages_thread_scope" on public.chat_messages
for all using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id))
) with check (
  exists (select 1 from public.chat_threads t where t.id = thread_id and public.is_in_org(t.org_id))
);

-- Contratos/Notaría
create policy "contracts_org_rw" on public.contracts
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

create policy "notary_cases_org_rw" on public.notary_cases
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));

-- Facturación / Reglas de comisión
create policy "invoices_org_rw" on public.invoices
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy "invoice_items_cascade" on public.invoice_items
for all using (
  exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id))
) with check (
  exists (select 1 from public.invoices i where i.id = invoice_id and public.is_in_org(i.org_id))
);

create policy "commission_rules_rw" on public.commission_rules
for all using (org_id is null or public.is_in_org(org_id))
with check (org_id is null or public.is_in_org(org_id));

-- Integraciones
create policy "integration_providers_ro" on public.integration_providers
for select using (true);
create policy "integrations_org_rw" on public.integrations
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy "webhooks_org_rw" on public.webhooks
for all using (public.is_in_org(org_id)) with check (public.is_in_org(org_id));
create policy "webhook_logs_org_r" on public.webhook_logs
for select using (
  exists (select 1 from public.webhooks w where w.id = webhook_id and public.is_in_org(w.org_id))
);

-- Auditoría: lectura por miembros de la org
create policy "audit_org_read" on public.audit_logs
for select using (org_id is not null and public.is_in_org(org_id));

-- Catálogos/Zonas/Tags: lectura pública, escritura restringida (backoffice)
create policy "tags_public_read" on public.tags for select using (true);
create policy "zones_public_read" on public.zones for select using (true);
create policy "property_tags_public_read" on public.property_tags for select using (true);
-- (las políticas de escritura de catálogos se pueden manejar con service_role)

-- =========================
-- Índices adicionales útiles
-- =========================
create index if not exists idx_leads_property on public.property_leads(property_id, created_at desc);
create index if not exists idx_attributions_valid on public.attributions(valid_until, locked);
create index if not exists idx_contracts_status on public.contracts(status, created_at desc);
create index if not exists idx_invoices_status_due on public.invoices(status, due_at);