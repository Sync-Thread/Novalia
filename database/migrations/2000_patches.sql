
alter table public.organizations
  add column if not exists org_code text;
update public.organizations
set org_code = encode(gen_random_bytes(4), 'hex')
where org_code is null;
alter table public.organizations
  alter column org_code set not null;
create unique index if not exists uq_organizations_org_code
  on public.organizations (org_code);
alter table public.user_org_roles drop constraint if exists user_org_roles_pkey;
alter table public.user_org_roles
  add constraint user_org_roles_pk primary key (user_id, org_id);
create unique index if not exists uq_user_single_org on public.user_org_roles(user_id);
alter table public.user_org_roles
  alter column role_id set not null;
create or replace function public.join_org_by_code(p_org_code text, p_role_code text default 'agent')
returns void
language plpgsql
security definer
as $$
declare
  v_org uuid;
  v_role uuid;
begin
  select id into v_org from public.organizations where org_code = p_org_code;
  if v_org is null then
    raise exception 'Código de organización inválido';
  end if;

  select id into v_role from public.roles where code = coalesce(p_role_code, 'agent');
  if v_role is null then
    raise exception 'Rol inválido';
  end if;

  if exists (select 1 from public.user_org_roles where user_id = auth.uid()) then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  update public.profiles set org_id = v_org where id = auth.uid();

  insert into public.user_org_roles(user_id, org_id, role_id)
  values (auth.uid(), v_org, v_role);
end;
$$;
revoke all on function public.join_org_by_code(text, text) from public;
grant execute on function public.join_org_by_code(text, text) to authenticated;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email::citext,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
create or replace function public.properties_check_kyc_publish()
returns trigger language plpgsql as $$
declare
  v_ok boolean;
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at := now();
    end if;

    if new.lister_user_id is null then
      new.lister_user_id := old.lister_user_id;
    end if;

    select exists(
      select 1 from public.kyc_verifications kv
      where kv.user_id = new.lister_user_id
        and kv.status = 'verified'
    ) into v_ok;

    if not v_ok then
      raise exception 'KYC (INE) requerido para publicar';
    end if;
  end if;

  return new;
end$$;
drop trigger if exists trg_properties_check_kyc on public.properties;
create trigger trg_properties_check_kyc
before update of status on public.properties
for each row
when (new.status is distinct from old.status)
execute procedure public.properties_check_kyc_publish();
drop trigger if exists trg_properties_check_kyc on public.properties;
create or replace function public.properties_require_publisher_kyc()
returns trigger language plpgsql as $$
declare
  v_ok boolean;
begin
  if new.status = 'published' then
    select exists(
      select 1 from public.kyc_verifications
      where user_id = new.lister_user_id
        and status = 'verified'
    ) into v_ok;
    if not v_ok then
      raise exception 'El usuario que publica debe tener KYC verificado (INE)';
    end if;
  end if;
  return new;
end$$;
create trigger trg_properties_require_publisher_kyc
before update of status on public.properties
for each row
when (new.status is distinct from old.status)
execute procedure public.properties_require_publisher_kyc();
alter table public.properties
  alter column org_id drop not null;
alter table public.profiles
  alter column full_name drop not null,
  alter column email drop not null,
  alter column phone drop not null,
  alter column role_hint drop not null;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- inserta perfil base
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email::citext,
    coalesce(new.raw_user_meta_data->>'full_name','')
  )
  on conflict (id) do nothing;

  -- si el conflicto es por email en otra fila, no rompas el alta:
  -- intenta un "do nothing" explícito vía email para que la inserción de auth.users no falle.
  -- (si el email ya existe con OTRO id, dejamos la corrección para un proceso de coherencia posterior)
  begin
    insert into public.profiles (id, email)
    values (new.id, new.email::citext)
    on conflict (email) do nothing;
  exception when unique_violation then
    -- de ser necesario, podrías LOGuear, pero jamás RAISE aquí.
    null;
  end;

  return new;
end$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_self_select'
  ) then
    create policy profiles_self_select on public.profiles
      for select using (id = auth.uid());
  end if;

  -- Actualizar solo mi perfil
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_self_update'
  ) then
    create policy profiles_self_update on public.profiles
      for update using (id = auth.uid()) with check (id = auth.uid());
  end if;
end$$;
drop function if exists public.join_org_by_code(text, text);
create or replace function public.join_org_by_code(p_org_code text, p_role_code text default 'agent')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_role uuid;
begin
  select id into v_org from public.organizations where org_code = p_org_code;
  if v_org is null then
    raise exception 'Código de organización inválido';
  end if;

  select id into v_role from public.roles where code = coalesce(p_role_code, 'agent');
  if v_role is null then
    raise exception 'Rol inválido';
  end if;

  if exists (select 1 from public.user_org_roles where user_id = auth.uid()) then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  update public.profiles set org_id = v_org where id = auth.uid();

  insert into public.user_org_roles(user_id, org_id, role_id)
  values (auth.uid(), v_org, v_role);

  return v_org;
end$$;
revoke all on function public.join_org_by_code(text, text) from public;
grant execute on function public.join_org_by_code(text, text) to authenticated;
select u.id as auth_id, u.email as auth_email, p.email as profile_email, p.full_name
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc
limit 5;
create or replace function public.email_available(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
      and u.deleted_at is null
  );
$$;

revoke all on function public.email_available(text) from public;
grant execute on function public.email_available(text) to anon, authenticated;
do $$begin
  create type public.condition_enum as enum ('new','excellent','good','needs_renovation','unknown');
exception when duplicate_object then null; end$$;
do $$begin
  create type public.orientation_enum as enum ('north','northeast','east','southeast','south','southwest','west','northwest');
exception when duplicate_object then null; end$$;
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'property_status_enum' and e.enumlabel = 'sold'
  ) then
    alter type public.property_status_enum add value 'sold';
  end if;
end$$;
alter table public.properties
  add column if not exists internal_id             text,
  add column if not exists display_address         boolean not null default false,
  add column if not exists levels                  int,
  add column if not exists year_built              int,
  add column if not exists floor                   int,
  add column if not exists hoa_fee                 numeric(12,2),
  add column if not exists condition               public.condition_enum,
  add column if not exists furnished               boolean,
  add column if not exists pet_friendly            boolean,
  add column if not exists orientation             public.orientation_enum,
  add column if not exists sold_at                 timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_year_built_reasonable') then
    alter table public.properties
      add constraint properties_year_built_reasonable
      check (year_built is null or year_built between 1800 and extract(year from now())::int + 1);
  end if;
end$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_sold_requires_date') then
    alter table public.properties
      add constraint properties_sold_requires_date
      check (status::text <> 'sold' or sold_at is not null);
  end if;
end$$;
create unique index if not exists uq_properties_org_internal_id
  on public.properties(org_id, internal_id)
  where internal_id is not null;
alter table public.properties
  alter column operation_type set default 'sale';
create or replace function public.properties_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end$$;
drop trigger if exists a_properties_set_published_at on public.properties;
create trigger a_properties_set_published_at
before insert or update of status on public.properties
for each row
when (new.status = 'published')
execute procedure public.properties_set_published_at();
create or replace function public.property_completeness(p_property uuid)
returns int language plpgsql as $$
declare
  v_title_ok boolean;
  v_desc_len int;
  v_price_ok boolean;
  v_loc_ok boolean;
  v_beds_ok boolean;
  v_baths_ok boolean;
  v_area_ok boolean;
  v_amen_cnt int;
  v_photos int;
  v_rpp_doc boolean;
  v_rpp_verified boolean;
  v_score int := 0;
begin
  select
    (p.title is not null and length(p.title) >= 6),
    coalesce(length(p.description),0),
    (p.price is not null and p.price > 0),
    (p.location is not null),
    (p.bedrooms is not null),
    (p.bathrooms is not null),
    (coalesce(p.construction_m2,0) > 0 or coalesce(p.land_m2,0) > 0),
    coalesce(cardinality(p.amenities),0),
    (select count(*) from public.media_assets m where m.property_id = p.id and m.media_type = 'image'),
    exists(select 1 from public.documents d where d.related_type='property' and d.related_id=p.id and d.doc_type='rpp_certificate'),
    (p.rpp_verified = 'verified')
  into v_title_ok, v_desc_len, v_price_ok, v_loc_ok, v_beds_ok, v_baths_ok, v_area_ok, v_amen_cnt, v_photos, v_rpp_doc, v_rpp_verified
  from public.properties p
  where p.id = p_property;

  if v_title_ok then v_score := v_score + 10; end if;
  if v_desc_len >= 300 then v_score := v_score + 10; elsif v_desc_len >= 120 then v_score := v_score + 6; elsif v_desc_len > 0 then v_score := v_score + 3; end if;
  if v_price_ok then v_score := v_score + 10; end if;
  if v_loc_ok then v_score := v_score + 10; end if;
  if v_beds_ok then v_score := v_score + 5; end if;
  if v_baths_ok then v_score := v_score + 5; end if;
  if v_area_ok then v_score := v_score + 5; end if;

  if v_photos >= 8 then v_score := v_score + 20;
  elsif v_photos >= 4 then v_score := v_score + 12;
  elsif v_photos >= 1 then v_score := v_score + 6;
  end if;

  if v_amen_cnt >= 6 then v_score := v_score + 5;
  elsif v_amen_cnt >= 1 then v_score := v_score + 2;
  end if;

  if v_rpp_doc then v_score := v_score + 8; end if;
  if v_rpp_verified then v_score := v_score + 10; end if;

  if v_score > 100 then v_score := 100; end if;
  return v_score;
end$$;
create or replace function public.update_property_completeness(p_property uuid)
returns void language plpgsql as $$
begin
  update public.properties
     set completeness_score = public.property_completeness(p_property),
         updated_at = now()
   where id = p_property;
end$$;
create or replace function public.tg__update_property_completeness()
returns trigger language plpgsql as $$
begin
  perform public.update_property_completeness(new.id);
  return null;
end$$;
drop trigger if exists z_properties_recompute_completeness on public.properties;
create trigger z_properties_recompute_completeness
after insert or update on public.properties
for each row execute procedure public.tg__update_property_completeness();
create or replace function public.tg__recompute_from_media()
returns trigger language plpgsql as $$
declare v_prop uuid;
begin
  v_prop := coalesce(new.property_id, old.property_id);
  if v_prop is not null then
    perform public.update_property_completeness(v_prop);
  end if;
  return null;
end$$;

create or replace function public.tg__recompute_from_docs()
returns trigger language plpgsql as $$
declare v_prop uuid;
begin
  if coalesce(new.related_type, old.related_type) = 'property' then
    v_prop := coalesce(new.related_id, old.related_id);
    if v_prop is not null then
      perform public.update_property_completeness(v_prop);
    end if;
  end if;
  return null;
end$$;
drop trigger if exists properties_recompute_on_media on public.media_assets;
create trigger properties_recompute_on_media
after insert or update or delete on public.media_assets
for each row execute procedure public.tg__recompute_from_media();

drop trigger if exists properties_recompute_on_docs on public.documents;
create trigger properties_recompute_on_docs
after insert or update or delete on public.documents
for each row execute procedure public.tg__recompute_from_docs();
create index if not exists idx_properties_published_at on public.properties(published_at desc);
create index if not exists idx_properties_created_at  on public.properties(created_at desc);
