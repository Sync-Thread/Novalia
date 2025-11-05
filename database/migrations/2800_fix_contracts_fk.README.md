# Migration 2800: Fix Foreign Key Relationships

## 🐛 Problema

Error en Supabase al cargar contratos:
```
Could not find a relationship between 'contracts' and 'lead_contacts' in the schema cache
```

## 🔍 Causa

Supabase PostgREST cachea el schema de la base de datos. Cuando se hacen cambios en las foreign keys (especialmente en migrations previas que eliminaron y recrearon columnas), el cache puede quedar desactualizado.

## ✅ Solución

### **Paso 1: Ejecutar Migration**

```bash
# Desde Supabase Dashboard > SQL Editor
# Copia y pega el contenido de 2800_fix_contracts_fk.sql
```

O desde terminal:
```bash
psql -h <host> -U <user> -d <database> -f database/migrations/2800_fix_contracts_fk.sql
```

### **Paso 2: Refrescar Schema Cache en Supabase**

#### **Opción A: Reload Schema (RECOMENDADO)**
1. Ve a **Supabase Dashboard**
2. Ve a **Settings** → **API**
3. En la sección "Connection string", busca el botón **"Reload schema cache"**
4. Click y espera 10-15 segundos

#### **Opción B: Pause/Resume Project** (si Opción A no funciona)
1. Ve a **Project Settings** → **General**
2. Scroll hasta "Danger Zone"
3. Click **"Pause project"**
4. Espera 30 segundos
5. Click **"Resume project"**
6. Espera que el proyecto esté activo (~1-2 minutos)

#### **Opción C: Desde psql** (si tienes acceso directo)
```sql
NOTIFY pgrst, 'reload schema';
```

---

## 🔧 Qué hace esta migration

1. ✅ **Verifica y recrea foreign keys** con nombres estándares:
   - `contracts_client_contact_id_fkey` → `lead_contacts(id)`
   - `contracts_property_id_fkey` → `properties(id)`

2. ✅ **Fuerza reload del schema** mediante:
   - `COMMENT ON TABLE` (cambio mínimo que trigger refresh)
   - `NOTIFY pgrst` (si el rol tiene permisos)

3. ✅ **Muestra FKs actuales** en los logs para verificación

---

## 📝 Cambios en el código

También se actualizó `SupabaseContractRepo.ts` para usar la sintaxis correcta de Supabase:

**Antes:**
```typescript
lead_contacts!contracts_client_contact_id_fkey (full_name)
```

**Después:**
```typescript
lead_contacts:contracts_client_contact_id_fkey (full_name)
```

**Nota:** Supabase puede usar `!` o `:` para JOINs:
- `!` = inner join (falla si no hay FK)
- `:` = left join (más tolerante)

---

## ✅ Verificación

Después de ejecutar la migration y refrescar el cache:

1. **Verificar FKs en la BD:**
```sql
SELECT
  conname AS constraint_name,
  a.attname AS column_name,
  c2.relname AS referenced_table
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
JOIN pg_class c2 ON con.confrelid = c2.oid
WHERE c.relname = 'contracts' AND con.contype = 'f'
ORDER BY conname;
```

**Resultado esperado:**
```
contracts_client_contact_id_fkey | client_contact_id | lead_contacts
contracts_org_id_fkey            | org_id            | organizations
contracts_property_id_fkey       | property_id       | properties
```

2. **Probar en el frontend:**
   - Ir a `/contracts`
   - Debería cargar la lista sin errores
   - Crear un nuevo contrato
   - Verificar que aparece en la lista

---

## 🐛 Troubleshooting

### **Error persiste después de migration**
→ Ejecuta **Opción B** (Pause/Resume project)

### **Error "permission denied for schema pg_catalog"**
→ Normal, no afecta. El NOTIFY no se ejecutó pero el resto sí.

### **No aparecen contratos en la lista**
→ Verifica que ejecutaste migration 2700 (org_id opcional)

### **Error "column user_id does not exist"**
→ Ejecuta migration 2700 primero

---

## 📚 Referencias

- [Supabase PostgREST Schema Cache](https://postgrest.org/en/stable/references/schema_cache.html)
- [Supabase Foreign Key Relationships](https://supabase.com/docs/guides/database/joins-and-nesting)

---

**Status:** ✅ Migration lista para ejecutar  
**Orden:** Después de 2700  
**Breaking changes:** No
