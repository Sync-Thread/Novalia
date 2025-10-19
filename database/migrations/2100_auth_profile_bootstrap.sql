-- database/migrations/2100_auth_profile_bootstrap.sql
-- Re-assert the auth -> profiles bootstrap trigger and backfill missing profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role_hint)
  values (
    new.id,
    new.email::citext,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(trim(concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')), '')
    ),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'account_type', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        role_hint = coalesce(excluded.role_hint, public.profiles.role_hint);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, phone, role_hint)
select
  u.id,
  u.email::citext,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), '')
  ),
  nullif(u.raw_user_meta_data->>'phone', ''),
  nullif(u.raw_user_meta_data->>'account_type', '')
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
