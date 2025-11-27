# 🔧 Fixes Adicionales - Problemas de Joins y Vista

**Fecha:** 12 de Noviembre, 2025  
**Versión:** 2.0  
**Problemas Resueltos:** 3

---

## 🐛 Problemas Identificados

### Problema #1: Sintaxis Incorrecta de Joins Anidados

**Causa Raíz:**
El query `THREAD_SELECT` usaba sintaxis incorrecta para joins anidados en Supabase:

```typescript
// ❌ INCORRECTO
participants:chat_participants(
  user_id,
  contact_id,
  user_profiles:profiles!chat_participants_user_id_fkey(...)  // Nombre incorrecto
  contacts:lead_contacts!chat_participants_contact_id_fkey(...)  // Nombre incorrecto
)
```

**Problema:**
- `user_profiles:` no es el nombre correcto - debe ser solo `profiles!`
- `contacts:` no es el nombre correcto - debe ser solo `lead_contacts!`
- Falta `!inner` para forzar el join

**Solución Aplicada:**
```typescript
// ✅ CORRECTO
participants:chat_participants!inner(
  user_id,
  contact_id,
  profiles!chat_participants_user_id_fkey(
    id,
    full_name,
    email,
    phone
  ),
  lead_contacts!chat_participants_contact_id_fkey(
    id,
    full_name,
    email,
    phone
  )
)
```

**Cambios:**
1. Agregado `!inner` para forzar el join
2. Removido prefijos incorrectos (`user_profiles:`, `contacts:`)
3. Usado nombres de tabla directos: `profiles`, `lead_contacts`

---

### Problema #2: Mapeo Incorrecto de Relaciones

**Causa Raíz:**
El código esperaba `row.user_profiles` y `row.contacts`, pero Supabase devuelve `row.profiles` y `row.lead_contacts`.

**Solución:**
```typescript
function mapParticipants(rows: ChatParticipantRow[]): ParticipantDTO[] {
  const mapped = rows.map(row => {
    if (row.user_id) {
      // ✅ Verificar AMBOS nombres posibles
      const profileData = (row as any).profiles || (row as any).user_profiles || null;
      return {
        id: row.user_id,
        type: "user" as const,
        displayName: profileData?.full_name ?? null,
        email: profileData?.email ?? null,
        phone: profileData?.phone ?? null,
        lastSeenAt: null,
      };
    }
    
    if (row.contact_id) {
      // ✅ Verificar AMBOS nombres posibles
      const contactData = (row as any).lead_contacts || (row as any).contacts || null;
      return {
        id: row.contact_id,
        type: "contact" as const,
        displayName: contactData?.full_name ?? null,
        email: contactData?.email ?? null,
        phone: contactData?.phone ?? null,
        lastSeenAt: null,
      };
    }
    
    return null;
  }).filter(Boolean);
  
  return mapped;
}
```

**Actualización de Tipos:**
```typescript
export type ChatParticipantRow = {
  thread_id?: string;
  user_id: string | null;
  contact_id: string | null;
  
  // ✅ Soportar AMBOS nombres
  user_profiles?: {...} | null;  // Nombre antiguo
  profiles?: {...} | null;        // Nombre correcto de Supabase
  
  contacts?: {...} | null;        // Nombre antiguo
  lead_contacts?: {...} | null;   // Nombre correcto de Supabase
};
```

---

### Problema #3: Logging Insuficiente

**Solución:**
Agregado logging detallado en:

1. **`fetchThreads()`:**
```typescript
console.log('📬 fetchThreads called with:', { filters, scope });
console.log('🔍 Executing query...');
console.log('✅ Query returned:', { rowCount: data?.length, totalCount: count });
```

2. **`mapParticipants()`:**
```typescript
console.log('🔍 mapParticipants raw rows:', JSON.stringify(rows, null, 2));
console.log('👤 User participant:', { id, displayName, hasProfiles, rawRow });
console.log('👥 Contact participant:', { id, displayName, hasContacts, rawRow });
console.log('✅ Mapped participants:', mapped);
```

---

## 🧪 Plan de Testing

### Test 1: Verificar Nombres en ChatsPage

**Pasos:**
1. Abrir consola del navegador (F12)
2. Navegar a `/chats`
3. Verificar logs

**Resultado Esperado:**
```
🔍 mapParticipants raw rows: [...]
👤 User participant: {
  id: "64c81334-9bc4-42ef-826d-8fbd44b8b414",
  displayName: "Victor Vega",  // ✅ Debe tener nombre
  hasProfiles: true,
  rawRow: {...}
}
✅ Mapped participants: [
  { id: "...", displayName: "Victor Vega", type: "user" },
  { id: "...", displayName: "Mxrrco", type: "user" }
]
```

**Si falla:**
- Verificar que `hasProfiles: true`
- Si es `false`, el problema es el query SELECT
- Si es `true` pero `displayName: null`, el problema es el mapeo

---

### Test 2: PropertyDetailPage Retoma Chat

**Problema Reportado:**
"En detalles de propiedad no retoma el chat al volver a entrar"

**Verificación:**
1. Abrir PropertyDetailPage (ej: `/properties/xxx`)
2. Click en "Contactar"
3. Enviar mensaje "Prueba 1"
4. Cerrar chat
5. **Navegar a otra página** (ej: home)
6. **Volver** a la misma PropertyDetailPage
7. Click en "Contactar"

**Resultado Esperado:**
- ✅ El chat debe mostrar el mensaje "Prueba 1"
- ✅ Log: `✅ Thread creado/encontrado: [mismo thread_id]`
- ✅ Log: `✅ Mensajes cargados: 1`

**Si falla:**
Verificar en consola:
- `findByPropertyAndUser` devuelve el thread existente
- `listMessages` se ejecuta correctamente

---

### Test 3: Vista General Muestra Cards

**Problema Reportado:**
"Vista general de chats no muestra más que los últimos mensajes, no muestra las cards"

**Verificación:**
1. Navegar a `/chats`
2. Verificar que se muestran:
   - ✅ Grupos por propiedad (headers colapsables)
   - ✅ Cards de threads dentro de cada grupo
   - ✅ Nombres de contactos
   - ✅ Preview del último mensaje
   - ✅ Contador de no leídos

**Logs Esperados:**
```
📬 fetchThreads called with: {...}
🔍 Executing query...
✅ Query returned: { rowCount: 10, totalCount: 10 }
🔍 mapParticipants raw rows: [...]
✅ Mapped participants: [...]
```

**Si falla:**
- Si `rowCount: 0` → Problema en el query o filtros
- Si `rowCount > 0` pero no se muestra → Problema en el componente ChatsPage

---

### Test 4: Vendedor Ve Chats Recibidos

**Problema Reportado:**
"Si como comprador le escribo a un vendedor, y luego entro a la cuenta de ese vendedor, esta no muestra el chat que recibió del otro usuario"

**Escenario:**
1. **Usuario A (Comprador)** envía mensaje a propiedad de **Usuario B (Vendedor)**
2. **Usuario B** debe ver el chat en su inbox

**Verificación:**

**Paso 1: Como Comprador (Usuario A)**
1. Login como comprador
2. Ir a PropertyDetailPage de una propiedad del vendedor
3. Click en "Contactar"
4. Enviar mensaje: "Hola, me interesa"
5. Verificar en consola el `thread_id` creado

**Paso 2: Como Vendedor (Usuario B)**
1. Logout y login como vendedor (dueño de la propiedad)
2. Ir a `/chats`
3. **Debe aparecer** el thread con el mensaje del comprador

**Logs Esperados en Usuario B:**
```
📬 fetchThreads called with: {
  filters: { ... },
  scope: { 
    readerType: "user",
    userId: "b8a69087-bb5c-4c18-9de7-c296a29e12a5",  // ID del vendedor
    orgId: "..."
  }
}
✅ Query returned: { rowCount: 1, totalCount: 1 }
```

**Si falla:**
- Verificar que el thread tiene `participantUserIds` con ambos usuarios
- Verificar RLS policies de `chat_threads`
- Verificar que `listForLister` no filtra incorrectamente

---

## 🔍 Debugging Adicional

### Query Manual para Verificar

Si los problemas persisten, ejecutar en Supabase SQL Editor:

```sql
-- Verificar threads con sus participantes
SELECT 
  ct.id as thread_id,
  ct.property_id,
  ct.created_at,
  jsonb_agg(
    jsonb_build_object(
      'user_id', cp.user_id,
      'profile_name', p.full_name,
      'profile_email', p.email
    )
  ) as participants
FROM chat_threads ct
JOIN chat_participants cp ON ct.id = cp.thread_id
LEFT JOIN profiles p ON cp.user_id = p.id
GROUP BY ct.id
ORDER BY ct.created_at DESC
LIMIT 10;
```

**Resultado Esperado:**
- Cada thread debe tener 2 participantes (comprador y vendedor)
- `profile_name` debe tener valores (no NULL)

---

## 📊 Checklist de Verificación

### Después de aplicar los fixes:

- [ ] **Nombres aparecen en ChatsPage**
  - [ ] Ver logs de `mapParticipants`
  - [ ] Verificar `displayName` tiene valor
  - [ ] Verificar `hasProfiles: true`

- [ ] **PropertyDetailPage retoma chat**
  - [ ] Enviar mensaje
  - [ ] Salir y volver
  - [ ] Mensaje sigue visible

- [ ] **Vista general muestra cards**
  - [ ] Grupos por propiedad visibles
  - [ ] Cards de threads dentro de grupos
  - [ ] Nombres de contactos correctos
  - [ ] Preview de mensajes

- [ ] **Vendedor ve chats recibidos**
  - [ ] Comprador envía mensaje
  - [ ] Vendedor ve el thread en su inbox
  - [ ] Nombres correctos en ambos lados

---

## 🚀 Próximos Pasos

### Si todo funciona:
1. ✅ Remover logs de debug temporales
2. ✅ Continuar con implementación de leads sin cuenta
3. ✅ Agregar tests automatizados

### Si falla algún test:
1. ❌ Compartir logs completos de la consola
2. ❌ Ejecutar query manual de verificación
3. ❌ Verificar RLS policies
4. ❌ Revisar datos en `chat_participants`

---

**Estado:** ✅ Fixes aplicados  
**Pendiente:** Testing manual con 4 escenarios  
**Próxima acción:** Probar cada escenario y reportar resultados
