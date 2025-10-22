
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
