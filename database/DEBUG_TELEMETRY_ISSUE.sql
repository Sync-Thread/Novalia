-- ============================================================================
-- DEBUG: Verificar por qué no se incrementan los views_count
-- ============================================================================

-- 1. Verificar que existe la función RPC track_property_event
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'track_property_event';

-- 2. Verificar que existe el trigger sync_property_metrics_from_event
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'events_after_insert_sync_metrics';

-- 3. Ver los eventos registrados en la tabla events
SELECT 
    id,
    event_type,
    property_id,
    user_id,
    occurred_at,
    created_at
FROM public.events
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver las métricas en properties_metrics
SELECT 
    property_id,
    views_count,
    clicks_count,
    contacts_count,
    shares_count,
    chat_messages_count,
    last_event_at,
    updated_at
FROM public.properties_metrics
ORDER BY updated_at DESC;

-- 5. Contar eventos por tipo para cada propiedad
SELECT 
    property_id,
    event_type,
    COUNT(*) as count
FROM public.events
WHERE property_id IS NOT NULL
GROUP BY property_id, event_type
ORDER BY property_id, event_type;

-- 6. Comparar: eventos page_view vs views_count en metrics
SELECT 
    e.property_id,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') as page_view_events,
    COALESCE(pm.views_count, 0) as views_count_in_metrics,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') - COALESCE(pm.views_count, 0) as difference
FROM public.events e
LEFT JOIN public.properties_metrics pm ON e.property_id = pm.property_id
WHERE e.property_id IS NOT NULL
GROUP BY e.property_id, pm.views_count;

-- 7. Verificar si hay eventos del propietario viendo su propia propiedad
-- (Estos eventos NO se cuentan en las métricas según el trigger)
SELECT 
    e.id,
    e.event_type,
    e.property_id,
    e.user_id,
    p.owner_id,
    CASE 
        WHEN e.user_id = p.owner_id THEN 'Owner viewing own property (NOT COUNTED)'
        ELSE 'External view (SHOULD BE COUNTED)'
    END as status
FROM public.events e
JOIN public.properties p ON e.property_id = p.id
WHERE e.event_type = 'page_view'
ORDER BY e.created_at DESC
LIMIT 20;

-- 8. Ver el estado de la función del trigger
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'sync_property_metrics_from_event';
