# Migration 2700: Org ID Opcional

## 📋 Descripción

Esta migración permite que usuarios **sin organización** puedan usar el sistema de propiedades y contratos.

## 🔄 Cambios principales

### 1. **Base de Datos**
- ✅ `properties.org_id` ahora es **NULLABLE**
- ✅ Nueva columna `properties.lister_user_id` (usuario dueño)
- ✅ `contracts.org_id` ahora es **NULLABLE**
- ✅ Nueva columna `contracts.user_id` (usuario creador)
- ✅ Índices agregados para búsquedas por usuario

### 2. **Políticas RLS (Row Level Security)**
- ✅ `properties`: Acceso por `org_id` O por `lister_user_id`
- ✅ `contracts`: Acceso por `org_id` O por `user_id`
- ✅ `media_assets`: Acceso cascada desde properties

### 3. **Lógica de Aplicación**
- ✅ `ListPropertiesForSelector`: Ya no requiere org obligatorio
- ✅ `SupabasePropertyRepo`: Filtra por org O por usuario
- ✅ `NewDocumentQuickView`: Guarda `user_id` al crear contrato

## 🚀 Cómo ejecutar

### Opción 1: Script automático (RECOMENDADO)
```bash
cd database
./apply_all.sh
```

### Opción 2: Ejecutar solo esta migración
```bash
psql -h <host> -U <user> -d <database> -f database/migrations/2700_make_org_id_optional.sql
```

### Opción 3: Desde Supabase Dashboard
1. Ir a **SQL Editor**
2. Copiar y pegar el contenido de `2700_make_org_id_optional.sql`
3. Ejecutar

## ⚠️ Consideraciones

### **Datos existentes**
- Las propiedades/contratos existentes **mantienen** su `org_id`
- No se asigna automáticamente `lister_user_id` a propiedades antiguas
- Si necesitas migrar datos antiguos, descomenta la sección 6 del SQL

### **Nuevos registros**
- **Con org**: Se guarda `org_id` + `user_id`/`lister_user_id`
- **Sin org**: Solo `user_id`/`lister_user_id` (org_id = null)

## 🔍 Verificación

Después de ejecutar la migración:

```sql
-- 1. Verificar que org_id es nullable
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('properties', 'contracts') 
  AND column_name = 'org_id';

-- 2. Verificar nuevas columnas
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
  AND column_name = 'lister_user_id';

-- 3. Verificar políticas RLS
SELECT 
  schemaname, 
  tablename, 
  policyname 
FROM pg_policies 
WHERE tablename IN ('properties', 'contracts', 'media_assets');
```

## 🐛 Rollback (si es necesario)

⚠️ **Solo ejecutar si necesitas revertir los cambios:**

```sql
-- Revertir a org_id obligatorio
ALTER TABLE public.properties ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN org_id SET NOT NULL;

-- Eliminar nuevas columnas (PERDERÁS DATOS)
ALTER TABLE public.properties DROP COLUMN lister_user_id;
ALTER TABLE public.contracts DROP COLUMN user_id;

-- Restaurar políticas antiguas
DROP POLICY properties_org_or_owner_rw ON public.properties;
DROP POLICY contracts_org_or_owner_rw ON public.contracts;

CREATE POLICY properties_org_rw ON public.properties
  FOR ALL USING (public.is_in_org(org_id)) 
  WITH CHECK (public.is_in_org(org_id));

CREATE POLICY contracts_org_rw ON public.contracts
  FOR ALL USING (public.is_in_org(org_id)) 
  WITH CHECK (public.is_in_org(org_id));
```

## 📝 Notas

- Esta migración es **compatible hacia atrás**: usuarios con org siguen funcionando igual
- Las RLS policies son **acumulativas**: validan org O usuario
- El frontend ya está actualizado para soportar usuarios sin org
