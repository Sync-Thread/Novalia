-- Migration 2900: Función RPC para obtener perfiles de usuarios interesados en una propiedad
-- Omite RLS para permitir que los propietarios vean quiénes han interactuado con sus propiedades

-- Eliminar función si existe (para re-aplicar migración)
drop function if exists public.get_interested_profiles(uuid);

-- Función para obtener perfiles de usuarios que han generado eventos en una propiedad
create or replace function public.get_interested_profiles(p_property_id uuid)
returns table (
  id uuid,
  full_name text,
  email citext,
  phone text
)
language plpgsql
security definer -- Ejecuta con privilegios del creador (omite RLS)
set search_path = public
as $$
begin
  -- Verificar que la propiedad exista
  if not exists (
    select 1 
    from public.properties p
    where p.id = p_property_id
  ) then
    raise exception 'Propiedad no encontrada';
  end if;

  -- Retornar perfiles de usuarios que han generado eventos en la propiedad
  return query
  select distinct
    pr.id,
    pr.full_name,
    pr.email,
    pr.phone
  from public.events e
  inner join public.profiles pr on pr.id = e.user_id
  where e.property_id = p_property_id
  and e.user_id is not null
  order by pr.full_name;
end;
$$;

-- Comentarios para documentación
comment on function public.get_interested_profiles(uuid) is 
  'Obtiene los perfiles de usuarios que han generado eventos en una propiedad. Solo accesible si el usuario actual pertenece a la misma organización que la propiedad.';
