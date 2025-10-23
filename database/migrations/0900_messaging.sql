
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
