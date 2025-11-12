# ESTADO DEL MÓDULO DE COMUNICACIÓN

**Fecha de actualización**: 12 de Noviembre, 2025  
**Proyecto**: Novalia  
**Branch**: feature/chats-integration  
**Módulo**: Comunicación en tiempo real

---

## 📊 RESUMEN EJECUTIVO

El módulo de comunicación tiene toda la arquitectura base funcional y el sistema de mensajería está **100% operativo**. Se resolvió un bug crítico en el mapper de participantes.

### Estado General
- ✅ **Arquitectura**: Clean Architecture completa
- ✅ **Backend**: Repositorios y servicios funcionales
- ✅ **Base de datos**: Migraciones y tablas completas
- ✅ **UI básico**: Inbox funcional con conversaciones
- ✅ **Sistema de mensajes**: Funcionando correctamente (Bug crítico resuelto)
- ⚠️ **Integración**: Falta ChatWidget en propiedades
- ❌ **Testing**: No implementado
- ❌ **Notificaciones**: No implementado

### 🐛 Bugs Resueltos Recientemente
- ✅ **Bug crítico de doble envoltura UniqueEntityID** (12 Nov 2025)
  - Problema: Los IDs de participantes tenían estructura `UniqueEntityID { value: UniqueEntityID { value: "uuid" } }`
  - Causa: Mapper `toDomainThread` creaba objetos `Participant` antes de pasarlos a `ChatThread.restore()`
  - Solución: Pasar solo snapshots al `restore()` y dejar que cree los objetos internamente
  - Archivos modificados:
    - `chatThread.mapper.ts` - Corregir mapeo de participantes
    - `UniqueEntityID.ts` - Agregar protección contra doble envoltura + `value` público
    - `SendMessage.ts` - Simplificar validación de participantes

---

## ✅ IMPLEMENTADO (70-75%)

### 1. Domain Layer (100% Completo)

**Ubicación**: `src/modules/comunication/domain/`

#### Entidades
- ✅ `ChatThread.ts` - Entidad principal de conversación
  - Gestión de participantes
  - Control de mensajes
  - Estados (open/archived)
  - Contador de no leídos
  - Métodos: `recordMessage()`, `resetUnread()`, `archive()`, `reopen()`

- ✅ `ChatMessage.ts` - Entidad de mensaje
  - Estados: sent → delivered → read
  - Validación de timestamps
  - Métodos: `markDelivered()`, `markRead()`
  - Status calculado automáticamente

- ✅ `Participant.ts` - Participante en conversación
  - Tipos: user | contact
  - Información de perfil
  - Last seen tracking
  - Método: `markSeen()`

#### Value Objects
- ✅ `MessageBody.ts` - Validación de contenido de mensaje
  - Max 2000 caracteres
  - No permite vacío
  - Validación creada con lógica de negocio

- ✅ `UniqueEntityID.ts` - ID tipado con validación UUID

#### Enumeraciones
```typescript
// enums.ts
- SENDER_TYPE: 'user' | 'contact' | 'system'
- PARTICIPANT_TYPE: 'user' | 'contact'
- MESSAGE_STATUS: 'sent' | 'delivered' | 'read'
- THREAD_AUDIENCE: 'lister' | 'client'
- THREAD_STATUS: 'open' | 'archived'
- CurrencyCode: 'MXN' | 'USD'
```

#### Errors
- ✅ `ChatError.ts` - Error específico del dominio
- ✅ `BaseDomainError.ts` - Clase base para errores
- ✅ `InvariantViolationError.ts` - Violación de reglas de negocio

#### Utilidades
- ✅ `clock.ts` - Abstracción del tiempo para testing
  - `systemClock` - Implementación real
  - Interface `DomainClock` para inyección

---



**Ubicación**: `src/modules/comunication/application/`

#### Use Cases Implementados (5/7)

##### ✅ Threads
- **`ListListerInbox.ts`** - Listar conversaciones del vendedor
  - Filtros: propertyId, contactId, unreadOnly, search
  - Agrupación por propiedad
  - Contador total de no leídos
  - Paginación

- **`ListClientInbox.ts`** - Listar conversaciones del cliente
  - Vista simplificada (un thread por propiedad)
  - Filtros básicos
  - Validación de contactId

##### ✅ Messages
- **`ListMessages.ts`** - Obtener mensajes de un thread
  - Validación de acceso (participante debe estar en el thread)
  - Paginación
  - Ordenamiento por fecha

- **`SendMessage.ts`** - Enviar mensaje
  - Validación de contenido (Zod)
  - Verificación de permisos
  - Actualización de last_message_at
  - Conversión Domain ↔ DTO

- **`MarkThreadAsRead.ts`** - Marcar todos los mensajes como leídos
  - Validación de acceso
  - Actualización en batch
  - Diferenciación user/contact

#### DTOs (Data Transfer Objects)
```typescript
src/modules/comunication/application/dto/
├── ChatThreadDTO.ts          ✅ Completo
├── ChatMessageDTO.ts         ✅ Completo
├── ChatParticipantDTO.ts     ✅ Completo
├── InboxDTO.ts               ✅ ListerInboxDTO + ClientInboxDTO
├── ListMessagesDTO.ts        ✅ Input para listar mensajes
├── SendMessageDTO.ts         ✅ Input/Output para enviar
├── PaginationDTO.ts          ✅ Page<T> genérico
└── ThreadFiltersDTO.ts       ✅ Filtros con validación
```

#### Ports (Interfaces)
```typescript
src/modules/comunication/application/ports/
├── ChatThreadRepo.ts         ✅ Interface para threads
├── ChatMessageRepo.ts        ✅ Interface para mensajes
├── AuthService.ts            ✅ Interface de autenticación
├── RealtimeService.ts        ✅ Interface para Realtime
└── Clock.ts                  ✅ Interface para tiempo
```

#### Mappers
```typescript
src/modules/comunication/application/mappers/
├── chatThread.mapper.ts      ✅ Domain ↔ DTO
└── chatMessage.mapper.ts     ✅ Domain ↔ DTO
```

#### Validators (Zod Schemas)
```typescript
src/modules/comunication/application/validators/
├── message.schema.ts         ✅ Validación de SendMessage
└── threadFilters.schema.ts   ✅ Validación de filtros
```

#### Shared Utilities
- ✅ `result.ts` - Patrón Result<T, E> para manejo de errores
- ✅ `validation.ts` - Helper `parseWith()` para Zod

---

### 3. Infrastructure Layer (100% Completo)

**Ubicación**: `src/modules/comunication/infrastructure/`

#### Adapters

##### ✅ `SupabaseChatThreadRepo.ts`
- Implementa `ChatThreadRepo`
- Métodos:
  - `listForLister()` - Threads del vendedor
  - `listForContact()` - Threads del cliente
  - `getById()` - Thread específico
  - `touchLastMessageAt()` - Actualizar timestamp
- Features:
  - Filtros complejos (propertyId, contactId, search, unreadOnly)
  - Paginación
  - Cálculo de contador de no leídos
  - Joins con properties, participants, profiles, lead_contacts
  - Scoping por org_id (RLS)

##### ✅ `SupabaseChatMessageRepo.ts`
- Implementa `ChatMessageRepo`
- Métodos:
  - `listByThread()` - Mensajes de un thread
  - `create()` - Crear mensaje
  - `markThreadAsRead()` - Marcar como leído en batch
- Features:
  - Paginación
  - Ordenamiento por created_at
  - Diferenciación sender_user_id vs sender_contact_id
  - Actualización de read_at y delivered_at

##### ✅ `SupabaseRealtimeChatService.ts`
- Implementa `RealtimeService`
- Métodos:
  - `subscribeToThread()` - Suscribirse a cambios
  - `unsubscribe()` - Cancelar suscripción
  - `broadcastTyping()` - Emitir evento "escribiendo"
- Features:
  - Postgres Changes para nuevos mensajes
  - Broadcast para eventos typing
  - Gestión de channels (Map)
  - Cleanup automático

##### ✅ `SupabaseAuthService.ts`
- Implementa `AuthService`
- Método:
  - `getCurrent()` - Obtener usuario autenticado
- Retorna: userId, orgId, contactId (si aplica)

#### Types
```typescript
src/modules/comunication/infrastructure/types/
└── supabase-rows.ts          ✅ Tipos de BD
    - ChatThreadRow
    - ChatMessageRow
    - ChatParticipantRow
    - PropertySummaryRow
```

#### Mappers
```typescript
src/modules/comunication/infrastructure/mappers/
└── (integrados en repos)     ✅ DTO ↔ Database Row
```

#### Utils
```typescript
src/modules/comunication/infrastructure/utils/
└── scopeByContext.ts         ✅ Filtrado por org_id/userId
```

---

### 4. UI Layer (60% Completo)

**Ubicación**: `src/modules/comunication/UI/`

#### Pages

##### ✅ `ChatsPage.tsx` (Completo)
**Ubicación**: `src/modules/comunication/UI/pages/ChatsPage.tsx`

**Características implementadas:**
- Detección automática de rol (lister vs client)
- Vista dual:
  - **Lister**: Agrupación por propiedades
  - **Client**: Vista simplificada
- Sidebar con lista de threads:
  - Búsqueda en tiempo real
  - Contador de no leídos
  - Último mensaje preview
  - Timestamps relativos
  - Badge de no leídos
- Panel de conversación:
  - Lista de mensajes
  - Input con placeholder
  - Envío de mensajes
  - Auto-scroll
  - Estado de carga
- Integración con Realtime:
  - Nuevos mensajes en vivo
  - Actualización de inbox
- Mock data para desarrollo
- Manejo de estados:
  - Loading
  - Empty states
  - Error states

**Estilos CSS Module:**
- ✅ `ChatsPage.module.css` - Estilos completos con:
  - Layout de 2 columnas
  - Sidebar responsivo
  - Burbujas de mensaje
  - Input de composer
  - Estados hover/active
  - Badges y metadatos

#### Components
```typescript
src/modules/comunication/UI/components/
└── ChatsPage.module.css      ✅ Estilos únicos
```

**Nota**: Los componentes están inline en ChatsPage (no separados en archivos individuales)

#### Hooks

##### ✅ `useChatRealtime.ts`
- Suscripción a thread específico
- Handlers para:
  - `onMessage` - Nuevos mensajes
  - `onTyping` - Indicador escribiendo
  - `onDelivered` - Mensaje entregado
- Cleanup automático al desmontar
- Manejo de errores

#### Contexts

##### ✅ `ChatProvider.tsx`
- Context para inyección de dependencias
- Inicializa `CommunicationContainer`
- Hook `useChatModule()` para acceder a:
  - Use cases
  - Realtime service

---

### 5. Dependency Injection Container (100% Completo)

**Archivo**: `src/modules/comunication/comunication.container.ts`

```typescript
export interface CommunicationUseCases {
  listListerInbox: ListListerInbox;
  listClientInbox: ListClientInbox;
  listMessages: ListMessages;
  sendMessage: SendMessage;
  markThreadAsRead: MarkThreadAsRead;
}

export interface CommunicationRealtime {
  subscribeToThread: SupabaseRealtimeChatService["subscribeToThread"];
  unsubscribe: SupabaseRealtimeChatService["unsubscribe"];
  broadcastTyping: SupabaseRealtimeChatService["broadcastTyping"];
}

export interface CommunicationContainer {
  useCases: CommunicationUseCases;
  realtime: CommunicationRealtime;
}
```

**Características:**
- ✅ Inyección de dependencias completa
- ✅ Permite override para testing (client, clock)
- ✅ Instancia todas las capas correctamente
- ✅ Expone use cases y realtime service

---

### 6. Base de Datos (100% Completo)

**Ubicación**: `database/migrations/0800_chat.sql`

#### Tablas Implementadas

##### ✅ `chat_threads`
```sql
- id (uuid, PK)
- org_id (uuid, FK → organizations)
- property_id (uuid, FK → properties, nullable)
- contact_id (uuid, FK → lead_contacts, nullable)
- created_by (uuid, FK → profiles, nullable)
- created_at (timestamptz)
- last_message_at (timestamptz, nullable)
```

##### ✅ `chat_participants`
```sql
- thread_id (uuid, FK → chat_threads)
- user_id (uuid, FK → profiles, nullable)
- contact_id (uuid, FK → lead_contacts, nullable)
- PK compuesta: (thread_id, user_id, contact_id)
```

##### ✅ `chat_messages`
```sql
- id (uuid, PK)
- thread_id (uuid, FK → chat_threads)
- sender_type (sender_type_enum)
- sender_user_id (uuid, FK → profiles, nullable)
- sender_contact_id (uuid, FK → lead_contacts, nullable)
- body (text, nullable)
- payload (jsonb, nullable)
- created_at (timestamptz)
- delivered_at (timestamptz, nullable)
- read_at (timestamptz, nullable)

INDEX: idx_chat_messages_thread_time (thread_id, created_at)
```

#### Enum
```sql
sender_type_enum: 'user' | 'contact' | 'system'
```

#### Políticas RLS
- ✅ Threads: Filtrado por org_id
- ✅ Participants: Heredan permisos del thread
- ✅ Messages: Heredan permisos del thread

**Ubicación**: `database/migrations/1610_rls_policies.sql`

---

## ❌ NO IMPLEMENTADO (30-40%)

### 1. ChatWidget para PropertyDetailPage ❌

**Prioridad**: 🔴 ALTA (Funcionalidad core)

**Archivos a crear:**
```
src/modules/comunication/UI/components/ChatWidget/
├── ChatWidget.tsx                 ❌ Componente principal
├── ChatWidget.module.css          ❌ Estilos
├── ChatWidgetButton.tsx           ❌ Botón flotante
├── ChatWidgetDialog.tsx           ❌ Diálogo con chat
├── LeadCaptureForm.tsx            ❌ Formulario para no auth
└── index.ts                       ❌ Exports
```

**Funcionalidades pendientes:**
- [ ] Botón flotante en PropertyDetailPage
- [ ] Detección de usuario autenticado vs. no autenticado
- [ ] LeadCaptureForm (nombre, email, teléfono, mensaje inicial)
- [ ] CreateOrGetLead use case
- [ ] FindOrCreateThread use case
- [ ] Integración con telemetry (trackFirstContact)
- [ ] Crear property_lead al primer contacto
- [ ] Vista de conversación inline en el widget

**Integración necesaria:**
```typescript
// En src/modules/properties/UI/pages/PropertyDetailPage/PropertyDetailPage.tsx
import { ChatWidget } from '../../../../comunication/UI/components/ChatWidget';

<ChatWidget 
  propertyId={id}
  propertyTitle={data?.property.title}
  ownerId={data?.property.listerUserId}
/>
```

---

### 2. Sistema de Notificaciones ❌

**Prioridad**: 🟡 MEDIA

**Use Cases a crear:**
```typescript
src/modules/comunication/application/use-cases/notifications/
├── SendMessageNotification.ts     ❌ Notificar nuevo mensaje
├── SendEmailNotification.ts       ❌ Email específico
└── EscalateToWhatsApp.ts         ❌ Escalación a WhatsApp
```

**Adapters a crear:**
```typescript
src/modules/comunication/infrastructure/adapters/
└── SupabaseNotificationService.ts ❌ Integración con messaging
```

**Funcionalidades pendientes:**
- [ ] Notificación por email al recibir mensaje
- [ ] Push notifications (si usuario online)
- [ ] Escalación a WhatsApp si no hay respuesta en 5 min
- [ ] Templates de email
- [ ] Integración con tabla `message_dispatches`
- [ ] Job para procesar cola de notificaciones

---

### 3. Indicador "Escribiendo..." en UI ❌

**Prioridad**: 🟢 BAJA (Nice to have)

**Hook a crear:**
```typescript
src/modules/comunication/UI/hooks/
└── useTypingIndicator.ts          ❌ Hook para typing
```

**Componente a crear:**
```typescript
src/modules/comunication/UI/components/
└── TypingIndicator/
    ├── TypingIndicator.tsx        ❌ Indicador visual
    └── TypingIndicator.module.css ❌ Estilos
```

**Funcionalidades pendientes:**
- [ ] Detectar tecleo en MessageInput
- [ ] Debounce de 500ms
- [ ] Broadcast vía Realtime
- [ ] Mostrar "Usuario está escribiendo..."
- [ ] Timeout de 3s para remover

**Nota**: El servicio `SupabaseRealtimeChatService` ya soporta `broadcastTyping()`.

---

### 4. Archivar Threads ❌

**Prioridad**: 🟡 MEDIA

**Use Case a crear:**
```typescript
src/modules/comunication/application/use-cases/threads/
└── ArchiveThread.ts               ❌ Archivar conversación
```

**Funcionalidades pendientes:**
- [ ] Use case para actualizar status a 'archived'
- [ ] Filtro en ListThreads para excluir archivados
- [ ] Botón de archivar en UI
- [ ] Vista de "Archivados" en inbox

**Cambio en BD:**
```sql
-- Ya existe el enum THREAD_STATUS con 'archived'
-- Solo falta implementar la lógica
```

---

### 5. Manejo de Mensajes Offline/Pending ❌

**Prioridad**: 🟡 MEDIA

**Hook a crear:**
```typescript
src/modules/comunication/UI/hooks/
└── usePendingMessages.ts          ❌ Queue de mensajes
```

**Funcionalidades pendientes:**
- [ ] Detectar pérdida de conexión
- [ ] Queue local en localStorage
- [ ] Mensajes optimistas en UI
- [ ] Retry automático al reconectar
- [ ] Indicador visual de "pendiente"
- [ ] Max 3 reintentos
- [ ] Notificar al usuario si falla definitivamente

---

### 6. Estados de Mensaje Avanzados ❌

**Prioridad**: 🟢 BAJA

**Use Cases a crear:**
```typescript
src/modules/comunication/application/use-cases/messages/
├── MarkAsDelivered.ts             ❌ Actualizar a delivered
└── MarkAsRead.ts                  ❌ Actualizar a read individual
```

**Hooks a crear:**
```typescript
src/modules/comunication/UI/hooks/
└── useMessageStatus.ts            ❌ Gestión de estados
```

**Componente a crear:**
```typescript
src/modules/comunication/UI/components/
└── MessageStatus/
    ├── MessageStatus.tsx          ❌ Checks de WhatsApp
    └── MessageStatus.module.css   ❌ Estilos
```

**Funcionalidades pendientes:**
- [ ] Intersection Observer para marcar como leído
- [ ] Actualizar delivered_at al cargar mensajes
- [ ] Actualizar read_at al ver mensaje
- [ ] Íconos de check (✓ sent, ✓✓ delivered, ✓✓ azul read)
- [ ] Realtime para propagar cambios al emisor

---

### 7. Testing ❌

**Prioridad**: 🔴 ALTA

**Tests a crear:**

#### Unit Tests (Domain)
```typescript
src/tests/domain/comunication/
├── ChatThread.test.ts             ❌ Tests de entidad
├── ChatMessage.test.ts            ❌ Tests de entidad
├── Participant.test.ts            ❌ Tests de entidad
└── MessageBody.test.ts            ❌ Tests de value object
```

#### Unit Tests (Application)
```typescript
src/tests/application/comunication/
├── SendMessage.test.ts            ❌ Tests de use case
├── ListMessages.test.ts           ❌ Tests de use case
├── ListListerInbox.test.ts        ❌ Tests de use case
└── MarkThreadAsRead.test.ts       ❌ Tests de use case
```

#### Integration Tests
```typescript
src/tests/integration/comunication/
├── SupabaseChatThreadRepo.test.ts ❌ Tests de repo
└── SupabaseChatMessageRepo.test.ts ❌ Tests de repo
```

#### E2E Tests
```typescript
src/tests/e2e/comunication/
├── chat-widget.spec.ts            ❌ Tests de widget
├── inbox.spec.ts                  ❌ Tests de inbox
└── realtime.spec.ts               ❌ Tests de tiempo real
```

#### Fakes para Testing
```typescript
src/modules/comunication/application/fakes/
├── FakeChatThreadRepo.ts          ❌ Mock de repo
├── FakeChatMessageRepo.ts         ❌ Mock de repo
└── FakeRealtimeService.ts         ❌ Mock de realtime
```

**Coverage objetivo**: >80%

---

### 8. Componentes UI Faltantes ❌

**Prioridad**: 🟡 MEDIA

#### Componentes a separar/crear:
```typescript
src/modules/comunication/UI/components/
├── MessageList/
│   ├── MessageList.tsx            ❌ Lista virtualizada
│   ├── MessageItem.tsx            ❌ Item individual
│   ├── MessageBubble.tsx          ❌ Burbuja de mensaje
│   └── MessageList.module.css     ❌ Estilos
├── MessageInput/
│   ├── MessageInput.tsx           ❌ Input con funciones
│   └── MessageInput.module.css    ❌ Estilos
├── ThreadList/
│   ├── ThreadList.tsx             ❌ Lista de threads
│   ├── ThreadListItem.tsx         ❌ Item de thread
│   └── ThreadList.module.css      ❌ Estilos
├── UnreadBadge/
│   ├── UnreadBadge.tsx            ❌ Badge contador
│   └── UnreadBadge.module.css     ❌ Estilos
└── ConnectionStatus/
    ├── ConnectionStatus.tsx       ❌ Estado de conexión
    └── ConnectionStatus.module.css ❌ Estilos
```

**Nota**: Actualmente todo está inline en `ChatsPage.tsx`. Se recomienda separar para reutilización.

---

### 9. Performance Optimizations ❌

**Prioridad**: 🟡 MEDIA

**Pendientes:**
- [ ] Virtualización con `react-window` para listas largas
- [ ] Lazy loading de mensajes antiguos (scroll infinito)
- [ ] Memoización de componentes pesados
- [ ] Debounce en búsqueda
- [ ] Throttle en scroll events
- [ ] Code splitting del módulo completo

---

### 10. Accesibilidad ❌

**Prioridad**: 🟢 BAJA

**Pendientes:**
- [ ] ARIA labels en todos los componentes
- [ ] Navegación por teclado
- [ ] Focus management en modales
- [ ] Screen reader announcements para nuevos mensajes
- [ ] Contraste de colores WCAG AA
- [ ] Tamaños de toque mínimos (44x44px)

---

## 🔧 MEJORAS TÉCNICAS RECOMENDADAS

### 1. Optimistic Updates
**Estado**: ❌ No implementado

Actualizar UI inmediatamente al enviar mensaje, antes de confirmar con el servidor:

```typescript
// En SendMessage hook
const handleSend = async (body: string) => {
  const optimisticMessage = {
    id: tempId,
    body,
    createdAt: new Date(),
    status: 'sending'
  };
  
  // Agregar a UI inmediatamente
  setMessages(prev => [...prev, optimisticMessage]);
  
  // Enviar a servidor
  const result = await sendMessage({ threadId, body });
  
  if (result.isOk()) {
    // Reemplazar con mensaje real
    setMessages(prev => prev.map(m => 
      m.id === tempId ? result.value : m
    ));
  } else {
    // Marcar como fallido
    setMessages(prev => prev.map(m =>
      m.id === tempId ? { ...m, status: 'failed' } : m
    ));
  }
};
```

### 2. React Query para Cache
**Estado**: ❌ No implementado

Considerar migrar de Context API a React Query para:
- Cache automático
- Refetch en background
- Invalidación inteligente
- Menos código boilerplate

### 3. Error Boundary
**Estado**: ❌ No implementado

Agregar Error Boundary para capturar errores en componentes:

```typescript
src/modules/comunication/UI/components/
└── ChatErrorBoundary.tsx          ❌ Error boundary
```

### 4. Logging y Monitoring
**Estado**: ❌ No implementado

- [ ] Integrar con servicio de logging (Sentry, LogRocket)
- [ ] Trackear errores de Realtime
- [ ] Métricas de latencia de mensajes
- [ ] Monitoreo de tasa de errores

---

## 📋 INTEGRACIÓN CON OTROS MÓDULOS

### ✅ Integración con Auth (Completo)
- Usa `SupabaseAuthService` compartido
- Obtiene userId, orgId, contactId
- Maneja sesión de Supabase

### ⚠️ Integración con Properties (Parcial)
- ✅ Relación FK en BD (property_id)
- ✅ Mostrar datos de propiedad en threads
- ❌ ChatWidget en PropertyDetailPage
- ❌ Botón "Contactar" conectado

### ❌ Integración con Telemetry (Faltante)
- ❌ Event `first_contact` al crear thread
- ❌ Event `message_sent`
- ❌ Event `message_read`
- ❌ Tracking de conversión

### ❌ Integración con Messaging (Faltante)
- ❌ Templates de email
- ❌ Cola de message_dispatches
- ❌ Integración con WhatsApp
- ❌ SMS notifications

### ⚠️ Integración con Lead Contacts (Parcial)
- ✅ Relación FK en BD (contact_id)
- ✅ Join en queries
- ❌ CreateOrGetLead use case
- ❌ UpdateLead use case
- ❌ Crear property_lead

---

## 🎯 PLAN DE TRABAJO ACTUALIZADO

### FASE 1: Completar Features Core (Semana 1-2) 🔴
**Prioridad**: ALTA

1. **ChatWidget en PropertyDetailPage** (3-4 días)
   - [ ] Componente ChatWidget
   - [ ] ChatWidgetButton flotante
   - [ ] ChatWidgetDialog
   - [ ] LeadCaptureForm
   - [ ] Use case: CreateOrGetLead
   - [ ] Use case: FindOrCreateThread
   - [ ] Integración en PropertyDetailPage
   - [ ] Crear property_lead al primer contacto

2. **Testing básico** (2-3 días)
   - [ ] Tests domain (ChatThread, ChatMessage)
   - [ ] Tests use cases (SendMessage, ListMessages)
   - [ ] Fakes para testing
   - [ ] Setup CI para tests

### FASE 2: Notificaciones (Semana 3) 🟡
**Prioridad**: MEDIA

3. **Sistema de Notificaciones** (4-5 días)
   - [ ] Use case: SendMessageNotification
   - [ ] Adapter: SupabaseNotificationService
   - [ ] Templates de email
   - [ ] Integración con message_dispatches
   - [ ] Tests de notificaciones

### FASE 3: Features Avanzadas (Semana 4) 🟢
**Prioridad**: BAJA

4. **Estados de Mensaje** (2 días)
   - [ ] Use case: MarkAsDelivered
   - [ ] Use case: MarkAsRead individual
   - [ ] Hook: useMessageStatus
   - [ ] Componente: MessageStatus
   - [ ] Intersection Observer

5. **Indicador "Escribiendo..."** (1 día)
   - [ ] Hook: useTypingIndicator
   - [ ] Componente: TypingIndicator
   - [ ] Integración en MessageInput

6. **Archivar Threads** (1 día)
   - [ ] Use case: ArchiveThread
   - [ ] Filtro en UI
   - [ ] Vista de archivados

### FASE 4: Performance y UX (Semana 5) 🟡
**Prioridad**: MEDIA

7. **Optimizaciones** (3 días)
   - [ ] Virtualización con react-window
   - [ ] Lazy loading de mensajes
   - [ ] Optimistic updates
   - [ ] Code splitting

8. **Manejo Offline** (2 días)
   - [ ] Hook: usePendingMessages
   - [ ] Queue en localStorage
   - [ ] Retry automático
   - [ ] Indicadores visuales

### FASE 5: Refinamiento (Semana 6) 🟢
**Prioridad**: BAJA

9. **Componentes Reutilizables** (2 días)
   - [ ] Separar componentes inline
   - [ ] MessageList virtualizado
   - [ ] MessageInput mejorado
   - [ ] ThreadListItem

10. **Accesibilidad** (2 días)
    - [ ] ARIA labels
    - [ ] Navegación por teclado
    - [ ] Screen reader support
    - [ ] Testing con axe-core

11. **Documentación** (1 día)
    - [ ] README del módulo
    - [ ] JSDoc en funciones públicas
    - [ ] Storybook para componentes

---

## 📈 MÉTRICAS DE PROGRESO

### Progreso por Capa
```
Domain Layer:        ████████████████████ 100%
Application Layer:   ████████████████░░░░  80%
Infrastructure:      ████████████████████ 100%
UI Layer:            ██████████████░░░░░░  70%
Testing:             ░░░░░░░░░░░░░░░░░░░░   0%
-------------------------------------------
TOTAL:               ████████████████░░░░  75%
```

### Progreso por Funcionalidad
```
Chat básico (inbox): ████████████████████ 100%
Realtime:            ████████████████████ 100%
Envío de mensajes:   ████████████████████ 100% ✅ (Bug resuelto)
ChatWidget:          ░░░░░░░░░░░░░░░░░░░░   0%
Notificaciones:      ░░░░░░░░░░░░░░░░░░░░   0%
Estados avanzados:   ████░░░░░░░░░░░░░░░░  20%
Testing:             ░░░░░░░░░░░░░░░░░░░░   0%
Performance:         ████░░░░░░░░░░░░░░░░  20%
Accesibilidad:       ░░░░░░░░░░░░░░░░░░░░   0%
```

### Use Cases Implementados: 5/12 (42%)
```
✅ ListListerInbox
✅ ListClientInbox  
✅ ListMessages
✅ SendMessage
✅ MarkThreadAsRead
❌ CreateOrGetLead
❌ FindOrCreateThread
❌ ArchiveThread
❌ MarkAsDelivered
❌ MarkAsRead
❌ SendMessageNotification
❌ EscalateToWhatsApp
```

---

## 🚀 SIGUIENTE PASO INMEDIATO

### Acción Prioritaria: ChatWidget

**Objetivo**: Permitir que usuarios contacten desde PropertyDetailPage

**Archivos a crear (en orden):**

1. `src/modules/comunication/application/use-cases/lead/CreateOrGetLead.ts`
2. `src/modules/comunication/application/use-cases/threads/FindOrCreateThread.ts`
3. `src/modules/comunication/UI/components/ChatWidget/LeadCaptureForm.tsx`
4. `src/modules/comunication/UI/components/ChatWidget/ChatWidgetDialog.tsx`
5. `src/modules/comunication/UI/components/ChatWidget/ChatWidgetButton.tsx`
6. `src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx`
7. Integración en `PropertyDetailPage.tsx`

**Estimado**: 3-4 días

**Resultado esperado**: 
- Usuario no autenticado puede iniciar chat ✅
- Se captura lead (nombre, email, teléfono) ✅
- Se crea thread automáticamente ✅
- Mensaje inicial se envía ✅
- Widget flotante funcional ✅

---

## 🔍 DEUDA TÉCNICA

### Alta Prioridad
1. **Falta de tests** - 0% coverage (CRÍTICO)
2. **ChatWidget no implementado** - Funcionalidad core faltante
3. **Sin manejo de errores en UI** - Faltan Error Boundaries

### Media Prioridad
4. **Componentes inline** - Dificulta reutilización y testing
5. **Sin optimistic updates** - UX subóptima
6. **Sin virtualización** - Performance en listas largas
7. **Notificaciones no implementadas** - Feature importante

### Baja Prioridad
8. **Sin accesibilidad** - No cumple WCAG
9. **Sin monitoring** - Difícil debuggear en producción
10. **Documentación limitada** - Solo análisis técnico

---

## 💡 NOTAS IMPORTANTES

### Decisiones de Arquitectura
- ✅ Clean Architecture implementada correctamente
- ✅ Separación de capas respetada
- ✅ Inversión de dependencias con Ports/Adapters
- ✅ Patrón Result<T,E> para manejo de errores
- ✅ DTOs para transferencia entre capas
- ✅ Dependency Injection Container

### Buenas Prácticas Observadas
- ✅ Value Objects para validación de negocio
- ✅ Entidades con comportamiento, no anémicas
- ✅ Use Cases con responsabilidad única
- ✅ Validación con Zod en Application Layer
- ✅ Mappers para transformaciones
- ✅ CSS Modules para estilos aislados

### Áreas de Mejora
- ❌ Falta separación de componentes UI
- ❌ Sin testing (0% coverage)
- ❌ Sin error handling robusto en UI
- ❌ Sin logging/monitoring
- ❌ Sin documentación en código

---

## 📚 REFERENCIAS

### Archivos Clave
- `src/modules/comunication/comunication.container.ts` - Punto de entrada
- `src/modules/comunication/UI/pages/ChatsPage.tsx` - UI principal
- `src/modules/comunication/domain/entities/ChatThread.ts` - Lógica de negocio
- `database/migrations/0800_chat.sql` - Schema de BD

### Documentación Existente
- `ANALISIS_TECNICO_CHAT_PARTE_1.md` - Arquitectura y estructura
- `ANALISIS_TECNICO_CHAT_PARTE_2_1.md` - Integración y flujos
- `ANALISIS_TECNICO_CHAT_PARTE_2_2.md` - Estados y testing

---

**Última actualización**: 12 de Noviembre, 2025  
**Estado**: En desarrollo activo (75% completo)  
**Branch**: feature/chats-integration  
**Último cambio**: Bug crítico de envío de mensajes resuelto (doble envoltura UniqueEntityID)
