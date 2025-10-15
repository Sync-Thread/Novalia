
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

