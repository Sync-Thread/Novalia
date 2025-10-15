
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
