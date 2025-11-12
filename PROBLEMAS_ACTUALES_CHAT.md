# 🐛 Problemas Actuales del Chat - Análisis y Soluciones

**Fecha:** 12 de Noviembre, 2025  
**Estado:** En análisis
**Prioridad:** 🔴 ALTA

---

## 📋 Problemas Reportados

### 1. ❌ Contactos sin nombre en la lista de chats

**Síntoma:**
Todos los contactos aparecen como "Contacto sin nombre" en el sidebar de chats.

**Causa Raíz:**
En `SupabaseChatThreadRepo.ts`, la función `mapParticipants()` intenta acceder a los datos de los joins:
- `row.user_profiles?.full_name` para usuarios
- `row.contacts?.full_name` para contactos

El problema está en que los joins no se están ejecutando correctamente o los datos no están llegando.

**Ubicación del código:**
```typescript
// src/modules/comunication/infrastructure/adapters/SupabaseChatThreadRepo.ts
// Línea ~340-360

function mapParticipants(rows: ChatParticipantRow[]): ParticipantDTO[] {
  return rows
    .map(row => {
      if (row.user_id) {
        return {
          id: row.user_id,
          type: "user" as const,
          displayName: row.user_profiles?.full_name ?? null, // ← NULL porque el join falla
          email: row.user_profiles?.email ?? null,
          phone: row.user_profiles?.phone ?? null,
          lastSeenAt: null,
        };
      }
      if (row.contact_id) {
        return {
          id: row.contact_id,
          type: "contact" as const,
          displayName: row.contacts?.full_name ?? null, // ← NULL porque el join falla
          email: row.contacts?.email ?? null,
          phone: row.contacts?.phone ?? null,
          lastSeenAt: null,
        };
      }
      return null;
    })
    .filter((participant): participant is ParticipantDTO => Boolean(participant));
}
```

**Query SELECT actual:**
```typescript
const THREAD_SELECT = `
  id,
  org_id,
  property_id,
  contact_id,
  created_by,
  created_at,
  last_message_at,
  properties:properties!chat_threads_property_id_fkey(
    id,
    title,
    price,
    currency,
    city,
    state,
    operation_type,
    status
  ),
  participants:chat_participants(
    user_id,
    contact_id,
    user_profiles:profiles!chat_participants_user_id_fkey(
      id,
      full_name,
      email,
      phone
    ),
    contacts:lead_contacts!chat_participants_contact_id_fkey(
      id,
      full_name,
      email,
      phone
    )
  ),
  last_message:chat_messages!left(
    id,
    thread_id,
    sender_type,
    sender_user_id,
    sender_contact_id,
    body,
    payload,
    created_at,
    delivered_at,
    read_at
  ).order(created_at.desc).limit(1)
`;
```

**Solución:**
El query parece correcto. El problema podría ser:
1. **RLS policies** bloqueando el acceso a `profiles` o `lead_contacts`
2. **Datos faltantes** - Los participantes no tienen `user_id` o `contact_id` válidos
3. **FK constraint** - Las foreign keys no están correctamente configuradas

**Acción requerida:**
1. ✅ Verificar RLS policies de `profiles` y `lead_contacts`
2. ✅ Verificar datos en `chat_participants` con query directa
3. ✅ Verificar foreign keys en la tabla

---

### 2. ❌ Error: "No se pudo determinar el correo del cliente"

**Síntoma:**
Aparece error rojo en la vista de chats: "Error: No se pudo determinar el contacto del cliente"

**Causa Raíz:**
En `ListClientInbox.ts`, línea 31:

```typescript
export class ListClientInbox {
  async execute(rawFilters: Partial<ThreadFiltersDTO> = {}): Promise<Result<ClientInboxDTO>> {
    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    const auth = authResult.value;
    const filters = filtersResult.value;
    const contactId = filters.contactId ?? auth.contactId ?? null;

    if (!contactId) {
      return Result.fail({
        scope: "chat",
        code: "CONTACT_REQUIRED",
        message: "No se pudo determinar el contacto del cliente", // ← ESTE ERROR
      });
    }
    // ...
  }
}
```

**El problema:**
- Este use case está diseñado para **contactos/leads** (usuarios NO autenticados)
- Pero se está llamando con un **usuario autenticado** (`auth.userId` existe, `auth.contactId` es null)
- El código asume que si es "client" debe tener `contactId`, pero en realidad puede ser un usuario registrado que pregunta por una propiedad

**Diseño actual incorrecto:**
```
Vista "Buyer" → ListClientInbox → Requiere contactId
   ↓
Si usuario autenticado pregunta por propiedad
   → auth.userId existe ✅
   → auth.contactId = null ❌
   → ERROR: "No se pudo determinar el contacto del cliente"
```

**Diseño correcto:**
```
Vista "Buyer" puede tener 2 tipos:
1. Usuario autenticado (profile) → Usar auth.userId
2. Lead sin cuenta (contact) → Usar auth.contactId

Solución:
- ListClientInbox debe soportar AMBOS
- O crear ListBuyerInbox que maneje ambos casos
```

**Ubicación:**
`src/modules/comunication/application/use-cases/threads/ListClientInbox.ts`

**Solución:**
Opción A) Modificar `ListClientInbox` para aceptar userId O contactId
Opción B) Crear `ListBuyerInbox` nuevo que unifique ambos casos
Opción C) Usar `ListListerInbox` con un flag `forBuyer: true`

---

### 3. ❌ Mensajes no aparecen al volver a visitar la propiedad

**Síntoma:**
1. Usuario contacta desde PropertyDetailPage
2. Envía mensaje → Mensaje se envía correctamente ✅
3. Usuario sale y vuelve a la vista
4. El chat aparece vacío, sin los mensajes previos ❌

**Causa Potencial:**
El problema podría estar en:

1. **Hook useMessages no carga al montar:**
```typescript
// src/modules/comunication/UI/hooks/useMessages.ts
useEffect(() => {
  if (threadId) {
    void loadMessages(1);
  } else {
    setMessages([]);
    setHasMore(false);
  }
}, [threadId, loadMessages]); // ← Dependencia de loadMessages podría causar loops
```

2. **ChatWidget reinicia el thread cada vez:**
```typescript
// src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx
useEffect(() => {
  if (!isOpen) {
    // Reset state when closing
    setThread(null);
    setMessages([]);
    setMessageBody("");
    setError(null);
    return;
  }
  // ...
}, [isOpen, propertyId, orgId, listerUserId, useCases]);
```

El widget resetea el estado cuando `isOpen` cambia a false, pero cuando vuelve a abrir debería cargar los mensajes existentes.

3. **FindOrCreateThread solo busca, pero no carga mensajes:**
```typescript
// src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx
// Línea ~75-85
if (newThread.lastMessage) {
  console.log("📨 Cargando mensajes...");
  const messagesResult = await useCases.listMessages.execute({
    threadId: newThread.id,
    page: 1,
    pageSize: 50,
  });

  if (messagesResult.isOk()) {
    console.log("✅ Mensajes cargados:", messagesResult.value.items.length);
    setMessages(messagesResult.value.items);
  }
} else {
  console.log("📭 No hay mensajes previos");
}
```

**El problema está aquí:** Solo carga mensajes si `newThread.lastMessage` existe. Pero `lastMessage` podría ser null incluso si hay mensajes.

**Solución:**
Siempre intentar cargar mensajes, independientemente de `lastMessage`:

```typescript
// Cargar mensajes siempre
const messagesResult = await useCases.listMessages.execute({
  threadId: newThread.id,
  page: 1,
  pageSize: 50,
});

if (messagesResult.isOk()) {
  console.log("✅ Mensajes cargados:", messagesResult.value.items.length);
  setMessages(messagesResult.value.items);
}
```

---

### 4. ❌ Falta implementación para 3 tipos de usuarios

**Requerimiento:**
El sistema debe soportar:
1. **Leads (sin cuenta)** → Mostrar formulario de captura
2. **Usuarios registrados (compradores)** → Crear thread directamente
3. **Vendedores independientes** → Pueden preguntar por propiedades de otros

**Estado actual:**
- ✅ Usuarios registrados funcionan (con bugs)
- ❌ Leads sin cuenta NO implementado
- ❌ Vendedores como compradores NO implementado

**Falta:**
1. **LeadCaptureForm** - Formulario para capturar nombre, email, teléfono
2. **CreateOrGetLead** use case - Crear o buscar lead en `lead_contacts`
3. **Lógica de detección** - ¿Usuario está autenticado? ¿Es vendedor o comprador?
4. **Widget de registro** - Si no está autenticado, opción de "Registrarse"

**Ubicación:**
Actualmente el ChatWidget solo funciona para usuarios autenticados. Falta toda la lógica para leads.

**Solución:**
Ver el plan en el documento `PLAN_TRABAJO_CHAT_ACTUALIZADO.md` DÍA 1-3: ChatWidget

---

### 5. ⚠️ Vista de chats muestra todos los threads (no filtra por usuario)

**Requerimiento:**
La sección de chat en el header debe mostrar únicamente los mensajes de ese usuario en específico:
- **Vendedor:** Agrupados por propiedad, mostrando compradores que preguntaron
- **Comprador:** Lista de propiedades a las que ha preguntado

**Estado actual:**
El código en `ChatsPage.tsx` ya tiene esta lógica implementada:
```typescript
// Resolver rol del usuario (seller vs buyer)
useEffect(() => {
  let active = true;
  const resolveView = async () => {
    try {
      const nextView = await resolveViewFromSession();
      if (!active) return;
      setView(nextView);
    } finally {
      if (active) {
        setViewResolving(false);
      }
    }
  };
  void resolveView();
  return () => {
    active = false;
  };
}, []);
```

Y el hook `useInbox` ya filtra correctamente:
```typescript
const { 
  threads, 
  groups, 
  loading: loadingInbox, 
  error: inboxError,
  totalUnread,
  refresh: refreshInbox 
} = useInbox({ 
  role: view, // 'seller' o 'buyer'
  search 
});
```

**Sin embargo:**
El error "No se pudo determinar el contacto del cliente" está bloqueando la vista para compradores.

**Solución:**
Arreglar el problema #2 primero.

---

### 6. ❌ Dialog aparece al centro (debería ser sidebar estilo Facebook)

**Requerimiento:**
El chat debe aparecer como sidebar en la derecha (estilo Facebook Messenger), no como dialog central.

**Estado actual:**
```css
/* src/modules/comunication/UI/components/ChatWidget/ChatWidget.module.css */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

**Solución:**
Cambiar a sidebar:
```css
.overlay {
  position: fixed;
  top: 0;
  right: 0; /* ← Quitar left: 0 */
  bottom: 0;
  width: 100%; /* Solo para el backdrop */
  background: rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: flex;
  justify-content: flex-end; /* ← Alinear a la derecha */
}

.modal {
  background: white;
  width: 400px; /* Ancho fijo en desktop */
  height: 100vh; /* Altura completa */
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .modal {
    width: 100%; /* Full screen en móvil */
  }
}
```

---

### 7. ❌ Chat no está en tiempo real

**Requerimiento:**
El chat debe actualizarse en tiempo real cuando llegan mensajes nuevos.

**Estado actual:**
El código ya tiene el hook `useChatRealtime`:
```typescript
// src/modules/comunication/UI/hooks/useChatRealtime.ts
export function useChatRealtime(
  threadId: string | null,
  callbacks: {
    onMessage?: (message: ChatMessageDTO) => void;
    onTyping?: () => void;
    onDelivered?: () => void;
  }
): void {
  const { realtime } = useChatModule();
  
  useEffect(() => {
    if (!threadId) return;
    
    const channel = realtime.subscribeToThread(threadId, callbacks);
    
    return () => {
      realtime.unsubscribe(channel);
    };
  }, [threadId, callbacks, realtime]);
}
```

**Problema:**
El ChatWidget NO está usando este hook. Solo `useMessages` lo usa.

**Solución:**
Integrar `useChatRealtime` en el ChatWidget para escuchar mensajes nuevos y actualizar el estado local.

---

## 🎯 Plan de Acción Priorizado

### 🔴 PRIORIDAD ALTA (Crítico)

#### 1. Arreglar nombres de contactos (1-2 horas)
**Archivos:**
- `src/modules/comunication/infrastructure/adapters/SupabaseChatThreadRepo.ts`

**Tareas:**
- [ ] Ejecutar query directa en Supabase para verificar datos de `chat_participants`
- [ ] Verificar RLS policies de `profiles` y `lead_contacts`
- [ ] Agregar logs para debug del join
- [ ] Corregir el query SELECT si es necesario

#### 2. Solucionar error "No se pudo determinar el contacto del cliente" (2-3 horas)
**Archivos:**
- `src/modules/comunication/application/use-cases/threads/ListClientInbox.ts`
- Posiblemente crear `src/modules/comunication/application/use-cases/threads/ListBuyerInbox.ts`

**Tareas:**
- [ ] Modificar `ListClientInbox` para aceptar userId O contactId
- [ ] Actualizar lógica para detectar tipo de usuario
- [ ] Probar con usuario autenticado
- [ ] Probar con lead sin cuenta (cuando esté implementado)

#### 3. Corregir carga de mensajes al revisitar (30 minutos)
**Archivos:**
- `src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx`

**Tareas:**
- [ ] Cambiar línea ~75 para cargar mensajes siempre (no solo si lastMessage existe)
- [ ] Probar: enviar mensaje → cerrar → abrir → verificar que aparecen

---

### 🟡 PRIORIDAD MEDIA (Importante)

#### 4. Cambiar dialog a sidebar (1 hora)
**Archivos:**
- `src/modules/comunication/UI/components/ChatWidget/ChatWidget.module.css`

**Tareas:**
- [ ] Modificar CSS para sidebar derecho
- [ ] Agregar animación de slide-in
- [ ] Hacer responsive (full screen en móvil)
- [ ] Probar en diferentes tamaños de pantalla

#### 5. Integrar realtime en ChatWidget (30 minutos)
**Archivos:**
- `src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx`

**Tareas:**
- [ ] Importar y usar `useChatRealtime`
- [ ] Agregar handler para nuevos mensajes
- [ ] Probar con 2 usuarios en diferentes navegadores

---

### 🟢 PRIORIDAD BAJA (Pendiente)

#### 6. Implementar soporte para leads sin cuenta (3-4 días)
**Referencia:** Ver `PLAN_TRABAJO_CHAT_ACTUALIZADO.md` DÍA 1-3

**Componentes a crear:**
- [ ] LeadCaptureForm
- [ ] CreateOrGetLead use case
- [ ] Lógica de detección en ChatWidget
- [ ] Widget de "Registrarse" vs "Continuar como invitado"

#### 7. Implementar vista de vendedor con pestañas por propiedad (1-2 horas)
**Archivos:**
- `src/modules/comunication/UI/pages/ChatsPage.tsx`

**Tareas:**
- [ ] Mejorar UI de grupos colapsables
- [ ] Agregar indicadores visuales de propiedad
- [ ] Optimizar rendimiento con muchos threads

---

## 📊 Resumen de Impacto

| Problema | Severidad | Impacto en UX | Tiempo Fix |
|----------|-----------|---------------|------------|
| Contactos sin nombre | 🔴 Alta | Los usuarios no saben con quién hablan | 1-2h |
| Error "contacto del cliente" | 🔴 Alta | Bloquea vista de compradores | 2-3h |
| Mensajes no cargan al revisitar | 🔴 Alta | Parece que se perdieron los mensajes | 30min |
| Dialog vs Sidebar | 🟡 Media | UX mejorable pero funcional | 1h |
| Realtime no integrado | 🟡 Media | Hay que refrescar manualmente | 30min |
| Leads sin cuenta | 🟢 Baja | Feature faltante | 3-4 días |
| Pestañas por propiedad | 🟢 Baja | Organización mejorable | 1-2h |

---

**Total tiempo de fixes críticos:** ~4-6 horas
**Total tiempo de mejoras importantes:** ~2-3 horas
**Total tiempo de features nuevas:** ~3-4 días

---

## ✅ Checklist de Verificación

Después de cada fix:

### Fix 1: Nombres de contactos
- [ ] Los nombres aparecen correctamente en ChatsPage
- [ ] Los nombres aparecen en ChatWidget
- [ ] Funciona para usuarios (profiles)
- [ ] Funciona para leads (lead_contacts)

### Fix 2: Error de contacto
- [ ] Compradores autenticados pueden ver su inbox
- [ ] No hay error "No se pudo determinar..."
- [ ] Los threads se filtran correctamente por usuario

### Fix 3: Carga de mensajes
- [ ] Al volver a abrir el chat, los mensajes aparecen
- [ ] La historia completa se carga
- [ ] El scroll va al último mensaje

### Fix 4: Sidebar
- [ ] El chat aparece en la derecha (desktop)
- [ ] Animación de slide-in funciona
- [ ] Full screen en móvil
- [ ] Se puede cerrar con overlay

### Fix 5: Realtime
- [ ] Nuevos mensajes aparecen automáticamente
- [ ] No hay que refrescar la página
- [ ] Funciona en ambos lados de la conversación

---

**Última actualización:** 12 de Noviembre, 2025  
**Próxima acción:** Comenzar con Fix #1 (Nombres de contactos)
