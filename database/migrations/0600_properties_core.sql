
create or replace function properties_update_tsv() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.description,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.address_line,'')), 'C');
  return new;
end$$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  lister_user_id uuid references public.profiles(id) on delete set null,
  status property_status_enum not null default 'draft',
  property_type property_type_enum not null,
  operation_type operation_type_enum not null,
  title text not null,
  description text,
  price numeric(14,2) not null check (price > 0),
  currency currency_enum not null default 'MXN',
  bedrooms int check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4,1) check (bathrooms is null or bathrooms >= 0),
  parking_spots int check (parking_spots is null or parking_spots >= 0),
  construction_m2 numeric(12,2) check (construction_m2 is null or construction_m2 >= 0),
  land_m2 numeric(12,2) check (land_m2 is null or land_m2 >= 0),
  amenities text[] default '{}',
  address_line text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  location geography(point,4326),
  normalized_address jsonb,
  rpp_verified verification_status_enum not null default 'pending',
  completeness_score int default 0,
  trust_score int default 0,
  tags_cached text[] default '{}',
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint properties_published_requires_date check (status <> 'published' or published_at is not null)
);
create trigger properties_tsv_trigger before insert or update of title,description,address_line
on public.properties for each row execute procedure properties_update_tsv();
create trigger properties_updated_at before update on public.properties
for each row execute procedure public.set_updated_at();
