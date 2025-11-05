# ✅ Fix: Agregar client_profile_id al DTO

## 🐛 Problema Detectado

El DTO `ContractListItemDTO` no incluía el campo `client_profile_id`, por lo que aunque el repositorio lo estaba consultando, no se estaba mapeando ni devolviendo.

**Resultado**: Los contratos con clientes de tipo `profile` (usuarios autenticados) no mostraban el nombre del cliente.

---

## 🔧 Solución Aplicada

### 1. Actualizar DTO para incluir ambos IDs y el tipo

**Archivo**: `src/modules/contracts/application/dto/ContractDTO.ts`

```typescript
export interface ContractListItemDTO {
  // ... otros campos
  clientContactId: string | null;     // ID desde lead_contacts (puede ser null)
  clientProfileId: string | null;     // ID desde profiles (puede ser null) ✨ NUEVO
  clientName: string | null;          // Nombre del cliente (de cualquiera)
  clientType: "lead_contact" | "profile" | null; // Tipo de cliente ✨ NUEVO
  // ... otros campos
}
```

### 2. Actualizar mapeo en el repositorio

**Archivo**: `src/modules/contracts/infrastructure/repositories/SupabaseContractRepo.ts`

```typescript
// Determinar el nombre y tipo del cliente
let clientName: string | null = null;
let clientType: "lead_contact" | "profile" | null = null;

if (row.client_contact_id && row.lead_contacts?.full_name) {
  clientName = row.lead_contacts.full_name;
  clientType = "lead_contact";
} else if (row.client_profile_id && row.profiles?.full_name) {
  clientName = row.profiles.full_name;
  clientType = "profile";
}

return {
  // ... otros campos
  clientContactId: row.client_contact_id,  // ID lead_contact
  clientProfileId: row.client_profile_id,  // ID profile ✨
  clientName: clientName,                   // Nombre
  clientType: clientType,                   // Tipo ✨
  // ... otros campos
};
```

### 3. Limpiar console.log de debug

**Archivo**: `src/modules/contracts/application/use-cases/ListContracts.ts`

Eliminados los console.log que estabas usando para debuggear.

---

## ✅ Resultado

Ahora el DTO incluye:

1. ✅ `clientContactId` - ID si el cliente es de `lead_contacts`
2. ✅ `clientProfileId` - ID si el cliente es de `profiles` (NUEVO)
3. ✅ `clientName` - Nombre del cliente (de cualquiera de las dos tablas)
4. ✅ `clientType` - Tipo de cliente: "lead_contact" o "profile" (NUEVO)

**Ejemplo de respuesta**:

```typescript
// Contrato con lead_contact
{
  clientContactId: "uuid-123",
  clientProfileId: null,
  clientName: "Juan Pérez",
  clientType: "lead_contact"
}

// Contrato con profile
{
  clientContactId: null,
  clientProfileId: "uuid-456",
  clientName: "María García",
  clientType: "profile"
}

// Contrato sin cliente
{
  clientContactId: null,
  clientProfileId: null,
  clientName: null,
  clientType: null
}
```

---

## 🧪 Cómo verificar

1. **En la consola del navegador**, ejecuta:
   ```javascript
   // Después de que cargue el listado de contratos
   console.log('Contratos con clientes:', result.value.items);
   ```

2. **Verifica** que cada contrato ahora tenga:
   - ✅ `clientProfileId` (si tiene cliente tipo profile)
   - ✅ `clientContactId` (si tiene cliente tipo lead_contact)
   - ✅ `clientName` (nombre del cliente)
   - ✅ `clientType` (tipo de cliente)

---

**Fecha**: 5 de noviembre de 2025  
**Estado**: ✅ Completado
