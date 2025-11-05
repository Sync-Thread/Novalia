# ✅ Ajustes Finales - Selector de Clientes y Listado de Contratos

## 🔧 Cambios Realizados

### 1. ❌ Excluir Usuario Actual del Selector de Clientes

**Problema**: Al seleccionar clientes, aparecía el usuario actual como opción, pero un usuario no puede ser su propio cliente.

**Solución**: 
- Filtrar el usuario actual al cargar los clientes
- Aplica tanto para clientes de propiedades (profiles) como para contactos generales (lead_contacts)

**Archivo modificado**: `src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts`

```typescript
// Obtener el usuario actual para excluirlo
const { data: { user: currentUser } } = await this.client.auth.getUser();
const currentUserId = currentUser?.id;

// Filtrar resultados
let filteredData = (data || []).filter((row: ClientRow) => {
  // Excluir el usuario actual
  if (currentUserId && row.id === currentUserId) {
    return false;
  }
  // ... resto del filtrado
});
```

---

### 2. 📋 Mostrar Cliente Correcto en Listado de Contratos

**Problema**: El listado solo buscaba clientes en `client_contact_id` (lead_contacts), pero ahora también pueden estar en `client_profile_id` (profiles).

**Solución**:
- Actualizar el query para traer ambas relaciones
- Determinar dinámicamente qué columna tiene el cliente
- Mostrar el nombre correcto independientemente del tipo

**Archivo modificado**: `src/modules/contracts/infrastructure/repositories/SupabaseContractRepo.ts`

#### Query actualizado:
```typescript
.select(
  `
    id,
    title,
    // ... otros campos
    client_contact_id,
    client_profile_id,  // ← NUEVO
    // ... otros campos
    lead_contacts:contracts_client_contact_id_fkey (
      full_name
    ),
    profiles:contracts_client_profile_id_fkey (  // ← NUEVO
      full_name
    )
  `,
  { count: "exact" }
)
```

#### Lógica de mapeo:
```typescript
// Determinar el nombre del cliente (puede venir de cualquiera)
let clientName: string | null = null;
let clientId: string | null = null;

if (row.client_contact_id && row.lead_contacts?.full_name) {
  clientId = row.client_contact_id;
  clientName = row.lead_contacts.full_name;
} else if (row.client_profile_id && row.profiles?.full_name) {
  clientId = row.client_profile_id;
  clientName = row.profiles.full_name;
}
```

---

## 🧪 Casos de Prueba

### ✅ Test 1: Selector de Clientes (sin propiedad)
- Abre el formulario de nuevo contrato
- NO selecciones propiedad
- Busca clientes en el selector
- **Verificar**: NO aparece tu usuario en la lista

### ✅ Test 2: Selector de Clientes (con propiedad)
- Abre el formulario de nuevo contrato
- Selecciona una propiedad que TÚ hayas visitado
- Busca clientes en el selector
- **Verificar**: NO apareces en la lista de clientes interesados

### ✅ Test 3: Listado con cliente tipo lead_contact
- Crea un contrato SIN seleccionar propiedad
- Selecciona un cliente de la lista general (lead_contact)
- Guarda el contrato
- Ve al listado de contratos
- **Verificar**: Se muestra el nombre del cliente correctamente

### ✅ Test 4: Listado con cliente tipo profile
- Crea un contrato CON propiedad
- Selecciona un cliente interesado (profile)
- Guarda el contrato
- Ve al listado de contratos
- **Verificar**: Se muestra el nombre del cliente correctamente

### ✅ Test 5: Listado sin cliente
- Crea un contrato sin cliente (plantilla)
- Ve al listado de contratos
- **Verificar**: No muestra nombre de cliente (vacío o "Sin cliente")

---

## 📝 Archivos Modificados

1. **`src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts`**
   - Excluye usuario actual del selector

2. **`src/modules/contracts/infrastructure/repositories/SupabaseContractRepo.ts`**
   - Trae ambas columnas: `client_contact_id` y `client_profile_id`
   - Trae ambas relaciones: `lead_contacts` y `profiles`
   - Determina dinámicamente qué cliente mostrar

---

## 🔍 Flujo Completo

```
┌─────────────────────────────────────────────┐
│  Usuario abre selector de clientes         │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
  ┌───────────┐      ┌────────────┐
  │ Sin       │      │ Con        │
  │ propiedad │      │ propiedad  │
  └─────┬─────┘      └──────┬─────┘
        │                   │
        ↓                   ↓
  lead_contacts    get_interested_profiles()
  (todos menos yo)    (todos menos yo)
        │                   │
        └─────────┬─────────┘
                  ↓
        ┌──────────────────┐
        │ Usuario selecciona│
        │ cliente           │
        └─────────┬─────────┘
                  ↓
        ┌──────────────────┐
        │ Guarda contrato: │
        │ - client_contact_id (si es lead)    │
        │ - client_profile_id (si es profile) │
        └─────────┬─────────┘
                  ↓
        ┌──────────────────┐
        │ Listado carga:   │
        │ - Ambas columnas │
        │ - Ambas relaciones│
        │ - Muestra la que tenga valor │
        └──────────────────┘
```

---

## ✨ Resumen

- ✅ **Usuario actual excluido** del selector de clientes
- ✅ **Listado actualizado** para mostrar clientes de ambas tablas
- ✅ **Sin errores de compilación**
- ✅ **Listo para probar**

---

**Fecha**: 5 de noviembre de 2025  
**Estado**: ✅ Completado y listo para testing
