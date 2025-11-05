# ✅ Resumen de Cambios: Org ID Opcional

## 🎯 Objetivo
Permitir que usuarios **sin organización** puedan usar el sistema completo de propiedades y contratos.

---

## 📦 Archivos Modificados

### **1. Database Migration**
- ✅ `database/migrations/2700_make_org_id_optional.sql` - **CREADO**
- ✅ `database/migrations/2700_make_org_id_optional.README.md` - **CREADO**

### **2. Application Layer (Contracts Module)**

#### **Use Cases:**
- ✅ `src/modules/contracts/application/use-cases/ListPropertiesForSelector.ts`
  - ❌ Eliminado: Validación obligatoria de `orgId`
  - ✅ Agregado: Extracción de `userId` del auth context
  - ✅ Modificado: Envía `orgId || null` y `userId` al repositorio

#### **Ports (Interfaces):**
- ✅ `src/modules/contracts/application/ports/PropertyRepo.ts`
  - ✅ `PropertyListFilters.orgId`: `string` → `string | null`
  - ✅ `PropertyListFilters.userId`: **NUEVO** campo obligatorio
  - ✅ Documentación actualizada con lógica de filtrado

#### **Infrastructure:**
- ✅ `src/modules/contracts/infrastructure/repositories/SupabasePropertyRepo.ts`
  - ✅ Query condicional: si `orgId` → filtrar por org, si no → filtrar por `lister_user_id`
  - ✅ Soporte para usuarios sin organización

### **3. UI Components**
- ✅ `src/modules/contracts/UI/components/NewDocumentQuickView.tsx`
  - ❌ Eliminado: Error cuando no hay `org_id`
  - ✅ Modificado: `orgId = profile?.org_id || null`
  - ✅ Agregado: `user_id: user.id` al INSERT de contratos

---

## 🗄️ Cambios en Base de Datos

### **Tablas Modificadas:**

| Tabla | Columna | Cambio |
|-------|---------|--------|
| `properties` | `org_id` | `NOT NULL` → **NULLABLE** |
| `properties` | `lister_user_id` | **NUEVA** (uuid, FK a auth.users) |
| `contracts` | `org_id` | `NOT NULL` → **NULLABLE** |
| `contracts` | `user_id` | **NUEVA** (uuid, FK a auth.users) |
| `property_leads` | `org_id` | `NOT NULL` → **NULLABLE** |
| `property_leads` | `user_id` | **NUEVA** (uuid, FK a auth.users) |
| `attributions` | `org_id` | `NOT NULL` → **NULLABLE** |

### **Índices Agregados:**
```sql
idx_properties_lister_user_id
idx_contracts_user_id
```

### **RLS Policies Actualizadas:**

| Tabla | Política Anterior | Política Nueva |
|-------|-------------------|----------------|
| `properties` | `properties_org_rw` | `properties_org_or_owner_rw` |
| `contracts` | `contracts_org_rw` | `contracts_org_or_owner_rw` |
| `media_assets` | `media_assets_org_rw` | `media_assets_org_or_owner_rw` |
| `property_leads` | (nueva) | `property_leads_org_or_owner_rw` |
| `attributions` | (nueva) | `attributions_org_or_owner_rw` |

**Lógica de las nuevas políticas:**
```sql
-- Acceso permitido si:
(org_id IS NOT NULL AND public.is_in_org(org_id))  -- Usuario pertenece al org
OR
(org_id IS NULL AND user_id = auth.uid())           -- Usuario es el dueño
```

---

## 🔄 Flujo de Datos

### **Antes (Con ORG obligatorio):**
```
Usuario → AuthService → orgId (obligatorio)
       ↓
SupabasePropertyRepo.listForSelector()
       ↓
WHERE org_id = 'abc-123'
```

### **Después (ORG opcional):**
```
Usuario → AuthService → orgId (nullable) + userId
       ↓
SupabasePropertyRepo.listForSelector()
       ↓
IF orgId:
  WHERE org_id = 'abc-123'
ELSE:
  WHERE org_id IS NULL AND lister_user_id = 'user-456'
```

---

## 🚀 Cómo Ejecutar

### **1. Ejecutar Migration**
```bash
cd database
./apply_all.sh
```

O manualmente:
```bash
psql -h <host> -U <user> -d <database> -f database/migrations/2700_make_org_id_optional.sql
```

### **2. Verificar Cambios**
```sql
-- Verificar que org_id es nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('properties', 'contracts') 
  AND column_name = 'org_id';

-- Resultado esperado: is_nullable = 'YES'
```

### **3. Reiniciar Dev Server**
```bash
npm run dev
```

---

## ✅ Testing Checklist

### **Escenarios a probar:**

- [ ] **Usuario CON organización:**
  - [ ] Puede ver propiedades del org
  - [ ] Puede crear contratos con `org_id`
  - [ ] No ve propiedades de otros orgs

- [ ] **Usuario SIN organización:**
  - [ ] Puede crear propiedades (con `lister_user_id`)
  - [ ] Solo ve sus propias propiedades
  - [ ] Puede crear contratos (con `user_id`)
  - [ ] No ve propiedades/contratos de otros usuarios

- [ ] **Migración de datos existentes:**
  - [ ] Propiedades antiguas mantienen su `org_id`
  - [ ] Contratos antiguos mantienen su `org_id`
  - [ ] No hay errores al cargar datos existentes

---

## 🐛 Troubleshooting

### **Error: "org_id violates not-null constraint"**
✅ **Solución:** Ejecuta la migration primero antes de probar en el frontend.

### **Error: "column lister_user_id does not exist"**
✅ **Solución:** La migration no se aplicó correctamente. Verifica logs de PostgreSQL.

### **Usuario sin org no ve propiedades**
✅ **Solución:** Verifica que las propiedades tengan `lister_user_id` poblado al crearlas.

### **RLS policy block**
✅ **Solución:** Verifica que el usuario esté autenticado (`auth.uid()` no es NULL).

---

## 📝 Notas Importantes

1. **Retrocompatibilidad:** ✅ Usuarios con org siguen funcionando igual
2. **Datos existentes:** ⚠️ Propiedades/contratos antiguos NO tienen `lister_user_id`/`user_id` automáticamente
3. **RLS Policies:** ✅ Son acumulativas (org OR usuario)
4. **Performance:** ✅ Índices agregados para búsquedas por usuario

---

## 🔮 Próximos Pasos (Opcional)

1. **Migrar datos antiguos:** Asignar `lister_user_id` a propiedades existentes
2. **Agregar UI:** Indicador visual para usuarios sin org
3. **Mejorar filtros:** Permitir a admins ver todas las propiedades del sistema
4. **Dashboard analytics:** Separar métricas por org vs usuario individual

---

**Status:** ✅ **Listo para probar**  
**Migration:** `2700_make_org_id_optional.sql`  
**Archivos modificados:** 5  
**Nuevos archivos:** 2
