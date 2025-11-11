# ANÁLISIS TÉCNICO PARA IMPLEMENTACIÓN DE MÓDULO DE CHAT EN TIEMPO REAL - PARTE 2.1

**Fecha**: 11 de Noviembre, 2025  
**Proyecto**: Novalia  
**Módulo**: HU-07 - Comunicación en tiempo real  
**Branch**: feature/chat-integration

---

## 6. INTEGRACIÓN CON MÓDULOS EXISTENTES

### a) **Integración con el módulo de Properties**

#### **1. En PropertyDetailPage**

**Ubicación**: `src/modules/properties/UI/pages/PropertyDetailPage/PropertyDetailPage.tsx`

**Modificación necesaria**:

```typescript
// Importar el ChatWidget
import { ChatWidget } from '../../../../chat/UI/components/ChatWidget';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = usePropertyDetail(id);
  
  // ... código existente ...

  return (
    <div className={styles.page}>
      {/* ... contenido existente ... */}
      
      {/* Agregar ChatWidget flotante */}
      {id && data?.property && (
        <ChatWidget 
          propertyId={id}
          propertyTitle={data.property.title}
          ownerId={data.property.listerUserId}
        />
      )}
      
      {/* ... resto del contenido ... */}
    </div>
  );
}
```

**Botón "Contactar" existente** (línea 340 aprox):

```typescript
// Reemplazar el handleContact actual
const handleContact = () => {
  // Abrir el ChatWidget en lugar de console.log
  // El ChatWidget se comunicará vía evento o ref
  document.dispatchEvent(new CustomEvent('openChatWidget'));
};
```

O mejor, usar un hook compartido:

```typescript
// Nuevo hook: src/modules/chat/UI/hooks/useChatWidget.ts
export function useChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  
  const openWidget = useCallback(() => setIsOpen(true), []);
  const closeWidget = useCallback(() => setIsOpen(false), []);
  
  return { isOpen, openWidget, closeWidget };
}

// En PropertyDetailPage:
import { useChatWidget } from '../../../../chat/UI/hooks/useChatWidget';

const { isOpen, openWidget, closeWidget } = useChatWidget();

const handleContact = () => {
  openWidget();
};

// Pasar props al ChatWidget
<ChatWidget 
  propertyId={id}
  isOpen={isOpen}
  onClose={closeWidget}
/>
```

#### **2. Tracking de eventos (integración con telemetry)**

**Cuando se inicia un chat, registrar evento**:

```typescript
// En SendMessage use case o en ChatWidget
import { supabase } from '../../../../core/supabase/client';

// Al enviar el PRIMER mensaje de un thread
const trackFirstContact = async (propertyId: string, userId: string) => {
  await supabase.from('events').insert({
    session_id: sessionId, // obtener de contexto
    user_id: userId,
    property_id: propertyId,
    event_type: 'first_contact',
    payload: {
      source: 'chat_widget',
      thread_id: threadId
    },
    occurred_at: new Date().toISOString()
  });
};
```

O mejor, usar el hook existente:

```typescript
// En ChatWidget.tsx
import { useTelemetry } from '../../../telemetry/UI/hooks/useTelemetry';

const { trackFirstContact } = useTelemetry();

const handleFirstMessage = async () => {
  await trackFirstContact(propertyId, { 
    source: 'chat_widget',
    thread_id: threadId 
  });
};
```

#### **3. Relación Property ↔ Thread**

**Consulta para obtener thread existente**:

```typescript
// En SupabaseChatThreadRepo.ts
async findByPropertyAndContact(
  propertyId: string, 
  contactId: string | null,
  userId: string | null
): Promise<Result<ThreadDTO | null>> {
  const query = this.client
    .from('chat_threads')
    .select('*')
    .eq('property_id', propertyId);
  
  if (contactId) {
    query.eq('contact_id', contactId);
  } else if (userId) {
    // Buscar thread donde el userId esté en participants
    query.in('id', 
      this.client
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', userId)
    );
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) return Result.fail(mapError(error));
  if (!data) return Result.ok(null);
  
  return Result.ok(mapThreadRowToDTO(data));
}
```

**Flujo en CreateThread use case**:

```typescript
export class CreateThread {
  async execute(input: CreateThreadInput): Promise<Result<ThreadDTO>> {
    // 1. Validar input
    const parsed = parseWith(createThreadSchema, input);
    if (parsed.isErr()) return Result.fail(parsed.error);
    
    // 2. Verificar si ya existe thread para esta propiedad + usuario/contacto
    const existingResult = await this.deps.threadRepo.findByPropertyAndContact(
      input.propertyId,
      input.contactId ?? null,
      input.userId ?? null
    );
    
    if (existingResult.isErr()) return existingResult;
    if (existingResult.value) {
      // Thread ya existe, retornarlo
      return Result.ok(existingResult.value);
    }
    
    // 3. Crear nuevo thread
    // 4. Agregar participantes
    // 5. Retornar thread creado
  }
}
```

### b) **Integración con el módulo de Auth**

#### **1. Obtener usuario autenticado**

**Reutilizar AuthService existente**:

```typescript
// El módulo properties ya tiene un AuthService en application/ports/
// Reutilizarlo en el módulo de chat

// En chat.container.ts
import { SupabaseAuthService } from '../properties/infrastructure/adapters/SupabaseAuthService';

export function createChatContainer(deps = {}) {
  const client = deps.client ?? supabase;
  
  // Reutilizar el mismo AuthService
  const auth = new SupabaseAuthService({ client });
  
  const threadRepo = new SupabaseChatThreadRepo({ client, auth });
  // ...
}
```

O crear uno específico para chat si necesitas lógica adicional:

```typescript
// src/modules/chat/infrastructure/adapters/SupabaseChatAuthService.ts
import type { AuthService } from '../../application/ports/AuthService';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseChatAuthService implements AuthService {
  constructor(private client: SupabaseClient) {}
  
  async getCurrent(): Promise<Result<ChatAuthProfile>> {
    const { data: { user }, error } = await this.client.auth.getUser();
    
    if (error || !user) {
      return Result.fail({ code: 'AUTH', message: 'Not authenticated' });
    }
    
    // Obtener perfil completo
    const { data: profile } = await this.client
      .from('profiles')
      .select('id, org_id, full_name, email, phone')
      .eq('id', user.id)
      .single();
    
    return Result.ok({
      userId: user.id,
      orgId: profile?.org_id ?? user.id,
      fullName: profile?.full_name,
      email: profile?.email ?? user.email,
      phone: profile?.phone
    });
  }
  
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await this.client.auth.getSession();
    return session !== null;
  }
}
```

#### **2. Guard para rutas protegidas**

**ChatInboxPage debe estar protegida**:

```typescript
// En src/app/routes.tsx
import ChatInboxPage from "../modules/chat/UI/pages/ChatInboxPage";

export const router = createBrowserRouter([
  {
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      // ... rutas existentes ...
      { path: "/inbox", element: <ChatInboxPage /> },
      { path: "/chat/:threadId", element: <ChatInboxPage /> }, // Opcional: vista directa de thread
    ],
  },
  // ... resto de rutas ...
]);
```

### c) **Integración con Lead Contacts**

#### **1. Creación/obtención de lead contact**

**Use case**: `CreateOrGetLead.ts`

```typescript
export class CreateOrGetLead {
  constructor(private deps: { leadRepo: LeadContactRepo }) {}
  
  async execute(input: LeadCaptureInput): Promise<Result<LeadDTO>> {
    // 1. Validar input
    const parsed = parseWith(leadCaptureSchema, input);
    if (parsed.isErr()) return Result.fail(parsed.error);
    
    // 2. Buscar lead existente por email o teléfono
    let leadResult: Result<LeadDTO | null>;
    
    if (parsed.value.email) {
      leadResult = await this.deps.leadRepo.findByEmail(parsed.value.email);
    } else if (parsed.value.phone) {
      leadResult = await this.deps.leadRepo.findByPhone(parsed.value.phone);
    } else {
      return Result.fail({ message: 'Email or phone required' });
    }
    
    if (leadResult.isErr()) return leadResult;
    
    // 3. Si existe, actualizar información si es necesario
    if (leadResult.value) {
      const updated = await this.deps.leadRepo.update(
        leadResult.value.id, 
        parsed.value
      );
      return updated.isErr() ? updated : Result.ok(leadResult.value);
    }
    
    // 4. Si no existe, crear nuevo lead
    const createResult = await this.deps.leadRepo.create({
      fullName: parsed.value.fullName,
      email: parsed.value.email ?? null,
      phone: parsed.value.phone ?? null
    });
    
    return createResult;
  }
}
```

#### **2. Creación de property_lead**

**Cuando un lead contacta por primera vez sobre una propiedad**:

```typescript
// En CreateThread o SendMessage
const createPropertyLead = async (input: {
  orgId: string;
  propertyId: string;
  contactId: string;
  firstEventId?: string;
}) => {
  await this.client
    .from('property_leads')
    .insert({
      org_id: input.orgId,
      property_id: input.propertyId,
      contact_id: input.contactId,
      first_event_id: input.firstEventId,
      status: 'open',
      created_at: new Date().toISOString()
    });
};
```

### d) **Integración con Notificaciones (Messaging)**

El proyecto ya tiene tablas `message_templates` y `message_dispatches` (en `0900_messaging.sql`).

#### **1. Enviar notificación cuando llega un mensaje**

**Use case**: `SendMessageNotification.ts`

```typescript
export class SendMessageNotification {
  constructor(private deps: { 
    notificationService: NotificationService;
    threadRepo: ChatThreadRepo;
  }) {}
  
  async execute(input: {
    messageId: string;
    threadId: string;
    senderId: string;
    recipientIds: string[];
  }): Promise<Result<void>> {
    // 1. Obtener info del thread
    const threadResult = await this.deps.threadRepo.getById(input.threadId);
    if (threadResult.isErr()) return threadResult;
    
    const thread = threadResult.value;
    
    // 2. Para cada destinatario, enviar notificación
    for (const recipientId of input.recipientIds) {
      // Obtener preferencias del usuario
      const preferences = await this.getUserNotificationPreferences(recipientId);
      
      // Enviar según canales habilitados
      if (preferences.email) {
        await this.deps.notificationService.sendEmail({
          to: recipientId,
          template: 'new_chat_message',
          data: {
            senderName: thread.senderName,
            propertyTitle: thread.propertyTitle,
            messagePreview: input.messagePreview,
            threadUrl: `${baseUrl}/inbox?thread=${input.threadId}`
          }
        });
      }
      
      if (preferences.push) {
        await this.deps.notificationService.sendPush({
          userId: recipientId,
          title: `Nuevo mensaje de ${thread.senderName}`,
          body: input.messagePreview,
          data: { threadId: input.threadId }
        });
      }
    }
    
    return Result.ok(undefined);
  }
}
```

#### **2. Implementación del NotificationService**

```typescript
// infrastructure/adapters/SupabaseNotificationService.ts
export class SupabaseNotificationService implements NotificationService {
  constructor(private client: SupabaseClient) {}
  
  async sendEmail(params: EmailParams): Promise<Result<void>> {
    const { error } = await this.client
      .from('message_dispatches')
      .insert({
        org_id: params.orgId,
        template_id: await this.getTemplateId(params.template),
        channel: 'email',
        to_address: params.to,
        payload: params.data,
        status: 'queued',
        attempts: 0,
        created_at: new Date().toISOString()
      });
    
    if (error) return Result.fail(mapError(error));
    return Result.ok(undefined);
  }
  
  async sendSMS(params: SMSParams): Promise<Result<void>> {
    // Similar implementación para SMS
  }
  
  async sendWhatsApp(params: WhatsAppParams): Promise<Result<void>> {
    // Similar implementación para WhatsApp
  }
}
```

#### **3. Escalación automática a WhatsApp**

**Implementar como scheduled job o trigger**:

```typescript
// Use case: EscalateToWhatsApp.ts
export class EscalateToWhatsApp {
  async execute(input: { threadId: string }): Promise<Result<void>> {
    // 1. Verificar que hayan pasado 5 minutos desde el último mensaje del lead
    const thread = await this.deps.threadRepo.getById(input.threadId);
    if (thread.isErr()) return thread;
    
    const lastMessage = thread.value.lastMessage;
    const minutesSinceLastMessage = 
      (Date.now() - new Date(lastMessage.createdAt).getTime()) / 1000 / 60;
    
    if (minutesSinceLastMessage < 5) {
      return Result.ok(undefined); // Aún no se debe escalar
    }
    
    // 2. Verificar que no haya respuesta del agente
    const agentReplied = await this.hasAgentReplied(input.threadId, lastMessage.createdAt);
    if (agentReplied) {
      return Result.ok(undefined); // El agente ya respondió
    }
    
    // 3. Enviar mensaje de WhatsApp
    const lead = await this.getLeadContact(thread.value.contactId);
    if (!lead.phone) {
      return Result.fail({ message: 'Lead has no phone number' });
    }
    
    await this.deps.notificationService.sendWhatsApp({
      to: lead.phone,
      template: 'chat_escalation',
      data: {
        leadName: lead.fullName,
        propertyTitle: thread.value.propertyTitle,
        agentName: thread.value.agentName,
        agentPhone: thread.value.agentPhone
      }
    });
    
    // 4. Marcar thread como escalado
    await this.deps.threadRepo.update(input.threadId, {
      metadata: { escalatedToWhatsApp: true, escalatedAt: new Date() }
    });
    
    return Result.ok(undefined);
  }
}
```

**Trigger en la base de datos** (alternativa):

```sql
-- database/migrations/2970_chat_escalation_trigger.sql
CREATE OR REPLACE FUNCTION check_chat_escalation()
RETURNS trigger AS $$
BEGIN
  -- Si es un mensaje de un contact (lead)
  IF NEW.sender_type = 'contact' THEN
    -- Programar job para revisar si escalar en 5 minutos
    PERFORM pg_notify(
      'chat_escalation_check',
      json_build_object(
        'thread_id', NEW.thread_id,
        'check_at', (NOW() + INTERVAL '5 minutes')::text
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_escalation_check
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION check_chat_escalation();
```

---

## 7. DEPENDENCIAS Y CONFIGURACIÓN

### a) **Dependencias npm a instalar**

```bash
# 1. Realtime/WebSockets (ya incluido en @supabase/supabase-js)
# No se necesita instalar nada adicional

# 2. Virtualización de listas (para MessageList con muchos mensajes)
npm install react-window

# 3. Tipos para react-window
npm install --save-dev @types/react-window

# 4. Detección de intersección para scroll infinito (opcional)
npm install react-intersection-observer

# 5. Manejo de estado (opcional, si decides usar Zustand en lugar de Context)
npm install zustand

# 6. Formateo de fechas relativas (opcional, puedes implementar manualmente)
npm install date-fns

# 7. Validación (ya instalado: zod@4.1.12)
# No se necesita instalar

# 8. Testing (ya instalado: vitest, @testing-library/react)
# No se necesita instalar
```

**Comando único de instalación**:

```powershell
npm install react-window react-intersection-observer date-fns
npm install --save-dev @types/react-window
```

**Opcional (si usas Zustand para estado global del chat)**:

```powershell
npm install zustand
```

### b) **Configuración de TypeScript**

No se requieren cambios en `tsconfig.json`, ya está configurado correctamente con:
- `"strict": true`
- `"moduleResolution": "bundler"`
- `"jsx": "react-jsx"`

### c) **Configuración de Supabase Realtime**

#### **1. Habilitar Realtime en las tablas (Dashboard de Supabase)**

1. Ir a **Database → Replication**
2. Agregar las tablas a la publicación `supabase_realtime`:
   - `chat_threads`
   - `chat_messages`
   - `chat_participants`

O ejecutar SQL:

```sql
-- Habilitar replicación para las tablas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
```

#### **2. Configurar RLS para acceso anónimo de leads**

**Problema**: Leads NO autenticados necesitan escribir mensajes.

**Solución**: Crear política especial para `chat_messages`:

```sql
-- database/migrations/2980_chat_rls_for_leads.sql

-- Permitir INSERT a usuarios no autenticados si el thread permite leads
CREATE POLICY messages_lead_insert ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'contact' 
  AND sender_contact_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = thread_id
    AND t.contact_id = sender_contact_id
  )
);

-- Permitir SELECT a usuarios no autenticados si son participantes del thread
CREATE POLICY messages_lead_select ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants p
    WHERE p.thread_id = chat_messages.thread_id
    AND p.contact_id IS NOT NULL
    AND (
      auth.uid() IS NULL -- Usuario no autenticado
      OR p.contact_id IN (
        SELECT id FROM public.lead_contacts
        WHERE email = auth.jwt()->>'email' -- Match por email si disponible
      )
    )
  )
);
```

**Alternativa más segura**: Usar una función serverless (Edge Function) para crear threads y enviar mensajes de leads:

```typescript
// supabase/functions/chat-lead-message/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { threadId, body, leadEmail, leadName } = await req.json();
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Bypass RLS
  );
  
  // 1. Validar que el lead esté autorizado para este thread
  const { data: thread } = await supabaseClient
    .from('chat_threads')
    .select('contact_id, lead_contacts!inner(email)')
    .eq('id', threadId)
    .single();
  
  if (thread?.lead_contacts?.email !== leadEmail) {
    return new Response('Unauthorized', { status: 403 });
  }
  
  // 2. Insertar mensaje
  const { data: message, error } = await supabaseClient
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      sender_type: 'contact',
      sender_contact_id: thread.contact_id,
      body,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(message), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### d) **Variables de entorno**

Agregar a `.env` (si es necesario):

```bash
# Chat Configuration
VITE_CHAT_MESSAGE_MAX_LENGTH=5000
VITE_CHAT_TYPING_TIMEOUT_MS=3000
VITE_CHAT_ESCALATION_TIMEOUT_MIN=5
VITE_CHAT_ENABLE_WHATSAPP_ESCALATION=true

# Notification URLs
VITE_APP_BASE_URL=https://novalia.com
```

---

## 8. FLUJOS DE DATOS DETALLADOS

### a) **Flujo: Inicio de chat desde PropertyDetailPage (Usuario NO autenticado)**

```
1. Usuario hace clic en botón "Contactar"
   ↓
2. ChatWidget detecta que NO hay sesión (useAuth() → null)
   ↓
3. Renderiza LeadCaptureForm en el dialog
   ↓
4. Usuario completa formulario:
   - Nombre completo
   - Email
   - Teléfono
   - (Opcional) Mensaje inicial
   ↓
5. Al submit del formulario:
   
   a) Llamar a CreateOrGetLead.execute({ fullName, email, phone })
      → Retorna { id: leadContactId }
   
   b) Llamar a CreateThread.execute({
        propertyId,
        contactId: leadContactId,
        createdBy: null, // Lead creó el thread
        initialMessage: messageText
      })
      → Retorna { id: threadId }
   
   c) Si initialMessage existe, llamar a SendMessage.execute({
        threadId,
        senderType: 'contact',
        senderContactId: leadContactId,
        body: messageText
      })
   
   d) Registrar evento telemetry:
      trackFirstContact(propertyId, { 
        source: 'chat_widget',
        contactId: leadContactId,
        threadId 
      })
   
   e) Crear property_lead:
      INSERT INTO property_leads (
        org_id, property_id, contact_id, first_event_id, status
      )
   
   f) Enviar notificación al agente/propietario:
      - Email: "Nuevo lead contactó sobre [Propiedad]"
      - Push notification (si está online)
   
   ↓
6. ChatWidget cambia a vista de conversación
   - Muestra el mensaje enviado
   - Suscribe a nuevos mensajes del thread vía Realtime
   ↓
7. Lead puede seguir escribiendo mensajes
   - Se almacenan en localStorage: { threadId, leadEmail }
   - Cada mensaje llama a SendMessage (vía Edge Function para bypass RLS)
```

**Código del flujo** (LeadCaptureForm.tsx):

```typescript
const handleSubmit = async (data: LeadFormData) => {
  setLoading(true);
  
  try {
    // 1. Crear/obtener lead
    const leadResult = await createOrGetLead({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone
    });
    
    if (leadResult.isErr()) {
      setError(leadResult.error.message);
      return;
    }
    
    const leadId = leadResult.value.id;
    
    // 2. Crear thread
    const threadResult = await createThread({
      propertyId,
      contactId: leadId,
      initialMessage: data.message
    });
    
    if (threadResult.isErr()) {
      setError(threadResult.error.message);
      return;
    }
    
    // 3. Guardar en localStorage para futuras sesiones
    localStorage.setItem('chat_lead_session', JSON.stringify({
      leadId,
      email: data.email,
      threadId: threadResult.value.id
    }));
    
    // 4. Notificar a componente padre que el lead fue capturado
    onLeadCaptured({
      leadId,
      threadId: threadResult.value.id
    });
    
  } catch (err) {
    setError('Error al iniciar chat');
  } finally {
    setLoading(false);
  }
};
```

### b) **Flujo: Inicio de chat desde PropertyDetailPage (Usuario AUTENTICADO)**

```
1. Usuario hace clic en "Contactar"
   ↓
2. ChatWidget detecta sesión activa (useAuth() → user)
   ↓
3. Llamar a FindOrCreateThread.execute({
      propertyId,
      userId: user.id
    })
    
    Internamente:
    a) Buscar thread existente:
       SELECT * FROM chat_threads
       WHERE property_id = $1
       AND id IN (
         SELECT thread_id FROM chat_participants
         WHERE user_id = $2
       )
       LIMIT 1
    
    b) Si existe → retornarlo
    c) Si NO existe → crear nuevo:
       - INSERT INTO chat_threads (org_id, property_id, created_by)
       - INSERT INTO chat_participants (thread_id, user_id)
       - Retornar thread creado
   ↓
4. Abrir ChatWidget con threadId
   ↓
5. Cargar mensajes del thread (GetMessages.execute({ threadId }))
   ↓
6. Suscribirse a nuevos mensajes vía Realtime
   ↓
7. Usuario puede enviar mensajes
   - Cada mensaje actualiza last_message_at del thread
   - Se notifica al propietario/agente de la propiedad
```

**Código** (ChatWidget.tsx):

```typescript
const handleOpenForAuthenticatedUser = async () => {
  setLoading(true);
  
  const threadResult = await findOrCreateThread({
    propertyId,
    userId: user.id
  });
  
  if (threadResult.isErr()) {
    setError('No se pudo iniciar el chat');
    return;
  }
  
  setThreadId(threadResult.value.id);
  setIsOpen(true);
  setLoading(false);
};
```

### c) **Flujo: Envío de mensaje (detallado)**

```
UI: Usuario escribe mensaje y presiona Enter/Send
  ↓
Hook: useChatActions.sendMessage({ threadId, body })
  ↓
Use Case: SendMessage.execute()
  ↓
  1. Validar input
     - body no vacío, max 5000 caracteres
     - threadId válido UUID
  ↓
  2. Obtener contexto de auth
     const authResult = await this.deps.auth.getCurrent()
     → { userId, orgId }
  ↓
  3. Verificar acceso al thread
     const hasAccess = await this.deps.threadRepo.userHasAccess(threadId, userId)
     Si NO → return Result.fail({ code: 'FORBIDDEN' })
  ↓
  4. Crear entidad de dominio
     const message = new ChatMessage({
       id: generateId(),
       threadId,
       senderType: 'user',
       senderUserId: userId,
       body,
       createdAt: now()
     })
  ↓
  5. Persistir en BD
     const insertResult = await this.deps.messageRepo.create(
       fromDomain(message)
     )
  ↓
  6. Actualizar last_message_at del thread
     await this.deps.threadRepo.update(threadId, {
       lastMessageAt: message.createdAt
     })
  ↓
  7. Broadcast vía Realtime (opcional, Supabase lo hace automático)
     await this.deps.realtimeService.broadcastMessage(threadId, messageDTO)
  ↓
  8. Enviar notificaciones a otros participantes
     const participants = await this.deps.threadRepo.getParticipants(threadId)
     const otherParticipants = participants.filter(p => p.userId !== userId)
     
     for (const participant of otherParticipants) {
       await this.deps.notificationService.sendPush({
         userId: participant.userId,
         title: 'Nuevo mensaje',
         body: message.body.substring(0, 100),
         data: { threadId }
       })
     }
  ↓
  9. Retornar mensaje creado
     return Result.ok(toDTO(message))
  ↓
Infrastructure: SupabaseChatMessageRepo.create()
  ↓
  INSERT INTO chat_messages (...) VALUES (...)
  RETURNING *
  ↓
Database: Trigger automático actualiza properties_metrics (si aplica)
  ↓
Realtime: Postgres Changes emite evento INSERT
  ↓
Subscriptores: Todos los clientes suscritos a ese thread reciben el mensaje
  ↓
UI: useChat actualiza estado con el nuevo mensaje
  ↓
  setMessages(prev => [...prev, newMessage])
  scrollToBottom()
```

**Código** (SendMessage.ts):

```typescript
export class SendMessage {
  async execute(input: SendMessageInput): Promise<Result<MessageDTO>> {
    // 1. Validar
    const parsed = parseWith(sendMessageSchema, input);
    if (parsed.isErr()) return Result.fail(parsed.error);
    
    // 2. Auth
    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) return authResult;
    const { userId, orgId } = authResult.value;
    
    // 3. Verificar acceso
    const accessResult = await this.deps.threadRepo.userHasAccess(
      parsed.value.threadId, 
      userId
    );
    if (accessResult.isErr()) return accessResult;
    if (!accessResult.value) {
      return Result.fail({ code: 'FORBIDDEN', message: 'No access to thread' });
    }
    
    // 4. Crear entidad
    const message = ChatMessage.create({
      id: new UniqueEntityID(generateId()),
      threadId: new UniqueEntityID(parsed.value.threadId),
      senderType: 'user',
      senderUserId: new UniqueEntityID(userId),
      body: new MessageBody(parsed.value.body),
      createdAt: this.deps.clock.now()
    });
    
    // 5. Persistir
    const dto = fromDomain(message);
    const createResult = await this.deps.messageRepo.create(dto);
    if (createResult.isErr()) return createResult;
    
    // 6. Actualizar thread
    await this.deps.threadRepo.updateLastMessageAt(
      parsed.value.threadId,
      message.createdAt
    );
    
    // 7. Notificaciones (async, no bloquear)
    this.sendNotificationsAsync(parsed.value.threadId, userId, dto);
    
    return Result.ok(dto);
  }
  
  private async sendNotificationsAsync(
    threadId: string, 
    senderId: string, 
    message: MessageDTO
  ): Promise<void> {
    try {
      const participants = await this.deps.threadRepo.getParticipants(threadId);
      const recipients = participants
        .filter(p => p.userId && p.userId !== senderId)
        .map(p => p.userId!);
      
      for (const recipientId of recipients) {
        await this.deps.notificationService.sendPush({
          userId: recipientId,
          title: 'Nuevo mensaje en chat',
          body: message.body.substring(0, 100),
          data: { threadId, messageId: message.id }
        });
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
      // No fallar el caso de uso por errores en notificaciones
    }
  }
}
```

---

**FIN DE PARTE 2.1**

La Parte 2.2 incluirá:
- 8.d) Flujo de estados del mensaje (sent → delivered → read)
- 8.e) Flujo de "escribiendo..."
- 9. Estado y contexto
- 10. Casos edge y testing
