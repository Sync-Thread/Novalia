#!/bin/bash

echo "🔍 Verificando estado de telemetría..."
echo ""
echo "Por favor, ejecuta las siguientes queries en Supabase SQL Editor:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. ¿Existe la función track_property_event?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SELECT proname FROM pg_proc WHERE proname = 'track_property_event';"
echo ""
echo "Debe devolver: 1 fila"
echo "Si NO devuelve nada → LA MIGRACIÓN NO SE APLICÓ"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Test manual"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat << 'EOF'
SELECT public.track_property_event(
    'test_fingerprint_123',
    (SELECT id FROM properties LIMIT 1),
    NULL,
    'page_view',
    '{"source": "test"}'::jsonb
);
EOF
echo ""
echo "Debe devolver: JSON con id, session_id, etc."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. ¿Hay eventos?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SELECT COUNT(*) as total FROM events;"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. ¿Hay métricas?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SELECT COUNT(*) as total FROM properties_metrics;"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Para aplicar la migración:"
echo "1. Ve a: https://app.supabase.com"
echo "2. SQL Editor"
echo "3. Copia: database/migrations/2510_track_property_event_function.sql"
echo "4. Pega y ejecuta (Run)"
echo ""
echo "📖 Guía completa: DEBUG_TELEMETRY.md"
