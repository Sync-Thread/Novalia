#!/bin/bash

# Script de verificación para la migración 2950
# Verifica que la estructura de la BD esté correcta después de la migración

echo "🔍 Verificando migración 2950: Fix Contracts Client Reference"
echo "=============================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Instrucciones:"
echo "1. Copia las queries SQL que se muestran abajo"
echo "2. Pégalas en el SQL Editor de Supabase"
echo "3. Verifica los resultados"
echo ""
echo "=============================================================="
echo ""

echo -e "${YELLOW}Query 1: Verificar que existen ambas columnas${NC}"
echo ""
cat << 'EOF'
-- Debe mostrar client_contact_id y client_profile_id
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'contracts' 
  AND column_name IN ('client_contact_id', 'client_profile_id')
ORDER BY column_name;
EOF
echo ""
echo "✅ Resultado esperado: 2 filas (client_contact_id y client_profile_id, ambas uuid, nullable)"
echo ""
echo "=============================================================="
echo ""

echo -e "${YELLOW}Query 2: Verificar Foreign Keys${NC}"
echo ""
cat << 'EOF'
-- Debe mostrar las FKs a lead_contacts y profiles
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  a.attname AS column_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE con.conrelid = 'public.contracts'::regclass
  AND con.contype = 'f'
  AND a.attname IN ('client_contact_id', 'client_profile_id')
ORDER BY a.attname;
EOF
echo ""
echo "✅ Resultado esperado:"
echo "   - contracts_client_contact_id_fkey → lead_contacts"
echo "   - contracts_client_profile_id_fkey → profiles"
echo ""
echo "=============================================================="
echo ""

echo -e "${YELLOW}Query 3: Verificar Check Constraint (mutuamente exclusivo)${NC}"
echo ""
cat << 'EOF'
-- Debe mostrar el constraint que previene que ambas columnas tengan valor
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.contracts'::regclass
  AND contype = 'c'
  AND conname = 'contracts_only_one_client_type';
EOF
echo ""
echo "✅ Resultado esperado: 1 fila con el CHECK constraint"
echo ""
echo "=============================================================="
echo ""

echo -e "${YELLOW}Query 4: Verificar función helper${NC}"
echo ""
cat << 'EOF'
-- Debe mostrar la función get_contract_client_info
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_contract_client_info';
EOF
echo ""
echo "✅ Resultado esperado: 1 fila mostrando la función"
echo ""
echo "=============================================================="
echo ""

echo -e "${YELLOW}Query 5: Probar INSERT (opcional - solo si quieres probar)${NC}"
echo ""
cat << 'EOF'
-- Test 1: Intentar insertar con ambas columnas → Debe FALLAR
-- (Descomenta para probar)
/*
INSERT INTO contracts (
  org_id, user_id, property_id,
  client_contact_id,
  client_profile_id,
  contract_type, status, title, issued_on
) VALUES (
  NULL, auth.uid(), NULL,
  gen_random_uuid(), -- ← Esto causará error
  gen_random_uuid(), -- ← Esto causará error
  'intermediacion', 'draft', 'Test - debe fallar', current_date
);
*/

-- Test 2: Insertar solo con client_profile_id → Debe FUNCIONAR
-- (Ajusta los UUIDs según tu BD)
/*
INSERT INTO contracts (
  org_id, user_id, property_id,
  client_contact_id,
  client_profile_id,
  contract_type, status, title, issued_on
) VALUES (
  NULL, auth.uid(), NULL,
  NULL,
  (SELECT id FROM profiles LIMIT 1), -- ← Usuario existente
  'intermediacion', 'draft', 'Test con profile', current_date
);
*/
EOF
echo ""
echo "=============================================================="
echo ""

echo -e "${GREEN}✨ Verificación lista!${NC}"
echo ""
echo "🚀 Próximos pasos:"
echo "1. Ejecuta las queries anteriores en Supabase SQL Editor"
echo "2. Si todo está OK, prueba crear un contrato desde la UI"
echo "3. Verifica en la tabla contracts que se guardó correctamente"
echo ""
echo "=============================================================="
