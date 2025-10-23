
create table if not exists public.property_tags (
  property_id uuid not null references public.properties(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (property_id, tag_id)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  media_type media_type_enum not null,
  s3_key text,
  url text,
  position int default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  related_type text not null,
  related_id uuid not null,
  doc_type doc_type_enum not null default 'other',
  verification verification_status_enum not null default 'pending',
  source text,
  hash_sha256 text,
  s3_key text,
  url text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger documents_updated_at before update on public.documents
for each row execute procedure public.set_updated_at();
