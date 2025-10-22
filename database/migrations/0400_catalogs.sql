
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
