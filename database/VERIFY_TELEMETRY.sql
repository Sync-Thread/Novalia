-- ============================================================================
-- VERIFICACIÓN: ¿Existe la función track_property_event?
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================================

-- 1. Verificar que la función existe
SELECT 
    proname as function_name,
    proargnames as parameter_names,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'track_property_event';

-- Si NO devuelve ninguna fila, la función NO EXISTE
-- Debes aplicar la migración: /database/migrations/2510_track_property_event_function.sql

-- 2. Verificar permisos
SELECT 
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'track_property_event';

-- Debe mostrar permisos para 'anon' y 'authenticated'

-- 3. Test manual de la función
SELECT public.track_property_event(
    p_fingerprint_hash := 'test_' || gen_random_uuid()::text,
    p_property_id := (SELECT id FROM public.properties LIMIT 1),
    p_user_id := NULL,
    p_event_type := 'page_view',
    p_metadata := '{"source": "test", "test": true}'::jsonb
);

-- Debe retornar JSON con: {"id": "...", "session_id": "...", ...}

-- 4. Verificar que el evento se creó
SELECT * FROM public.events 
ORDER BY occurred_at DESC 
LIMIT 5;

-- Debe mostrar eventos con session_id, property_id, etc.

-- 5. Verificar trigger de métricas
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as trigger_function
FROM pg_trigger 
WHERE tgname = 'events_after_insert_sync_metrics';

-- Debe existir el trigger

-- 6. Verificar tabla properties_metrics
SELECT * FROM public.properties_metrics 
WHERE views_count > 0 OR clicks_count > 0
ORDER BY updated_at DESC 
LIMIT 5;

-- Debe mostrar métricas calculadas

-- ============================================================================
-- SI ALGUNO DE ESTOS QUERIES FALLA:
-- 1. La función no existe → Aplica migración 2510
-- 2. El trigger no existe → Aplica migración 2500
-- 3. Las tablas no existen → Aplica ambas migraciones
-- ============================================================================
