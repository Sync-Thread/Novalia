-- ============================================================================
-- Migration 2960: Función para obtener nombres de clientes (bypass RLS)
-- Problema: RLS bloquea la consulta a profiles al cargar contratos
-- Solución: Función SECURITY DEFINER que permite obtener nombres de clientes
-- Date: 2025-11-05
-- ============================================================================

BEGIN;

-- =============================================================================
-- Función: get_client_names
-- Obtiene nombres de clientes desde lead_contacts o profiles
-- Bypass RLS para que el listado de contratos pueda ver los nombres
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_client_names(
  p_contact_ids uuid[] DEFAULT '{}',
  p_profile_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  full_name text,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador (omite RLS)
SET search_path = public
AS $$
BEGIN
  -- Retornar nombres de lead_contacts
  IF array_length(p_contact_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      lc.id,
      lc.full_name,
      'lead_contact'::text as source
    FROM lead_contacts lc
    WHERE lc.id = ANY(p_contact_ids)
    AND lc.full_name IS NOT NULL;
  END IF;

  -- Retornar nombres de profiles
  IF array_length(p_profile_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      pr.id,
      pr.full_name,
      'profile'::text as source
    FROM profiles pr
    WHERE pr.id = ANY(p_profile_ids)
    AND pr.full_name IS NOT NULL;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_client_names IS 
  'Obtiene nombres de clientes desde lead_contacts o profiles, bypassing RLS. 
   Usado por el listado de contratos para mostrar nombres de clientes.';

GRANT EXECUTE ON FUNCTION public.get_client_names TO authenticated, anon;

COMMIT;

-- =============================================================================
-- USAGE EXAMPLE
-- =============================================================================
/*
-- Obtener nombres de profiles y contacts
SELECT * FROM get_client_names(
  p_contact_ids := ARRAY['uuid1', 'uuid2']::uuid[],
  p_profile_ids := ARRAY['uuid3', 'uuid4']::uuid[]
);

-- Solo profiles
SELECT * FROM get_client_names(
  p_contact_ids := '{}',
  p_profile_ids := ARRAY['uuid1', 'uuid2']::uuid[]
);
*/

-- =============================================================================
-- ROLLBACK
-- =============================================================================
/*
DROP FUNCTION IF EXISTS public.get_client_names(uuid[], uuid[]);
*/
