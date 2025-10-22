
create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  status verification_status_enum not null default 'pending',
  evidence jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger kyc_verif_updated_at before update on public.kyc_verifications
for each row execute procedure public.set_updated_at();
