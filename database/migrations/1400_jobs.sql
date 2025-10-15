
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
