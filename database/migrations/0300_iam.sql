
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
create or replace function public.is_in_org(p_org uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.org_id = p_org);
$$;
