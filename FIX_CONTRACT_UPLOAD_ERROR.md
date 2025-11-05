# 🐛 FIX: Error al Subir Contratos a Base de Datos

## ❌ Error Original

```
Failed to create contract: insert or update on table "contracts" violates foreign key constraint "contracts_client_contact_id_fkey"
```

## 🔍 Análisis del Problema

### Causa Raíz

El error ocurría porque **había una mezcla de tipos de clientes** en el flujo:

1. **Cuando NO hay propiedad seleccionada**: El selector de clientes carga datos de `lead_contacts`
2. **Cuando SÍ hay propiedad seleccionada**: El selector usa `get_interested_profiles()` que devuelve datos de `profiles` (usuarios autenticados)
3. **Al guardar el contrato**: Se intentaba guardar **cualquier ID** en `client_contact_id` (FK a `lead_contacts`) → ❌ Violación de FK cuando se seleccionaba un `profile`

### Diferencia entre Tablas

| Tabla | Descripción |
|-------|-------------|
| `lead_contacts` | Contactos/leads que pueden ser **anónimos** (no tienen cuenta en la plataforma) |
| `profiles` | Usuarios **registrados con autenticación** (tienen cuenta activa) |

## ✅ Solución Implementada

### 1. Nueva Migración de Base de Datos

**Archivo**: `database/migrations/2950_fix_contracts_client_reference.sql`

**Cambios**:
- ✅ Nueva columna `client_profile_id` → FK a `profiles`
- ✅ Mantiene columna existente `client_contact_id` → FK a `lead_contacts`
- ✅ Check constraint: solo una puede tener valor (mutuamente exclusivo)
- ✅ Función helper `get_contract_client_info()` para obtener datos del cliente independientemente del tipo

### 2. Cambios en el Código Frontend

#### a) DTO Actualizado

**Archivo**: `src/modules/contracts/application/dto/ClientDTO.ts`

```typescript
export interface ClientSummaryDTO {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  type: "profile" | "lead_contact"; // ← NUEVO
}
```

#### b) Repositorio Actualizado

**Archivo**: `src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts`

- Cuando obtiene `profiles` → marca `type: "profile"`
- Cuando obtiene `lead_contacts` → marca `type: "lead_contact"`

#### c) Componente Actualizado

**Archivo**: `src/modules/contracts/UI/components/NewDocumentQuickView.tsx`

- Estado del form incluye `clientType`
- Al seleccionar cliente, se guarda tanto el `id` como el `type`
- Al insertar contrato, usa la columna correcta según el tipo:
  ```typescript
  client_contact_id: formData.clientType === "lead_contact" ? formData.clientId : null,
  client_profile_id: formData.clientType === "profile" ? formData.clientId : null,
  ```

## 📋 Instrucciones de Despliegue

### Paso 1: Ejecutar Migración en Supabase

1. Ve a tu dashboard de Supabase
2. Abre **SQL Editor**
3. Copia y pega el contenido de:
   ```
   database/migrations/2950_fix_contracts_client_reference.sql
   ```
4. Ejecuta el SQL
5. Verifica que se ejecutó correctamente:

```sql
-- Verificar nueva columna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN ('client_contact_id', 'client_profile_id');

-- Debería mostrar ambas columnas
```

### Paso 2: Verificar el Código

Los cambios en el código ya están aplicados en estos archivos:

- ✅ `src/modules/contracts/application/dto/ClientDTO.ts`
- ✅ `src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts`
- ✅ `src/modules/contracts/UI/components/NewDocumentQuickView.tsx`

### Paso 3: Probar el Flujo

1. **Sin propiedad seleccionada** (lead_contact):
   - Crea un contrato sin seleccionar propiedad
   - Busca un cliente de la lista general
   - Guarda el contrato
   - ✅ Se guardará con `client_contact_id`

2. **Con propiedad seleccionada** (profile):
   - Crea un contrato y selecciona una propiedad
   - Busca un cliente interesado en esa propiedad
   - Guarda el contrato
   - ✅ Se guardará con `client_profile_id`

3. **Sin cliente** (plantilla):
   - Crea un contrato sin cliente
   - ✅ Ambas columnas serán `null`

## 🔍 Verificación en Supabase

Después de ejecutar la migración, verifica en **Table Editor** → **contracts**:

```sql
-- Ver contratos con el tipo de cliente
SELECT 
  id,
  title,
  CASE 
    WHEN client_contact_id IS NOT NULL THEN 'lead_contact'
    WHEN client_profile_id IS NOT NULL THEN 'profile'
    ELSE 'sin_cliente'
  END as client_type,
  client_contact_id,
  client_profile_id
FROM contracts
ORDER BY created_at DESC
LIMIT 10;
```

## 📚 Archivos Relacionados

- `database/migrations/2950_fix_contracts_client_reference.sql` - Migración SQL
- `database/migrations/2950_fix_contracts_client_reference.README.md` - Documentación detallada de la migración
- `src/modules/contracts/application/dto/ClientDTO.ts` - DTO actualizado
- `src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts` - Repositorio con tipo
- `src/modules/contracts/UI/components/NewDocumentQuickView.tsx` - Componente actualizado

## ✨ Resumen

- ✅ **Problema**: FK violation al intentar guardar `profile.id` en columna que esperaba `lead_contact.id`
- ✅ **Solución**: Agregar columna `client_profile_id` para soportar ambos tipos
- ✅ **Migración**: `2950_fix_contracts_client_reference.sql`
- ✅ **Código**: Actualizado para detectar y usar la columna correcta
- ⚠️ **Acción requerida**: **Ejecutar la migración en Supabase SQL Editor**

---

**Fecha**: 5 de noviembre de 2025  
**Estado**: ✅ Código actualizado - ⚠️ Migración pendiente de ejecutar en Supabase
