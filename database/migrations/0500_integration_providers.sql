
create table if not exists public.integration_providers (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,   -- 'sat','ine','rpp','whatsapp','sms','email','payments'
  name text not null
);
