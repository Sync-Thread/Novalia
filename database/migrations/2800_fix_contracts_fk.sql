-- Migration: Fix foreign key relationship para Supabase PostgREST
-- Fecha: 2025-11-04
-- Problema: Supabase no encuentra la relación entre contracts y lead_contacts
-- Solución: Asegurar que la FK existe con el nombre correcto y refrescar schema

-- ============================================================================
-- 1. Verificar y recrear FK si es necesario
-- ============================================================================

-- Primero, listar todas las FKs existentes de client_contact_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Buscar FK existente que apunte a client_contact_id (excluyendo la que queremos crear)
  SELECT conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
  WHERE con.conrelid = 'public.contracts'::regclass
    AND con.contype = 'f'
    AND a.attname = 'client_contact_id'
    AND con.conname != 'contracts_client_contact_id_fkey'
  LIMIT 1;

  -- Si encontramos una FK con nombre diferente, eliminarla
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.contracts DROP CONSTRAINT %I', fk_name);
    RAISE NOTICE 'Foreign key % eliminada (nombre incorrecto)', fk_name;
  END IF;
END$$;

-- Crear FK con el nombre estándar que Supabase espera
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contracts_client_contact_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_client_contact_id_fkey
      FOREIGN KEY (client_contact_id) 
      REFERENCES public.lead_contacts(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key contracts_client_contact_id_fkey creada';
  ELSE
    RAISE NOTICE 'Foreign key contracts_client_contact_id_fkey ya existe';
  END IF;
END$$;

-- ============================================================================
-- 2. Verificar otras FKs importantes
-- ============================================================================

-- Verificar FK a properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contracts_property_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_property_id_fkey
      FOREIGN KEY (property_id) 
      REFERENCES public.properties(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key contracts_property_id_fkey creada';
  END IF;
END$$;

-- ============================================================================
-- 3. Forzar reload del schema cache en Supabase
-- ============================================================================

-- Supabase PostgREST cachea el schema. Para forzar reload:
-- Opción 1: Hacer un pequeño cambio en la tabla
COMMENT ON TABLE public.contracts IS 'Contratos y documentos legales (schema refreshed 2025-11-04)';

-- Opción 2: Notificar a PostgREST (si el rol tiene permisos)
DO $$
BEGIN
  NOTIFY pgrst, 'reload schema';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo enviar NOTIFY (esto es normal si no tienes permisos)';
END$$;

-- ============================================================================
-- 4. Verificación: Mostrar FKs de contracts
-- ============================================================================

DO $$
DECLARE
  fk_record RECORD;
BEGIN
  RAISE NOTICE '=== Foreign Keys en contracts ===';
  FOR fk_record IN
    SELECT
      conname AS constraint_name,
      a.attname AS column_name,
      c2.relname AS referenced_table
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
    JOIN pg_class c2 ON con.confrelid = c2.oid
    WHERE c.relname = 'contracts'
      AND con.contype = 'f'
    ORDER BY conname
  LOOP
    RAISE NOTICE '  % -> %.% references %',
      fk_record.constraint_name,
      'contracts',
      fk_record.column_name,
      fk_record.referenced_table;
  END LOOP;
END$$;

-- ============================================================================
-- 5. Instrucciones post-migration
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Migration 2800 completada';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Si sigues viendo el error en Supabase:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a Supabase Dashboard';
  RAISE NOTICE '2. Settings > API';
  RAISE NOTICE '3. Click en "Reload schema cache"';
  RAISE NOTICE '';
  RAISE NOTICE 'O bien, reinicia el proyecto:';
  RAISE NOTICE '  - Project Settings > General';
  RAISE NOTICE '  - Click "Pause project"';
  RAISE NOTICE '  - Espera 30 segundos';
  RAISE NOTICE '  - Click "Resume project"';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
END$$;

-- ============================================================================
-- Fin de migration
-- ============================================================================
