#!/bin/bash

# ============================================================================
# Script: Aplicar Migración de Telemetría
# Descripción: Aplica la migración 2510_track_property_event_function.sql
# Uso: ./apply_telemetry_migration.sh
# ============================================================================

set -e  # Exit on error

echo "🚀 Aplicando migración de telemetría..."
echo ""

# Verificar que el archivo de migración existe
MIGRATION_FILE="database/migrations/2510_track_property_event_function.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de migración: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Archivo de migración encontrado: $MIGRATION_FILE"
echo ""

# Verificar variables de entorno
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  Variable SUPABASE_DB_URL no encontrada."
    echo ""
    echo "Por favor, proporciona la URL de conexión a Supabase:"
    echo "Formato: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
    echo ""
    read -p "URL de conexión: " SUPABASE_DB_URL
    echo ""
fi

# Confirmar antes de aplicar
echo "📋 Se aplicará la migración a:"
echo "   $(echo $SUPABASE_DB_URL | sed 's/:.*@/@/' | sed 's/postgres@/postgres:***@/')"
echo ""
read -p "¿Continuar? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada."
    exit 0
fi

# Aplicar migración
echo ""
echo "⏳ Aplicando migración..."
echo ""

if command -v psql &> /dev/null; then
    # Usar psql si está disponible
    psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migración aplicada exitosamente!"
        echo ""
        
        # Verificar que la función fue creada
        echo "🔍 Verificando función RPC..."
        VERIFY_QUERY="SELECT proname, proargnames FROM pg_proc WHERE proname = 'track_property_event';"
        psql "$SUPABASE_DB_URL" -c "$VERIFY_QUERY"
        
        echo ""
        echo "✅ Todo listo!"
        echo ""
        echo "📚 Próximos pasos:"
        echo "   1. Inicia la aplicación: npm run dev"
        echo "   2. Abre la consola del navegador (F12)"
        echo "   3. Interactúa con propiedades (click, vista)"
        echo "   4. Verifica logs: '✅ Event tracked successfully'"
        echo ""
        echo "📖 Para más información, consulta: TELEMETRY_FIX.md"
    else
        echo ""
        echo "❌ Error al aplicar la migración."
        echo "   Verifica la URL de conexión y los logs arriba."
        exit 1
    fi
else
    echo ""
    echo "⚠️  psql no está instalado."
    echo ""
    echo "Opciones alternativas:"
    echo "1. Instalar psql: sudo apt-get install postgresql-client (Ubuntu/Debian)"
    echo "2. Usar Supabase Dashboard:"
    echo "   - Ve a: https://app.supabase.com"
    echo "   - SQL Editor"
    echo "   - Copia el contenido de: $MIGRATION_FILE"
    echo "   - Ejecuta el SQL"
    echo ""
    exit 1
fi
