# 📋 TAREAS PENDIENTES - Módulo de Chat NOVALIA

**Última actualización:** 11 de Noviembre, 2025  
**Progreso:** 55% Completado ✅ | 45% Pendiente 🔴

---

## ✅ LO QUE YA ESTÁ HECHO

- ✅ **Backend completo (100%)**
  - Domain Layer (entidades, value objects, enums)
  - Application Layer (DTOs, ports, use cases)
  - Infrastructure Layer (repositorios Supabase + Realtime Service)
  - Container con DI configurado
  
- ✅ **Configuración de BD (100%)**
  - Tablas creadas (chat_threads, chat_messages, chat_participants)
  - Realtime habilitado en Supabase
  - RLS policies para usuarios autenticados

---

## 🔴 LO QUE FALTA POR IMPLEMENTAR

### ✅ **FASE 6: Context & Hooks** (2 días) - COMPLETADO 100%

#### Archivos a Crear:

```
src/modules/comunication/UI/
├── context/
│   ├── ChatContext.tsx              # Context con state global
│   ├── ChatProvider.tsx             # Provider que envuelve la app
│   └── index.ts
├── hooks/
│   ├── useChatContext.ts            # Hook para acceder al context
│   ├── useInbox.ts                  # Hook para listar threads
│   ├── useThread.ts                 # Hook para thread actual
│   ├── useMessages.ts               # Hook para mensajes de un thread
│   ├── useSendMessage.ts            # Hook para enviar mensajes
│   ├── useRealtime.ts               # Hook para WebSocket subscriptions
│   └── index.ts
└── index.ts
```

#### Tareas Específicas:

✅ **COMPLETADO:**

1. ✅ **ChatContext.tsx + ChatProvider.tsx**
   - Context con container integration
   - Provider envolviendo la app
   - useChatModule hook para acceder al container

2. ✅ **useInbox.ts**
   - Soporte para role: 'seller' | 'buyer'
   - listListerInbox con grupos por propiedad
   - listClientInbox con thread único
   - Búsqueda integrada
   - Error handling completo

3. ✅ **useMessages.ts**
   - Paginación con hasMore
   - Auto-scroll a nuevos mensajes
   - markThreadAsRead automático
   - Typing indicator support
   - Error handling

4. ✅ **useSendMessage.ts**
   - Envío de mensajes con callbacks
   - Estados: sending, error
   - onSuccess/onError handlers
   - Validación de threadId y body

5. ✅ **ChatsPage.tsx**
   - Vista con grupos colapsables por propiedad
   - Pestañas de filtro (Todos/No leídos/Respondidos)
   - Búsqueda en tiempo real
   - Selección de threads
   - Área de mensajes integrada
   - Composer para enviar mensajes

⚠️ **PENDIENTE:**
- useRealtime.ts - Integración WebSocket en UI (backend listo)

---

### **FASE 7: Componentes Base** (2 días) - 🔴 PRIORIDAD P0

#### Archivos a Crear:

```
src/modules/comunication/UI/components/
├── MessageBubble/
│   ├── MessageBubble.tsx            # Burbuja de mensaje individual
│   ├── MessageBubble.module.css
│   └── index.ts
├── MessageList/
│   ├── MessageList.tsx              # Lista de mensajes (con virtualización)
│   ├── MessageList.module.css
│   └── index.ts
├── MessageInput/
│   ├── MessageInput.tsx             # Input para escribir mensajes
│   ├── MessageInput.module.css
│   └── index.ts
├── ThreadListItem/
│   ├── ThreadListItem.tsx           # Item de lista de conversaciones
│   ├── ThreadListItem.module.css
│   └── index.ts
└── TypingIndicator/
    ├── TypingIndicator.tsx          # Indicador "escribiendo..."
    └── index.ts
```

#### Tareas Específicas:

1. **MessageBubble.tsx**
   - Props: message, isMine (boolean)
   - Estilos diferentes para mensajes propios vs recibidos
   - Mostrar timestamp con date-fns (format: "HH:mm")
   - Mostrar estados: ✓ (sent), ✓✓ (delivered), ✓✓ (read en azul)
   - Soporte para mensajes del sistema (centrados)

2. **MessageList.tsx**
   - Usar react-window para virtualización
   - Props: messages[], loading, onLoadMore
   - Auto-scroll a último mensaje cuando llega nuevo
   - Botón "Scroll to bottom" si usuario scrolleó arriba
   - Separadores de fecha ("Hoy", "Ayer", etc.)
   - Infinite scroll hacia arriba (load more old messages)

3. **MessageInput.tsx**
   - Textarea con auto-expand (max 4 líneas)
   - Botón enviar (deshabilitado si vacío)
   - Enter para enviar, Shift+Enter para nueva línea
   - Mostrar "escribiendo..." a otros usuarios (broadcast)
   - Deshabilitar mientras envía mensaje
   - Emoji picker (opcional, puede ser fase posterior)

4. **ThreadListItem.tsx**
   - Props: thread (ThreadDTO)
   - Mostrar avatar del contacto/usuario
   - Nombre del contacto
   - Preview del último mensaje (max 60 chars)
   - Timestamp del último mensaje
   - Badge con contador de mensajes sin leer
   - Estado: activo (selected) vs inactivo
   - Info de la propiedad (título, precio)

5. **TypingIndicator.tsx**
   - Animación de 3 puntos
   - Mostrar "Fulanito está escribiendo..."
   - Auto-hide después de 3 segundos sin actividad

**Estimación:** 2 días

---

### **FASE 8: ChatWidget** (2 días) - 🟡 PRIORIDAD P1

#### Archivos a Crear:

```
src/modules/comunication/UI/components/ChatWidget/
├── ChatWidget.tsx                   # Componente principal
├── ChatWidget.module.css
├── ChatButton.tsx                   # Botón flotante
├── AuthRequired.tsx                 # Mensaje si no autenticado
└── index.ts
```

#### Tareas Específicas:

1. **ChatButton.tsx**
   - Botón flotante fixed bottom-right
   - Icono de mensaje/chat
   - Badge con contador de mensajes sin leer
   - onClick → abrir ChatWidget
   - Responsive (móvil: full screen, desktop: drawer)

2. **AuthRequired.tsx**
   - Mensaje: "Inicia sesión para contactar al vendedor"
   - Botón "Iniciar Sesión" → redirige a /login con returnUrl
   - Botón "Registrarse" → redirige a /register
   - Diseño atractivo con iconos

3. **ChatWidget.tsx**
   - Props: propertyId, listerId
   - Verificar si usuario autenticado
   - Si NO autenticado → mostrar AuthRequired
   - Si autenticado:
     - Obtener o crear thread (findOrCreate)
     - Mostrar header con info de la propiedad
     - Usar MessageList component
     - Usar MessageInput component
     - Integrar useMessages hook
     - Integrar useSendMessage hook
     - Integrar useRealtime hook
   - Modal/Drawer con animaciones
   - Botón cerrar
   - Loading states

4. **Integración en PropertyDetailPage.tsx**
   ```typescript
   import { ChatWidget } from '@/modules/comunication/UI';
   
   // Dentro del componente:
   <ChatWidget 
     propertyId={property.id}
     listerId={property.lister_user_id}
   />
   ```

**Estimación:** 2 días

---

### **FASE 9: ChatInboxPage** (2 días) - 🟢 PRIORIDAD P2

#### Archivos a Crear:

```
src/modules/comunication/UI/pages/ChatInboxPage/
├── ChatInboxPage.tsx                # Layout principal
├── ChatInboxPage.module.css
├── ThreadList.tsx                   # Sidebar con lista de threads
├── ThreadDetail.tsx                 # Área central con mensajes
├── ProspectInfoPanel.tsx            # Panel derecho con info del lead
└── index.ts
```

#### Tareas Específicas:

1. **ChatInboxPage.tsx**
   - Layout de 3 columnas (opcional: 2 en móvil)
   - Columna izquierda: ThreadList (30%)
   - Columna central: ThreadDetail (45%)
   - Columna derecha: ProspectInfoPanel (25%)
   - Header con título "Mensajes" y búsqueda
   - Filtros: Todos / Sin leer / Archivados
   - Estado: sin thread seleccionado → mensaje placeholder

2. **ThreadList.tsx**
   - Usar useInbox hook
   - Renderizar lista de ThreadListItem
   - Infinite scroll con react-intersection-observer
   - Búsqueda en tiempo real (filtrar por nombre/propiedad)
   - Indicar thread seleccionado
   - Loading skeleton

3. **ThreadDetail.tsx**
   - Header con info del prospecto y propiedad
   - Usar MessageList component
   - Usar MessageInput component
   - Usar useRealtime hook
   - Botón "Marcar como leído"
   - Botón "Archivar conversación"
   - Actions: Agendar visita, Ver propiedad

4. **ProspectInfoPanel.tsx**
   - Avatar y nombre del prospecto
   - Email y teléfono
   - Información de la propiedad:
     - Imagen cover
     - Título
     - Precio
     - Dirección
   - Lead score (si está implementado)
   - Botones de acción:
     - Llamar
     - Email
     - WhatsApp (si disponible)

5. **Agregar ruta en routes.tsx**
   ```typescript
   {
     path: '/inbox',
     element: <ChatInboxPage />,
     guard: <AuthGuard />
   }
   ```

6. **Agregar link en navegación**
   - NavBar: Icono de mensajes
   - Badge con contador de mensajes sin leer

**Estimación:** 2 días

---

### **FASE 10: Realtime UI** (1 día) - 🟡 PRIORIDAD P1

#### Tareas:

1. **Auto-scroll en mensajes nuevos**
   - En MessageList, detectar nuevo mensaje
   - Scroll smooth al bottom
   - Si usuario scrolleó arriba, mostrar botón "Nuevo mensaje"

2. **Notificaciones in-app**
   - Cuando llega mensaje y usuario NO está en ese thread
   - Toast notification con preview
   - Click → abrir thread

3. **Badge contador**
   - En ChatButton
   - En NavBar link a /inbox
   - Actualizar en tiempo real con WebSocket

4. **Indicador "escribiendo..."**
   - En ChatWidget header
   - En ThreadList item
   - Broadcast cuando usuario tipea
   - Timeout después de 3 segundos sin actividad

5. **Manejo de reconexión**
   - Detectar desconexión de WebSocket
   - Mostrar banner "Reconectando..."
   - Re-subscribe automáticamente

**Estimación:** 1 día

---

### **FASE 11: Features Avanzadas** (Opcional - 3+ días) - 🔵 PRIORIDAD P3

#### Features Opcionales:

1. **Escalación WhatsApp**
   - Si agente no responde en 5 min → enviar a WhatsApp
   - Tabla `jobs` para queue
   - Cron job para procesar

2. **Notificaciones Email/SMS**
   - Plantillas transaccionales
   - Twilio/SendGrid integration
   - Preferencias de usuario

3. **Archivo de conversaciones**
   - Marcar thread como archivado
   - Filtro "Archivados" en inbox

4. **Búsqueda avanzada**
   - Full-text search en mensajes
   - Filtros por fecha, propiedad, etc.

5. **Lead scoring**
   - Algorithm en panel lateral
   - Priorizar prospectos calientes

6. **Agendar visitas**
   - Botón en chat → modal calendario
   - Integración con módulo de visitas

**Estimación:** 3-5 días (según features seleccionadas)

---

### **FASE 12: Testing & Polish** (Opcional - 2 días) - 🔵 PRIORIDAD P3

1. **Tests unitarios**
   - Hooks (useSendMessage, useMessages)
   - Componentes (MessageBubble, MessageInput)

2. **Tests E2E**
   - Flujo completo: abrir chat → enviar mensaje → recibir respuesta
   - Flujo inbox: ver conversaciones → abrir thread → responder

3. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - ARIA labels

4. **Performance**
   - Lazy loading de componentes
   - Memoization con React.memo
   - Optimizar re-renders

**Estimación:** 2 días

---

## 🎯 RESUMEN DE PRIORIDADES

### **Para MVP Básico (3-4 días restantes):**
1. ✅ Context & Hooks (COMPLETADO)
2. ✅ ChatsPage básico (COMPLETADO)
3. ❌ Componentes Base (2 días)
4. ❌ ChatWidget (2 días)

**Resultado:** Chat funcional en PropertyDetailPage y /chats

---

### **Para Sistema Completo (10-12 días):**
1. ✅ MVP Básico (5-6 días)
2. ✅ ChatInboxPage (2 días)
3. ✅ Realtime UI (1 día)
4. ✅ Polish (1-2 días)

**Resultado:** Sistema completo tipo WhatsApp Web

---

### **Para Sistema Premium (15+ días):**
1. ✅ Sistema Completo (10-12 días)
2. ✅ Features Avanzadas (3-5 días)
3. ✅ Testing & Docs (2 días)

**Resultado:** Plataforma de comunicación empresarial

---

## 📦 DEPENDENCIAS NECESARIAS

Verificar que estén instaladas:

```bash
npm list react-window
npm list react-intersection-observer
npm list date-fns
```

Si faltan:

```bash
npm install react-window react-intersection-observer date-fns
npm install --save-dev @types/react-window
```

---

## 🚀 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

```
DÍA 1-2:  FASE 6  → Context & Hooks
DÍA 3-4:  FASE 7  → Componentes Base  
DÍA 5-6:  FASE 8  → ChatWidget + Integración
          ↓
          🎉 MVP FUNCIONAL
          ↓
DÍA 7-8:  FASE 9  → ChatInboxPage
DÍA 9:    FASE 10 → Realtime UI
DÍA 10:   POLISH  → Bug fixes, UX improvements
          ↓
          🎉 SISTEMA COMPLETO
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 6: Context & Hooks
- [x] ✅ ChatContext.tsx creado
- [x] ✅ ChatProvider.tsx creado
- [x] ✅ useChatModule.ts (useChatContext)
- [x] ✅ useInbox.ts - Con seller/buyer modes
- [x] ✅ useMessages.ts - Con paginación y auto-scroll
- [x] ✅ useSendMessage.ts - Con callbacks
- [ ] ⚠️ useRealtime.ts - Pendiente integración UI
- [x] ✅ Exportar todo en index.ts
- [x] ✅ ChatsPage.tsx implementado con hooks

### Fase 7: Componentes Base
- [ ] MessageBubble component
- [ ] MessageList component (con virtualización)
- [ ] MessageInput component
- [ ] ThreadListItem component
- [ ] TypingIndicator component
- [ ] Styles (CSS modules)
- [ ] Tests básicos

### Fase 8: ChatWidget
- [ ] ChatButton component
- [ ] AuthRequired component
- [ ] ChatWidget component principal
- [ ] Integración en PropertyDetailPage
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

### Fase 9: ChatInboxPage
- [ ] Layout principal (3 columnas)
- [ ] ThreadList component
- [ ] ThreadDetail component
- [ ] ProspectInfoPanel component
- [ ] Filtros (todos/sin leer/archivados)
- [ ] Búsqueda en threads
- [ ] Ruta /inbox en routes.tsx
- [ ] Link en navegación

### Fase 10: Realtime UI
- [ ] Auto-scroll nuevos mensajes
- [ ] Notificaciones in-app
- [ ] Badge contador actualizado
- [ ] Indicador "escribiendo..."
- [ ] Manejo de reconexión

---

**🎯 OBJETIVO:** Sistema de chat completo en 10-12 días laborables

**📧 Contacto:** Para dudas sobre implementación, referirse al análisis técnico completo