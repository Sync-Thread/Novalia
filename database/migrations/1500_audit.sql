
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
