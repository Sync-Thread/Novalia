#!/bin/bash

# Script para aplicar la migration 2700: Org ID Opcional
# Uso: ./apply_2700_org_optional.sh

set -e  # Salir si hay algún error

MIGRATION_FILE="migrations/2700_make_org_id_optional.sql"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Migration 2700: Hacer org_id opcional                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que el archivo existe
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: No se encuentra el archivo $MIGRATION_FILE"
  exit 1
fi

echo "📄 Archivo encontrado: $MIGRATION_FILE"
echo ""

# Leer conexión de Supabase (si existe .env)
if [ -f "../.env" ]; then
  echo "📦 Cargando configuración desde .env..."
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Verificar variable de entorno
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  Variable DATABASE_URL no encontrada"
  echo ""
  echo "Por favor ingresa la URL de conexión a PostgreSQL:"
  echo "Formato: postgresql://user:password@host:5432/database"
  read -r DATABASE_URL
fi

echo ""
echo "🔍 Verificando conexión a la base de datos..."

# Verificar conexión
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Conexión exitosa"
else
  echo "❌ Error: No se pudo conectar a la base de datos"
  exit 1
fi

echo ""
echo "🚀 Ejecutando migration..."
echo ""

# Ejecutar migration
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ✅ Migration ejecutada exitosamente                         ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "📋 Cambios aplicados:"
  echo "  • properties.org_id → NULLABLE"
  echo "  • properties.lister_user_id → NUEVA"
  echo "  • contracts.org_id → NULLABLE"
  echo "  • contracts.user_id → NUEVA"
  echo "  • property_leads.org_id → NULLABLE"
  echo "  • attributions.org_id → NULLABLE"
  echo "  • RLS policies actualizadas"
  echo ""
  echo "🔍 Verificando cambios..."
  echo ""
  
  # Verificar que org_id es nullable
  psql "$DATABASE_URL" -c "
    SELECT 
      table_name, 
      column_name, 
      is_nullable 
    FROM information_schema.columns 
    WHERE table_name IN ('properties', 'contracts', 'property_leads', 'attributions') 
      AND column_name = 'org_id'
    ORDER BY table_name;
  "
  
  echo ""
  echo "✅ Todo listo! Ya puedes usar el sistema sin organización."
  echo ""
  echo "📝 Consulta el README para más información:"
  echo "   cat migrations/2700_make_org_id_optional.README.md"
  
else
  echo ""
  echo "❌ Error al ejecutar la migration"
  echo "Revisa los logs arriba para más detalles"
  exit 1
fi
