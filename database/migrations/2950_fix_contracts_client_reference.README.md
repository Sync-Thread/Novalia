# Migration 2950: Fix Contracts Client Reference

## 📋 Problema

Al intentar crear un contrato asociado a un cliente que fue seleccionado de una propiedad específica, se produce el siguiente error:

```
Failed to create contract: insert or update on table "contracts" violates foreign key constraint "contracts_client_contact_id_fkey"
```

### Causa raíz

1. **Tabla `contracts`** tiene columna `client_contact_id` → FK a `lead_contacts`
2. **Función `get_interested_profiles()`** devuelve usuarios de la tabla `profiles` (usuarios autenticados)
3. **UI en `NewDocumentQuickView.tsx`** cuando filtra clientes por propiedad, usa `get_interested_profiles()` que devuelve `profiles.id`
4. Al intentar guardar el contrato, se intenta insertar `profiles.id` en `client_contact_id` → ❌ **Violación de FK**

### Diferencia entre tablas

| Tabla | Descripción | Uso |
|-------|-------------|-----|
| `lead_contacts` | Contactos/leads que pueden ser anónimos | Clientes potenciales, leads generados por marketing |
| `profiles` | Usuarios registrados con autenticación | Usuarios que tienen cuenta en la plataforma |

## ✅ Solución

Agregar soporte para **ambos tipos de clientes** en la tabla `contracts`:

1. **`client_contact_id`** → FK a `lead_contacts` (leads anónimos)
2. **`client_profile_id`** → FK a `profiles` (usuarios autenticados) ← **NUEVO**

Ambas columnas son **mutuamente exclusivas** (solo una puede tener valor).

## 🔧 Cambios en la migración

### 1. Nueva columna

```sql
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_profile_id uuid;
```

### 2. FK constraint

```sql
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_client_profile_id_fkey
  FOREIGN KEY (client_profile_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;
```

### 3. Check constraint (mutuamente exclusivo)

```sql
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_only_one_client_type
  CHECK (
    (client_contact_id IS NOT NULL AND client_profile_id IS NULL) OR
    (client_contact_id IS NULL AND client_profile_id IS NOT NULL) OR
    (client_contact_id IS NULL AND client_profile_id IS NULL)
  );
```

### 4. Función helper

Se crea `get_contract_client_info(p_contract_id)` que devuelve información del cliente independientemente de si es un `lead_contact` o un `profile`.

## 📝 Cambios necesarios en el código

Después de ejecutar la migración, debes actualizar el archivo:

**`src/modules/contracts/UI/components/NewDocumentQuickView.tsx`**

Cambiar línea ~375:

```typescript
// ANTES (❌ incorrecto)
client_contact_id: formData.clientId || null,

// DESPUÉS (✅ correcto)
// Determinar si es un profile o lead_contact
// Temporalmente, asumimos que si hay propertyId es un profile
client_profile_id: formData.propertyId && formData.clientId ? formData.clientId : null,
client_contact_id: !formData.propertyId && formData.clientId ? formData.clientId : null,
```

**MEJOR SOLUCIÓN:** Modificar el selector de clientes para indicar el tipo:

```typescript
interface ClientOption {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  type: 'profile' | 'lead_contact'; // ← Agregar tipo
}
```

Y en el repositorio marcar el tipo según la fuente de datos.

## 🚀 Instrucciones de ejecución

1. **Ejecutar la migración en Supabase:**

   Ve a: **SQL Editor** en tu dashboard de Supabase y pega el contenido del archivo:
   
   ```
   database/migrations/2950_fix_contracts_client_reference.sql
   ```

2. **Verificar que se ejecutó correctamente:**

   ```sql
   -- Verificar nueva columna
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'contracts' 
   AND column_name IN ('client_contact_id', 'client_profile_id');

   -- Verificar constraints
   SELECT conname, contype 
   FROM pg_constraint 
   WHERE conname LIKE 'contracts_client%';
   ```

3. **Actualizar el código del frontend** según las instrucciones arriba.

## 🧪 Casos de uso

### Caso 1: Contrato con lead_contact (anónimo)

```typescript
await supabase.from("contracts").insert({
  org_id: orgId,
  user_id: userId,
  property_id: propertyId,
  client_contact_id: "uuid-from-lead-contacts", // ← lead_contact
  client_profile_id: null,
  contract_type: "intermediacion",
  // ... otros campos
});
```

### Caso 2: Contrato con profile (usuario autenticado)

```typescript
await supabase.from("contracts").insert({
  org_id: orgId,
  user_id: userId,
  property_id: propertyId,
  client_contact_id: null,
  client_profile_id: "uuid-from-profiles", // ← profile
  contract_type: "promesa",
  // ... otros campos
});
```

### Caso 3: Contrato sin cliente (plantilla)

```typescript
await supabase.from("contracts").insert({
  org_id: orgId,
  user_id: userId,
  property_id: null,
  client_contact_id: null,
  client_profile_id: null,
  contract_type: "intermediacion",
  is_template: true,
  // ... otros campos
});
```

## 📊 Esquema actualizado

```
┌─────────────────────────────────────────┐
│            contracts                     │
├─────────────────────────────────────────┤
│ id                     uuid PK           │
│ org_id                 uuid FK           │
│ user_id                uuid FK           │
│ property_id            uuid FK           │
│ client_contact_id      uuid FK → lead_contacts  │
│ client_profile_id      uuid FK → profiles (NEW) │
│ contract_type          enum              │
│ status                 enum              │
│ is_template            boolean           │
│ title                  text              │
│ s3_key                 text              │
│ hash_sha256            text              │
│ ...                                      │
└─────────────────────────────────────────┘
```

## ⚠️ Importante

- Solo **UNA** de las dos columnas (`client_contact_id` o `client_profile_id`) puede tener valor
- Ambas pueden ser `NULL` (contrato sin cliente o plantilla)
- Si intentas poner valores en ambas, la base de datos rechazará el INSERT/UPDATE

## 🔄 Rollback

Si necesitas revertir esta migración:

```sql
BEGIN;

DROP FUNCTION IF EXISTS public.get_contract_client_info(uuid);

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_only_one_client_type,
  DROP CONSTRAINT IF EXISTS contracts_client_profile_id_fkey,
  DROP COLUMN IF EXISTS client_profile_id;

COMMIT;
```
