
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
