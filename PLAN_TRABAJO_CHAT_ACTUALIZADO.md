# NOVALIA - Plan de Implementación ACTUALIZADO: Módulo de Chat

**Fecha**: 12 de Noviembre, 2025  
**Proyecto**: Novalia - Plataforma Inmobiliaria  
**Módulo**: HU-07 - Comunicación en Tiempo Real  
**Estado Actual**: 75% Completo ✅  
**Estimación Restante**: 6-8 días (~1.5 semanas)  
**Versión**: 3.0

---

## 📊 RESUMEN DEL ESTADO ACTUAL

### ✅ LO QUE YA ESTÁ IMPLEMENTADO (75%)

#### Domain Layer - 100% ✅
- ✅ Entidades: `ChatThread`, `ChatMessage`, `Participant`
- ✅ Value Objects: `MessageBody`, `UniqueEntityID` (con protección contra doble envoltura)
- ✅ Enums: `SenderType`, `ParticipantType`, `MessageStatus`, `ThreadStatus`
- ✅ Errors: `ChatError`, `InvariantViolationError`, `BaseDomainError`
- ✅ Clock abstraction

#### Application Layer - 80% ✅
- ✅ DTOs completos (8 archivos)
- ✅ Ports/Interfaces (5 archivos)
- ✅ Mappers Domain ↔ DTO (corregidos y funcionando)
- ✅ Validators con Zod
- ✅ Use Cases implementados (5/12):
  - ✅ `ListListerInbox`
  - ✅ `ListClientInbox`
  - ✅ `ListMessages`
  - ✅ `SendMessage` (Bug crítico resuelto 12 Nov 2025)
  - ✅ `MarkThreadAsRead`

#### Infrastructure Layer - 100% ✅
- ✅ `SupabaseChatThreadRepo` completo
- ✅ `SupabaseChatMessageRepo` completo
- ✅ `SupabaseRealtimeChatService` completo
- ✅ `SupabaseAuthService` completo
- ✅ Types de BD

#### UI Layer - 70% ✅
- ✅ `ChatsPage.tsx` completa con inbox funcional
- ✅ `ChatProvider` context
- ✅ `useChatRealtime` hook
- ✅ CSS Modules completos
- ✅ Sistema de mensajería operativo

#### Container - 100% ✅
- ✅ `comunication.container.ts` con DI completo

#### Base de Datos - 100% ✅
- ✅ Tablas: `chat_threads`, `chat_messages`, `chat_participants`
- ✅ Enum: `sender_type_enum`
- ✅ Políticas RLS básicas
- ✅ Índices optimizados

---

### 🐛 BUG CRÍTICO RESUELTO (12 Nov 2025)

**Problema:** Error `ACCESS_DENIED` al enviar mensajes

**Síntoma:**
```
❌ Error enviando mensaje: {code: 'ACCESS_DENIED', message: 'No puedes enviar mensajes en este chat'}
```

**Causa Raíz:**
Doble envoltura de `UniqueEntityID` en participantes:
```typescript
// Estructura incorrecta:
UniqueEntityID { value: UniqueEntityID { value: "uuid-string" } }

// Estructura correcta:
UniqueEntityID { value: "uuid-string" }
```

**Solución:**
1. ✅ Corregir `chatThread.mapper.ts` - Pasar snapshots en lugar de objetos
2. ✅ Modificar `UniqueEntityID.ts` - Campo `value` público + protección contra doble envoltura
3. ✅ Limpiar `SendMessage.ts` - Remover código de debug

**Archivos Modificados:**
- `src/modules/comunication/application/mappers/chatThread.mapper.ts`
- `src/modules/comunication/domain/value-objects/UniqueEntityID.ts`
- `src/modules/comunication/application/use-cases/messages/SendMessage.ts`

**Resultado:**
✅ Sistema de mensajería 100% funcional  
✅ Mensajes se envían correctamente  
✅ Validación de participantes operativa

---

### ❌ LO QUE FALTA (25%)

#### Prioridad 🔴 CRÍTICA
1. **ChatWidget** - 0% (Funcionalidad core del producto)
2. **Testing** - 0% (Calidad y confiabilidad)
3. **Use Cases faltantes** - 7 pendientes (Leads y threads avanzados)

#### Prioridad 🟡 MEDIA
4. **Notificaciones** - 0%
5. **Componentes UI separados** - 0%
6. **Performance optimizations** - 0%

#### Prioridad 🟢 BAJA
7. **Features avanzadas** - 20%
8. **Accesibilidad** - 0%
9. **Documentación** - 0%

---

## 🎯 PLAN DE TRABAJO ACTUALIZADO

### SEMANA 1: Features Core (Días 1-5)

#### ✅ **YA NO ES NECESARIO** (Fase 0-2 del plan original)
- ~~Fase 0: Preparación~~ - La BD y estructura ya existen
- ~~Fase 1: Domain Layer~~ - ✅ 100% completo
- ~~Fase 2: Application Layer base~~ - ✅ 80% completo
- ~~Fase 3-5: Use Cases base + Infrastructure + Container~~ - ✅ Implementados

---

### 🔴 DÍA 1-3: ChatWidget (PRIORIDAD MÁXIMA)

**Objetivo**: Permitir contactar desde PropertyDetailPage

#### Archivos a crear:

```typescript
src/modules/comunication/application/use-cases/
├── lead/
│   └── CreateOrGetLead.ts         ❌ Crear o buscar lead
└── threads/
    └── FindOrCreateThread.ts      ❌ Buscar o crear thread

src/modules/comunication/application/ports/
└── LeadContactRepo.ts             ❌ Interface para leads

src/modules/comunication/infrastructure/adapters/
└── SupabaseLeadContactRepo.ts     ❌ Implementación leads

src/modules/comunication/UI/components/ChatWidget/
├── ChatWidget.tsx                 ❌ Componente principal
├── ChatWidget.module.css          ❌ Estilos
├── ChatWidgetButton.tsx           ❌ Botón flotante
├── ChatWidgetDialog.tsx           ❌ Diálogo con chat
├── LeadCaptureForm.tsx            ❌ Formulario para no auth
└── index.ts                       ❌ Exports
```

#### Tareas Día 1: Use Cases (4-5 horas)

##### 1.1 Crear `LeadContactRepo` interface

**Archivo**: `src/modules/comunication/application/ports/LeadContactRepo.ts`

```typescript
import { Result } from '../_shared/result';

export interface LeadDTO {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface LeadContactRepo {
  create(data: Omit<LeadDTO, 'id' | 'createdAt'>): Promise<Result<LeadDTO>>;
  findByEmail(email: string): Promise<Result<LeadDTO | null>>;
  findByPhone(phone: string): Promise<Result<LeadDTO | null>>;
  update(id: string, data: Partial<LeadDTO>): Promise<Result<LeadDTO>>;
}
```

##### 1.2 Implementar `SupabaseLeadContactRepo`

**Archivo**: `src/modules/comunication/infrastructure/adapters/SupabaseLeadContactRepo.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../application/_shared/result';
import type { LeadContactRepo, LeadDTO } from '../../application/ports/LeadContactRepo';

export class SupabaseLeadContactRepo implements LeadContactRepo {
  constructor(private readonly client: SupabaseClient) {}

  async create(data: Omit<LeadDTO, 'id' | 'createdAt'>): Promise<Result<LeadDTO>> {
    const { data: lead, error } = await this.client
      .from('lead_contacts')
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
      })
      .select()
      .single();

    if (error) {
      return Result.fail({ code: 'DB_ERROR', message: error.message });
    }

    return Result.ok({
      id: lead.id,
      fullName: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      createdAt: lead.created_at,
    });
  }

  async findByEmail(email: string): Promise<Result<LeadDTO | null>> {
    const { data, error } = await this.client
      .from('lead_contacts')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return Result.fail({ code: 'DB_ERROR', message: error.message });
    }

    if (!data) return Result.ok(null);

    return Result.ok({
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      createdAt: data.created_at,
    });
  }

  async findByPhone(phone: string): Promise<Result<LeadDTO | null>> {
    const { data, error } = await this.client
      .from('lead_contacts')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      return Result.fail({ code: 'DB_ERROR', message: error.message });
    }

    if (!data) return Result.ok(null);

    return Result.ok({
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      createdAt: data.created_at,
    });
  }

  async update(id: string, updates: Partial<LeadDTO>): Promise<Result<LeadDTO>> {
    const payload: Record<string, unknown> = {};
    if (updates.fullName) payload.full_name = updates.fullName;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone = updates.phone;

    const { data, error } = await this.client
      .from('lead_contacts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Result.fail({ code: 'DB_ERROR', message: error.message });
    }

    return Result.ok({
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      createdAt: data.created_at,
    });
  }
}
```

##### 1.3 Crear `CreateOrGetLead` use case

**Archivo**: `src/modules/comunication/application/use-cases/lead/CreateOrGetLead.ts`

```typescript
import { Result } from '../../_shared/result';
import type { LeadContactRepo, LeadDTO } from '../../ports/LeadContactRepo';
import { z } from 'zod';

const leadInputSchema = z.object({
  fullName: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Teléfono inválido').optional(),
}).refine(data => data.email || data.phone, {
  message: 'Debe proporcionar email o teléfono',
});

type LeadInput = z.infer<typeof leadInputSchema>;

export class CreateOrGetLead {
  constructor(private readonly deps: { leadRepo: LeadContactRepo }) {}

  async execute(input: LeadInput): Promise<Result<LeadDTO>> {
    // Validar input
    const parsed = leadInputSchema.safeParse(input);
    if (!parsed.success) {
      return Result.fail({
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;

    // Buscar lead existente
    if (data.email) {
      const existing = await this.deps.leadRepo.findByEmail(data.email);
      if (existing.isErr()) return existing;
      if (existing.value) {
        // Actualizar si cambió el nombre o teléfono
        return this.deps.leadRepo.update(existing.value.id, {
          fullName: data.fullName,
          phone: data.phone,
        });
      }
    }

    if (data.phone) {
      const existing = await this.deps.leadRepo.findByPhone(data.phone);
      if (existing.isErr()) return existing;
      if (existing.value) {
        return this.deps.leadRepo.update(existing.value.id, {
          fullName: data.fullName,
          email: data.email,
        });
      }
    }

    // Crear nuevo lead
    return this.deps.leadRepo.create(data);
  }
}
```

##### 1.4 Crear `FindOrCreateThread` use case

**Archivo**: `src/modules/comunication/application/use-cases/threads/FindOrCreateThread.ts`

```typescript
import { Result } from '../../_shared/result';
import type { ChatThreadRepo } from '../../ports/ChatThreadRepo';
import type { ChatMessageRepo } from '../../ports/ChatMessageRepo';
import type { AuthService } from '../../ports/AuthService';
import type { ThreadDTO } from '../../dto/ThreadDTO';
import { z } from 'zod';

const inputSchema = z.object({
  propertyId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  initialMessage: z.string().min(1).max(5000).optional(),
}).refine(data => data.contactId || data.userId, {
  message: 'Debe proporcionar contactId o userId',
});

type FindOrCreateThreadInput = z.infer<typeof inputSchema>;

export class FindOrCreateThread {
  constructor(
    private readonly deps: {
      threadRepo: ChatThreadRepo;
      messageRepo: ChatMessageRepo;
      auth: AuthService;
    },
  ) {}

  async execute(input: FindOrCreateThreadInput): Promise<Result<ThreadDTO>> {
    // Validar
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      return Result.fail({
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;

    // Buscar thread existente
    const existing = await this.deps.threadRepo.findByPropertyAndParticipant(
      data.propertyId,
      data.contactId,
      data.userId,
    );

    if (existing.isErr()) return existing;
    if (existing.value) {
      return Result.ok(existing.value);
    }

    // Obtener contexto de auth
    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) return authResult;
    const auth = authResult.value;

    // Crear nuevo thread
    const now = new Date().toISOString();
    const newThread: ThreadDTO = {
      id: crypto.randomUUID(),
      orgId: auth.orgId ?? '',
      propertyId: data.propertyId,
      contactId: data.contactId,
      createdBy: data.userId ?? auth.userId,
      createdAt: now,
      lastMessageAt: data.initialMessage ? now : undefined,
    };

    const createResult = await this.deps.threadRepo.create(newThread);
    if (createResult.isErr()) return createResult;

    // Enviar mensaje inicial si existe
    if (data.initialMessage) {
      const messageResult = await this.deps.messageRepo.create({
        id: crypto.randomUUID(),
        threadId: newThread.id,
        senderType: data.contactId ? 'contact' : 'user',
        senderContactId: data.contactId,
        senderUserId: data.userId,
        body: data.initialMessage,
        createdAt: now,
      });

      if (messageResult.isErr()) {
        // Thread creado pero mensaje falló - no es crítico
        console.error('Failed to send initial message:', messageResult.error);
      }
    }

    return Result.ok(createResult.value);
  }
}
```

##### 1.5 Actualizar container

**Archivo**: `src/modules/comunication/comunication.container.ts`

Agregar:

```typescript
import { CreateOrGetLead } from './application/use-cases/lead/CreateOrGetLead';
import { FindOrCreateThread } from './application/use-cases/threads/FindOrCreateThread';
import { SupabaseLeadContactRepo } from './infrastructure/adapters/SupabaseLeadContactRepo';

// En la interface:
export interface CommunicationUseCases {
  // ... existentes
  createOrGetLead: CreateOrGetLead;
  findOrCreateThread: FindOrCreateThread;
}

// En la función:
const leadRepo = new SupabaseLeadContactRepo(client);

return {
  useCases: {
    // ... existentes
    createOrGetLead: new CreateOrGetLead({ leadRepo }),
    findOrCreateThread: new FindOrCreateThread({
      threadRepo,
      messageRepo,
      auth,
    }),
  },
  // ...
};
```

**Checkpoint Día 1**: ✅ Use cases para leads y threads listos

---

#### Tareas Día 2: Componentes UI (6-7 horas)

##### 2.1 Crear `LeadCaptureForm`

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/LeadCaptureForm.tsx`

```typescript
import { useState } from 'react';
import styles from './ChatWidget.module.css';

interface LeadCaptureFormProps {
  propertyTitle: string;
  onSubmit: (data: {
    fullName: string;
    email?: string;
    phone?: string;
    message?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function LeadCaptureForm({
  propertyTitle,
  onSubmit,
  onCancel,
  loading = false,
}: LeadCaptureFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!email && !phone) {
      setError('Debe proporcionar email o teléfono');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.leadForm}>
      <h3 className={styles.leadFormTitle}>
        Contactar sobre: {propertyTitle}
      </h3>

      <div className={styles.formField}>
        <label htmlFor="fullName">Nombre completo *</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Pérez"
          disabled={loading}
          required
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="juan@example.com"
          disabled={loading}
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="phone">Teléfono</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="555-123-4567"
          disabled={loading}
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="message">Mensaje (opcional)</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Me interesa esta propiedad..."
          rows={3}
          disabled={loading}
        />
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={styles.buttonSecondary}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className={styles.buttonPrimary}
        >
          {loading ? 'Enviando...' : 'Iniciar chat'}
        </button>
      </div>
    </form>
  );
}
```

##### 2.2 Crear `ChatWidgetButton`

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/ChatWidgetButton.tsx`

```typescript
import styles from './ChatWidget.module.css';

interface ChatWidgetButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function ChatWidgetButton({ onClick, unreadCount = 0 }: ChatWidgetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.widgetButton}
      aria-label="Abrir chat"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {unreadCount > 0 && (
        <span className={styles.widgetBadge}>{unreadCount}</span>
      )}
    </button>
  );
}
```

##### 2.3 Crear `ChatWidgetDialog`

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/ChatWidgetDialog.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import { useChatModule } from '../../contexts/ChatProvider';
import { useChatRealtime } from '../../hooks/useChatRealtime';
import type { ChatMessageDTO } from '../../../application/dto/ChatMessageDTO';
import styles from './ChatWidget.module.css';

interface ChatWidgetDialogProps {
  threadId: string;
  propertyTitle: string;
  onClose: () => void;
}

export function ChatWidgetDialog({
  threadId,
  propertyTitle,
  onClose,
}: ChatWidgetDialogProps) {
  const { useCases } = useChatModule();
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [composer, setComposer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const result = await useCases.listMessages.execute({
        threadId,
        page: 1,
        pageSize: 50,
      });

      if (result.isOk()) {
        setMessages(result.value.items);
      }
      setLoading(false);
    };

    loadMessages();
  }, [threadId, useCases.listMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime
  const handleNewMessage = (msg: ChatMessageDTO) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  useChatRealtime(threadId, { onMessage: handleNewMessage });

  // Enviar mensaje
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composer.trim() || sending) return;

    setSending(true);
    const result = await useCases.sendMessage.execute({
      threadId,
      body: composer.trim(),
    });

    if (result.isOk()) {
      setComposer('');
    }
    setSending(false);
  };

  return (
    <div className={styles.widgetDialog}>
      <div className={styles.dialogHeader}>
        <div>
          <h3>{propertyTitle}</h3>
          <p className={styles.dialogSubtitle}>Chat en vivo</p>
        </div>
        <button
          onClick={onClose}
          className={styles.dialogClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className={styles.dialogBody}>
        {loading && <div className={styles.loading}>Cargando...</div>}
        {!loading && messages.length === 0 && (
          <div className={styles.emptyState}>
            Inicia la conversación enviando un mensaje
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${
              msg.senderType === 'user' ? styles.messageAgent : styles.messageUser
            }`}
          >
            {msg.body}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={styles.dialogComposer}>
        <input
          type="text"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={sending}
          className={styles.composerInput}
        />
        <button
          type="submit"
          disabled={!composer.trim() || sending}
          className={styles.composerButton}
        >
          {sending ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
```

##### 2.4 Crear `ChatWidget` (componente principal)

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/ChatWidget.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useChatModule } from '../../contexts/ChatProvider';
import { ChatWidgetButton } from './ChatWidgetButton';
import { ChatWidgetDialog } from './ChatWidgetDialog';
import { LeadCaptureForm } from './LeadCaptureForm';
import { supabase } from '../../../../core/supabase/client';
import styles from './ChatWidget.module.css';

interface ChatWidgetProps {
  propertyId: string;
  propertyTitle: string;
}

export function ChatWidget({ propertyId, propertyTitle }: ChatWidgetProps) {
  const { useCases } = useChatModule();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Abrir widget
  const handleOpen = async () => {
    setIsOpen(true);

    if (!isAuthenticated) {
      setShowLeadForm(true);
      return;
    }

    // Usuario autenticado: buscar o crear thread
    setLoading(true);
    const result = await useCases.findOrCreateThread.execute({
      propertyId,
      userId: (await supabase.auth.getUser()).data.user?.id,
    });

    if (result.isOk()) {
      setThreadId(result.value.id);
      setShowLeadForm(false);
    }
    setLoading(false);
  };

  // Captura de lead
  const handleLeadSubmit = async (data: {
    fullName: string;
    email?: string;
    phone?: string;
    message?: string;
  }) => {
    setLoading(true);

    // 1. Crear o buscar lead
    const leadResult = await useCases.createOrGetLead.execute({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    });

    if (leadResult.isErr()) {
      console.error('Failed to create lead:', leadResult.error);
      setLoading(false);
      return;
    }

    // 2. Crear thread
    const threadResult = await useCases.findOrCreateThread.execute({
      propertyId,
      contactId: leadResult.value.id,
      initialMessage: data.message,
    });

    if (threadResult.isOk()) {
      setThreadId(threadResult.value.id);
      setShowLeadForm(false);

      // Guardar en localStorage
      localStorage.setItem(
        'chat_lead_session',
        JSON.stringify({
          leadId: leadResult.value.id,
          email: data.email,
          threadId: threadResult.value.id,
        })
      );
    }

    setLoading(false);
  };

  return (
    <>
      <ChatWidgetButton onClick={handleOpen} />

      {isOpen && (
        <div className={styles.widgetContainer}>
          {showLeadForm && !threadId && (
            <LeadCaptureForm
              propertyTitle={propertyTitle}
              onSubmit={handleLeadSubmit}
              onCancel={() => setIsOpen(false)}
              loading={loading}
            />
          )}

          {threadId && !showLeadForm && (
            <ChatWidgetDialog
              threadId={threadId}
              propertyTitle={propertyTitle}
              onClose={() => setIsOpen(false)}
            />
          )}

          {loading && !showLeadForm && !threadId && (
            <div className={styles.widgetLoading}>Cargando...</div>
          )}
        </div>
      )}
    </>
  );
}
```

##### 2.5 Crear estilos

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/ChatWidget.module.css`

```css
.widgetButton {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1000;
}

.widgetButton:hover {
  background: #4338ca;
  transform: scale(1.05);
}

.widgetBadge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
}

.widgetContainer {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 380px;
  max-height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.widgetDialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
}

.dialogHeader {
  padding: 16px;
  background: #4f46e5;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialogHeader h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialogSubtitle {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.9;
}

.dialogClose {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.dialogClose:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dialogBody {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9fafb;
}

.message {
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  max-width: 75%;
  word-wrap: break-word;
}

.messageUser {
  background: #e0e7ff;
  margin-left: auto;
  margin-right: 0;
  text-align: right;
}

.messageAgent {
  background: white;
  border: 1px solid #e5e7eb;
}

.dialogComposer {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.composerInput {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.composerButton {
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.composerButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.leadForm {
  padding: 24px;
}

.leadFormTitle {
  margin: 0 0 20px;
  font-size: 18px;
  color: #1f2937;
}

.formField {
  margin-bottom: 16px;
}

.formField label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.formField input,
.formField textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.formError {
  background: #fee2e2;
  color: #991b1b;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.formActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.buttonPrimary,
.buttonSecondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.buttonPrimary {
  background: #4f46e5;
  color: white;
  border: none;
}

.buttonSecondary {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}

.emptyState,
.loading,
.widgetLoading {
  text-align: center;
  padding: 24px;
  color: #6b7280;
}
```

**Checkpoint Día 2**: ✅ Componentes UI del ChatWidget listos

---

#### Tareas Día 3: Integración (3-4 horas)

##### 3.1 Exportar ChatWidget

**Archivo**: `src/modules/comunication/UI/components/ChatWidget/index.ts`

```typescript
export { ChatWidget } from './ChatWidget';
```

##### 3.2 Integrar en PropertyDetailPage

**Archivo**: `src/modules/properties/UI/pages/PropertyDetailPage/PropertyDetailPage.tsx`

Agregar al final del componente:

```typescript
import { ChatWidget } from '../../../../comunication/UI/components/ChatWidget';

// ...al final del return, antes de cerrar el div principal:
{id && data?.property && (
  <ChatWidget 
    propertyId={id}
    propertyTitle={data.property.title}
  />
)}
```

##### 3.3 Agregar ruta de inbox (opcional)

**Archivo**: `src/app/routes.tsx`

```typescript
import ChatsPage from '../modules/comunication/UI/pages/ChatsPage';

// En las rutas protegidas:
{ path: '/inbox', element: <ChatsPage /> }
```

##### 3.4 Testing manual

- [ ] Abrir PropertyDetailPage
- [ ] Ver botón flotante
- [ ] Click en botón sin estar autenticado → Formulario lead
- [ ] Completar formulario → Thread creado
- [ ] Enviar mensaje → Aparece en chat
- [ ] Autenticarse y probar → Thread directo

**Checkpoint Día 3**: ✅ ChatWidget integrado y funcional

---

### 🟡 DÍA 4-5: Testing Básico (IMPORTANTE)

**Objetivo**: Alcanzar al menos 50% de coverage

#### Archivos a crear:

```typescript
src/tests/domain/comunication/
├── ChatMessage.test.ts
├── ChatThread.test.ts
└── MessageBody.test.ts

src/tests/application/comunication/
├── SendMessage.test.ts
├── ListMessages.test.ts
└── CreateOrGetLead.test.ts

src/modules/comunication/application/fakes/
├── FakeChatThreadRepo.ts
├── FakeChatMessageRepo.ts
└── FakeLeadContactRepo.ts
```

##### 4.1 Ejemplo: Test de MessageBody

**Archivo**: `src/tests/domain/comunication/MessageBody.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { MessageBody } from '../../../modules/comunication/domain/value-objects/MessageBody';
import { InvariantViolationError } from '../../../modules/comunication/domain/errors';

describe('MessageBody', () => {
  it('should create valid message body', () => {
    const body = new MessageBody('Hello world');
    expect(body.toString()).toBe('Hello world');
  });

  it('should trim whitespace', () => {
    const body = new MessageBody('  Hello  ');
    expect(body.toString()).toBe('Hello');
  });

  it('should throw on empty string', () => {
    expect(() => new MessageBody('')).toThrow(InvariantViolationError);
  });

  it('should throw on too long message', () => {
    const longText = 'a'.repeat(5001);
    expect(() => new MessageBody(longText)).toThrow(InvariantViolationError);
  });
});
```

##### 4.2 Crear Fakes (Mocks)

**Archivo**: `src/modules/comunication/application/fakes/FakeChatThreadRepo.ts`

```typescript
import type { ChatThreadRepo } from '../ports/ChatThreadRepo';
import type { ThreadDTO } from '../dto/ThreadDTO';
import { Result } from '../_shared/result';

export class FakeChatThreadRepo implements ChatThreadRepo {
  private threads: Map<string, ThreadDTO> = new Map();

  async create(dto: ThreadDTO): Promise<Result<ThreadDTO>> {
    this.threads.set(dto.id, dto);
    return Result.ok(dto);
  }

  async getById(id: string): Promise<Result<ThreadDTO>> {
    const thread = this.threads.get(id);
    if (!thread) {
      return Result.fail({ code: 'NOT_FOUND', message: 'Thread not found' });
    }
    return Result.ok(thread);
  }

  async findByPropertyAndParticipant(
    propertyId: string,
    contactId?: string,
    userId?: string
  ): Promise<Result<ThreadDTO | null>> {
    const found = Array.from(this.threads.values()).find(
      (t) =>
        t.propertyId === propertyId &&
        (t.contactId === contactId || t.createdBy === userId)
    );
    return Result.ok(found || null);
  }

  async list(): Promise<Result<ThreadDTO[]>> {
    return Result.ok(Array.from(this.threads.values()));
  }

  async updateLastMessageAt(id: string, at: Date): Promise<Result<void>> {
    const thread = this.threads.get(id);
    if (!thread) {
      return Result.fail({ code: 'NOT_FOUND', message: 'Thread not found' });
    }
    thread.lastMessageAt = at.toISOString();
    return Result.ok(undefined);
  }

  async userHasAccess(threadId: string, userId: string): Promise<Result<boolean>> {
    const thread = this.threads.get(threadId);
    return Result.ok(!!thread && thread.createdBy === userId);
  }

  async countRecentByContact(): Promise<Result<number>> {
    return Result.ok(0);
  }
}
```

**Checkpoint Día 4-5**: ✅ Tests básicos (>50% coverage)

---

## SEMANA 2: Features Complementarias (Días 6-10)

### 🟡 DÍA 6-7: Notificaciones Básicas

#### Objetivo: Email cuando llega mensaje

**Archivos a crear:**

```typescript
src/modules/comunication/application/use-cases/notifications/
└── SendMessageNotification.ts

src/modules/comunication/application/ports/
└── NotificationService.ts

src/modules/comunication/infrastructure/adapters/
└── SupabaseNotificationService.ts
```

**Integrar en SendMessage use case:**

```typescript
// Después de crear mensaje
await notificationService.sendEmail({
  to: recipientEmail,
  template: 'new_chat_message',
  data: { senderName, messagePreview, propertyTitle }
});
```

---

### 🟢 DÍA 8: Componentes UI Reutilizables

#### Objetivo: Separar componentes inline de ChatsPage

**Archivos a crear:**

```typescript
src/modules/comunication/UI/components/
├── MessageBubble/
├── MessageList/
├── ThreadListItem/
└── UnreadBadge/
```

**Refactorizar `ChatsPage.tsx` para usar estos componentes**

---

### 🟢 DÍA 9-10: Features Avanzadas

#### 9.1 Indicador "Escribiendo..."

**Hook**: `useTypingIndicator.ts`
**Componente**: `TypingIndicator.tsx`

#### 9.2 Archivar Threads

**Use case**: `ArchiveThread.ts`
**UI**: Botón en thread list

#### 9.3 Optimistic Updates

Actualizar `SendMessage` para agregar mensaje inmediatamente a UI antes de confirmar

---

## 📋 CHECKLIST FINAL

### Features Core ✅
- [x] Domain Layer completo
- [x] Application Layer completo
- [x] Infrastructure completa
- [x] Container configurado
- [x] ChatsPage funcional
- [ ] **ChatWidget en PropertyDetailPage** ← DÍA 1-3
- [ ] **Testing básico** ← DÍA 4-5

### Features Complementarias 🟡
- [ ] Notificaciones email
- [ ] Componentes reutilizables
- [ ] Indicador typing
- [ ] Archivar threads
- [ ] Optimistic updates

### Calidad 🔴
- [ ] Tests >50% coverage
- [ ] Error boundaries
- [ ] Loading states
- [ ] Error messages
- [ ] Accesibilidad básica

---

## 🎯 PRIORIZACIÓN FINAL

### MUST HAVE (Días 1-5)
1. ✅ ChatWidget completo
2. ✅ Testing básico (>50%)
3. ✅ Manejo de errores

### SHOULD HAVE (Días 6-8)
4. Notificaciones email
5. Componentes separados
6. Performance básica

### NICE TO HAVE (Días 9-10)
7. Typing indicator
8. Archivar threads
9. Optimistic updates

---

## 📊 ESTIMACIÓN FINAL

```
✅ YA COMPLETADO:       75% (15-16 días equivalentes)
🔴 CRÍTICO (Días 1-5):  15% (ChatWidget + Tests)
🟡 MEDIO (Días 6-7):    6% (Notificaciones + UI)
🟢 BAJO (Días 8):       4% (Features extras)
-------------------------------------------
TOTAL RESTANTE:         25% (~6-8 días)
```

**Fecha estimada de completación**: ~20 de Noviembre, 2025

---

**Última actualización**: 12 de Noviembre, 2025  
**Versión**: 3.0 (Actualizado con bug crítico resuelto)  
**Progreso**: 75% → 100% en ~1.5 semanas
