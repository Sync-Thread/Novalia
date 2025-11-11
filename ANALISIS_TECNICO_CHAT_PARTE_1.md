# ANÁLISIS TÉCNICO PARA IMPLEMENTACIÓN DE MÓDULO DE CHAT EN TIEMPO REAL - PARTE 1

**Fecha**: 11 de Noviembre, 2025  
**Proyecto**: Novalia  
**Módulo**: HU-07 - Comunicación en tiempo real  
**Branch**: feature/chat-integration

---

## 1. ANÁLISIS DE ARQUITECTURA ACTUAL

### a) **Estructura de carpetas actual**

El proyecto sigue una organización modular clara en `src/`:

```
src/
├── app/                    # Configuración de la aplicación
│   ├── routes.tsx         # Definición de rutas con react-router-dom
│   └── guards/            # Guards de autenticación
├── core/                   # Configuración central
│   ├── config/            # Variables de entorno
│   └── supabase/          # Cliente de Supabase centralizado
│       ├── client.ts      # Instancia compartida de Supabase
│       └── basedatos.sql
├── modules/                # Módulos de negocio (Clean Architecture)
│   ├── auth/              # Autenticación y registro
│   ├── contracts/         # Gestión de contratos
│   ├── properties/        # Gestión de propiedades (REFERENCIA PRINCIPAL)
│   ├── telemetry/         # Tracking de eventos
│   └── verifications/     # Verificaciones KYC/RPP
├── pages/                  # Páginas generales (Dashboard, etc.)
├── shared/                 # Componentes y utilidades compartidas
│   ├── layouts/           # Layouts como AppShell
│   └── components/        # Componentes reutilizables
└── tests/                  # Tests organizados por tipo
    ├── application/
    ├── domain/
    └── e2e/
```

**Módulos existentes**: `auth`, `contracts`, `properties`, `telemetry`, `verifications`

### b) **Convenciones de nomenclatura observadas**

1. **Archivos**: PascalCase para componentes React (`PropertyDetailPage.tsx`), camelCase para utilities (`formatters.ts`)
2. **Carpetas**: camelCase o kebab-case según contexto
3. **Rutas de archivos**: Siempre absolutas desde `src/`
4. **Imports**: Relativos dentro del módulo, absolutos para core y shared
5. **Exports**: Named exports para use cases, default export para páginas React
6. **CSS Modules**: `ComponentName.module.css` co-ubicado con el componente

### c) **Organización del módulo `properties` (REFERENCIA)**

```
src/modules/properties/
├── domain/                         # Capa de Dominio
│   ├── entities/                  # Entidades del negocio
│   │   ├── Property.ts           # Entidad principal con lógica de negocio
│   │   ├── MediaAsset.ts
│   │   ├── Document.ts
│   │   └── index.ts
│   ├── value-objects/            # Value Objects inmutables
│   │   ├── Address.ts
│   │   ├── GeoPoint.ts
│   │   ├── Money.ts
│   │   └── UniqueEntityID.ts
│   ├── services/                 # Servicios de dominio
│   ├── policies/                 # Reglas de negocio (PublishPolicy, etc.)
│   ├── errors/                   # Errores de dominio
│   │   └── InvariantViolationError.ts
│   ├── enums.ts                  # Enumeraciones del dominio
│   ├── clock.ts                  # Abstracción del tiempo
│   └── utils/
├── application/                   # Capa de Aplicación
│   ├── use-cases/                # Casos de uso organizados por feature
│   │   ├── create/
│   │   │   └── CreateProperty.ts
│   │   ├── update/
│   │   ├── publish/
│   │   ├── list/
│   │   ├── delete/
│   │   └── media/
│   ├── ports/                    # Interfaces (contratos)
│   │   ├── PropertyRepo.ts
│   │   ├── AuthService.ts
│   │   └── Clock.ts
│   ├── dto/                      # Data Transfer Objects
│   │   ├── PropertyDTO.ts
│   │   └── FiltersDTO.ts
│   ├── mappers/                  # Transformación Domain <-> DTO
│   │   └── property.mapper.ts
│   ├── validators/               # Validaciones con Zod
│   │   ├── property.schema.ts
│   │   └── filters.schema.ts
│   ├── fakes/                    # Implementaciones fake para tests
│   └── _shared/                  # Utilidades compartidas de aplicación
│       ├── result.ts             # Patrón Result<T, E>
│       ├── id.ts                 # Generación de IDs
│       └── validation.ts
├── infrastructure/                # Capa de Infraestructura
│   ├── adapters/                 # Implementaciones de ports
│   │   ├── SupabasePropertyRepo.ts
│   │   ├── SupabaseAuthService.ts
│   │   ├── SupabaseMediaStorage.ts
│   │   └── SupabaseDocumentRepo.ts
│   ├── mappers/                  # Transformación DTO <-> DB Row
│   │   └── property.mapper.ts
│   └── types/
│       └── supabase-rows.ts     # Tipos de la BD
├── UI/                           # Capa de Presentación
│   ├── pages/                    # Páginas completas
│   │   ├── PropertyDetailPage/
│   │   │   ├── PropertyDetailPage.tsx
│   │   │   ├── PropertyDetailPage.module.css
│   │   │   ├── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── usePropertyDetail.ts
│   │   │   │   └── useSimilarProperties.ts
│   │   │   └── components/
│   │   │       ├── GalleryPlaceholder.tsx
│   │   │       ├── SummaryPanel.tsx
│   │   │       └── PropertyMap.tsx
│   │   ├── MyPropertiesPage/
│   │   ├── PublishWizardPage/
│   │   └── PublicHomePage/
│   ├── components/               # Componentes compartidos del módulo
│   │   ├── Modal.tsx
│   │   ├── ProgressCircle.tsx
│   │   └── CustomSelect.tsx
│   ├── hooks/                    # Hooks compartidos
│   │   ├── usePropertyList.ts
│   │   ├── usePropertiesActions.ts
│   │   └── usePropertyCoverImages.ts
│   ├── modals/
│   ├── utils/                    # Utilidades UI
│   │   ├── formatters.ts
│   │   ├── formatAddress.ts
│   │   └── amenityLabels.ts
│   └── index.ts
└── properties.container.ts       # Dependency Injection Container
```

---

## 2. IMPLEMENTACIÓN DE CLEAN ARCHITECTURE

### a) **Capas identificadas en el proyecto**

El proyecto implementa **Clean Architecture con 4 capas bien definidas**:

#### **CAPA 1: Domain (Dominio)**
- **Ubicación**: `src/modules/{module}/domain/`
- **Responsabilidad**: Lógica de negocio pura, independiente de frameworks
- **Elementos**:
  - **Entities**: Objetos con identidad que contienen lógica de negocio
  - **Value Objects**: Objetos inmutables sin identidad (Address, Money, GeoPoint)
  - **Policies**: Reglas de negocio encapsuladas (ej: `PublishPolicy`, `CompletenessPolicy`)
  - **Domain Services**: Lógica que no pertenece a una entidad específica
  - **Enums**: Enumeraciones del dominio
  - **Errors**: Errores específicos del dominio (`InvariantViolationError`)

**Ejemplo de Entity** (`Property.ts`):
```typescript
export class Property {
  readonly id: UniqueEntityID;
  readonly orgId: UniqueEntityID;
  private _status: PropertyStatus;
  private _title: string;
  
  constructor(p: PropertyProps, deps: { clock: DomainClock }) {
    // Validaciones de invariantes
    if (!p.title?.trim()) throw new InvariantViolationError("Title required");
    // ... inicialización
  }
  
  // Métodos de negocio
  publish(opts: PublishOptions) {
    assertPublishable({ /* validaciones */ });
    assertTransition(this._status, PROPERTY_STATUS.Published);
    this._status = PROPERTY_STATUS.Published;
    this.touch();
  }
  
  markSold(at: Date) { /* ... */ }
  computeCompleteness(inputs: CompletenessInputs): number { /* ... */ }
}
```

#### **CAPA 2: Application (Aplicación)**
- **Ubicación**: `src/modules/{module}/application/`
- **Responsabilidad**: Orquestación de casos de uso, NO contiene lógica de negocio
- **Elementos**:
  - **Use Cases**: Clases con método `execute()` que coordinan el flujo
  - **Ports (Interfaces)**: Contratos que la infraestructura debe implementar
  - **DTOs**: Objetos planos para transferencia de datos
  - **Mappers**: Transformación entre Domain Entities y DTOs
  - **Validators**: Schemas de validación (Zod)
  - **_shared**: Utilidades (`Result<T,E>`, generación de IDs)

**Ejemplo de Use Case** (`CreateProperty.ts`):
```typescript
export class CreateProperty {
  constructor(private deps: { 
    repo: PropertyRepo; 
    auth: AuthService; 
    clock: Clock 
  }) {}

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    // 1. Validar input
    const parsedInput = parseWith(createPropertySchema, rawInput);
    if (parsedInput.isErr()) return Result.fail(parsedInput.error);

    // 2. Obtener contexto de autenticación
    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) return Result.fail(authResult.error);

    // 3. Construir DTO y convertir a entidad de dominio
    const dto = buildCreateDto(parsedInput.value, context);
    const entity = toDomain(dto, { clock: this.deps.clock });
    
    // 4. Ejecutar lógica de negocio
    entity.computeCompleteness({ mediaCount: 0, documentCount: 0 });

    // 5. Persistir vía repositorio
    const repoResult = await this.deps.repo.create(fromDomain(entity));
    if (repoResult.isErr()) return Result.fail(repoResult.error);

    return Result.ok({ id: repoResult.value.id });
  }
}
```

**Patrón Result<T, E>**:
```typescript
export class Result<T, E = ResultError> {
  static ok<T>(value: T): Result<T, never>
  static fail<E>(error: E): Result<never, E>
  
  isOk(): this is Result<T, never>
  isErr(): this is Result<never, E>
  
  get value(): T  // Lanza error si isErr()
  get error(): E  // Lanza error si isOk()
}
```

**Ports (Interfaces)**:
```typescript
// application/ports/PropertyRepo.ts
export interface PropertyRepo {
  list(filters: ListFiltersDTO): Promise<Result<Page<PropertyDTO>>>;
  getById(id: string): Promise<Result<PropertyDTO>>;
  create(input: CreatePropertyDTO): Promise<Result<{ id: string }>>;
  update(id: string, patch: UpdatePropertyDTO): Promise<Result<void>>;
  // ...
}

// application/ports/AuthService.ts
export interface AuthService {
  getCurrent(): Promise<Result<AuthProfile>>;
}
```

#### **CAPA 3: Infrastructure (Infraestructura)**
- **Ubicación**: `src/modules/{module}/infrastructure/`
- **Responsabilidad**: Implementaciones concretas de ports (Supabase, APIs externas)
- **Elementos**:
  - **Adapters**: Implementaciones de interfaces de Application
  - **Mappers**: Transformación DTO ↔ Database Rows
  - **Types**: Tipos específicos de la BD/API

**Ejemplo de Adapter** (`SupabasePropertyRepo.ts`):
```typescript
export class SupabasePropertyRepo implements PropertyRepo {
  constructor(private deps: { 
    client: SupabaseClient; 
    auth: AuthService; 
    clock: Clock 
  }) {}

  async create(input: CreatePropertyDTO): Promise<Result<{ id: string }>> {
    const payload = mapPropertyDtoToInsertPayload(input);
    const { data, error } = await this.deps.client
      .from('properties')
      .insert(payload)
      .select('id')
      .single();
    
    if (error) return Result.fail(mapPostgrestError(error));
    return Result.ok({ id: data.id });
  }
  
  // ... otras implementaciones
}
```

#### **CAPA 4: UI (Presentación)**
- **Ubicación**: `src/modules/{module}/UI/`
- **Responsabilidad**: Componentes React, hooks, páginas
- **Elementos**:
  - **Pages**: Páginas completas con su propia carpeta
  - **Components**: Componentes reutilizables del módulo
  - **Hooks**: Custom hooks que usan los use cases
  - **Utils**: Formatters, helpers de UI

**Ejemplo de Hook** (`usePropertiesActions.ts`):
```typescript
export function usePropertiesActions() {
  const container = useMemo(() => createPropertiesContainer(), []);
  
  const listProperties = useCallback(
    async (filters: unknown) => {
      return await container.useCases.listProperties.execute(filters);
    },
    [container]
  );
  
  return { listProperties, /* ... */ };
}
```

### b) **Dependency Injection Container**

Cada módulo tiene un archivo `{module}.container.ts` que:
- Instancia todas las dependencias
- Conecta Ports con Adapters
- Expone los Use Cases listos para usar

**Ejemplo** (`properties.container.ts`):
```typescript
export function createPropertiesContainer(deps: PropertiesContainerDeps = {}): PropertiesContainer {
  const client = deps.client ?? supabase;
  const clock = deps.clock ?? defaultClock;

  // Instanciar adapters
  const auth = new SupabaseAuthService({ client });
  const propertyRepo = new SupabasePropertyRepo({ client, auth, clock });
  const mediaStorage = new SupabaseMediaStorage({ supabase: client, authService: auth });

  // Instanciar use cases con sus dependencias
  return {
    useCases: {
      listProperties: new ListProperties({ repo: propertyRepo, clock }),
      createProperty: new CreateProperty({ repo: propertyRepo, auth, clock }),
      publishProperty: new PublishProperty({ repo: propertyRepo, auth, clock }),
      // ...
    },
  };
}
```

### c) **Flujo de dependencias**

```
UI (React Components/Hooks)
    ↓ usa
Application (Use Cases)
    ↓ depende de (Ports/Interfaces)
Infrastructure (Adapters)
    ↓ usa
External Services (Supabase, APIs)

Domain (Entities, Value Objects, Policies)
    ↑ usado por Application y Domain mismo
    (NO depende de nada externo)
```

**Principio de Inversión de Dependencias**: 
- Application define interfaces (Ports)
- Infrastructure implementa esas interfaces (Adapters)
- Application NO conoce detalles de Infrastructure

---

## 3. INTEGRACIÓN CON SUPABASE

### a) **Cliente centralizado de Supabase**

**Ubicación**: `src/core/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
```

**Características**:
- ✅ Instancia singleton compartida por toda la app
- ✅ Configuración centralizada desde variables de entorno
- ✅ Persistencia de sesión habilitada
- ✅ Auto-refresh de tokens
- ❌ **NO hay configuración de Realtime actualmente**

### b) **Uso en los módulos**

Los adapters de Infrastructure importan el cliente:

```typescript
// En SupabasePropertyRepo.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabasePropertyRepo {
  constructor(private deps: { client: SupabaseClient; /* ... */ }) {}
  
  async getById(id: string) {
    const { data, error } = await this.deps.client
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    // ...
  }
}
```

Y el container inyecta el cliente:

```typescript
import { supabase } from "../../core/supabase/client";

export function createPropertiesContainer(deps = {}) {
  const client = deps.client ?? supabase; // Permite inyectar mock para tests
  // ...
}
```

### c) **¿Supabase Realtime ya está implementado?**

**NO**. No hay uso de Realtime en el proyecto actualmente:
- No hay llamadas a `.channel()`
- No hay suscripciones a cambios en tiempo real
- No hay imports de `RealtimeChannel` o `RealtimeClient`

### d) **Configuración necesaria para Realtime**

Para el módulo de chat necesitarás:

1. **Habilitar Realtime en las tablas de Supabase**:
```sql
-- Ya está habilitado en las migraciones (0800_chat.sql crea las tablas)
-- Solo asegurar que Realtime esté activo en el dashboard de Supabase
```

2. **Configurar el cliente** (opcional, ya funciona con configuración por defecto):
```typescript
export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { /* ... */ },
    realtime: {
      params: {
        eventsPerSecond: 10, // Throttle para evitar sobrecarga
      },
    },
  }
);
```

3. **Patrón de suscripción en React**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`chat:${threadId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      }, 
      (payload) => {
        // Handle new message
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [threadId]);
```

---

## 4. SCHEMA DE BASE DE DATOS DE CHAT

### a) **Tablas existentes** (en `database/migrations/0800_chat.sql`)

#### **chat_threads**
```sql
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  contact_id uuid references public.lead_contacts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
```

**Campos**:
- `id`: Identificador único del thread
- `org_id`: Organización dueña del thread (para RLS)
- `property_id`: Propiedad asociada (nullable, puede ser chat general)
- `contact_id`: Lead/contacto participante (nullable si es usuario autenticado)
- `created_by`: Usuario que inició el chat
- `last_message_at`: Timestamp del último mensaje (para ordenar inbox)

#### **chat_participants**
```sql
create table if not exists public.chat_participants (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  contact_id uuid references public.lead_contacts(id) on delete cascade,
  primary key (thread_id, user_id, contact_id)
);
```

**Campos**:
- `thread_id`: Thread al que pertenece
- `user_id`: Usuario autenticado participante (nullable)
- `contact_id`: Contacto/lead participante (nullable)
- **PK compuesta**: Evita duplicados

**Nota**: Un participante es O un usuario autenticado O un contacto/lead

#### **chat_messages**
```sql
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_type sender_type_enum not null,
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_contact_id uuid references public.lead_contacts(id) on delete set null,
  body text,
  payload jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz
);

create index if not exists idx_chat_messages_thread_time 
  on public.chat_messages(thread_id, created_at);
```

**Campos**:
- `sender_type`: Enum `'user' | 'contact' | 'system'`
- `sender_user_id`: Si sender_type='user'
- `sender_contact_id`: Si sender_type='contact'
- `body`: Texto del mensaje (nullable para mensajes especiales)
- `payload`: Datos extras en JSONB (attachments, metadata)
- `delivered_at`: Cuándo se entregó el mensaje
- `read_at`: Cuándo se marcó como leído

**Estados del mensaje**:
- `sent`: `created_at` existe
- `delivered`: `delivered_at` existe
- `read`: `read_at` existe

#### **Enum sender_type_enum**
```sql
-- En 0100_enums.sql
do $$begin 
  create type sender_type_enum as enum ('user','contact','system'); 
exception when duplicate_object then null; 
end$$;
```

### b) **Tabla lead_contacts** (relacionada)
```sql
-- En 0700_tracking_attribution.sql
create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email citext,
  phone text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_lead_contacts_email_unique 
  on public.lead_contacts (lower(email)) where email is not null;
create unique index if not exists idx_lead_contacts_phone_unique 
  on public.lead_contacts ((regexp_replace(phone,'\D','','g'))) 
  where phone is not null;
```

**Características**:
- Almacena leads capturados (usuarios NO autenticados)
- Email único (case-insensitive)
- Teléfono único (solo dígitos)

### c) **Políticas RLS** (en `1610_rls_policies.sql`)

```sql
-- Threads: usuarios de la org pueden leer/escribir
create policy threads_org_rw on public.chat_threads
  for all using (public.is_in_org(org_id)) 
  with check (public.is_in_org(org_id));

-- Participants: heredan permisos del thread
create policy participants_org_rw on public.chat_participants
  for all using (
    exists (
      select 1 from public.chat_threads t 
      where t.id = thread_id and public.is_in_org(t.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.chat_threads t 
      where t.id = thread_id and public.is_in_org(t.org_id)
    )
  );

-- Messages: heredan permisos del thread
create policy messages_thread_scope on public.chat_messages
  for all using (
    exists (
      select 1 from public.chat_threads t 
      where t.id = thread_id and public.is_in_org(t.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.chat_threads t 
      where t.id = thread_id and public.is_in_org(t.org_id)
    )
  );
```

**Importante**: 
- Los mensajes se filtran por `org_id` del thread
- Usuarios autenticados de la org pueden leer/escribir
- Leads NO autenticados necesitarán acceso especial (revisar políticas)

---

## 5. ESTRUCTURA DE ARCHIVOS PROPUESTA PARA EL MÓDULO DE CHAT

Basándose en la arquitectura existente de `properties`:

```
src/modules/chat/
├── domain/
│   ├── entities/
│   │   ├── ChatThread.ts           # Entidad Thread con lógica de negocio
│   │   ├── ChatMessage.ts          # Entidad Message (estados, validaciones)
│   │   ├── Participant.ts          # Entidad Participant
│   │   ├── LeadContact.ts          # Entidad para leads no autenticados
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── MessageBody.ts          # Validación de contenido
│   │   ├── ThreadId.ts             # Value object para IDs tipados
│   │   └── index.ts
│   ├── services/
│   │   └── MessageDeliveryService.ts  # Lógica de entrega/lectura
│   ├── policies/
│   │   ├── ThreadAccessPolicy.ts   # Quién puede acceder a un thread
│   │   └── MessageSendPolicy.ts    # Validaciones antes de enviar
│   ├── errors/
│   │   ├── ChatError.ts            # Error base del dominio
│   │   ├── ThreadNotFoundError.ts
│   │   └── UnauthorizedAccessError.ts
│   ├── enums.ts                     # SenderType, MessageStatus, etc.
│   ├── clock.ts                     # Abstracción del tiempo
│   └── index.ts
├── application/
│   ├── use-cases/
│   │   ├── thread/
│   │   │   ├── CreateThread.ts          # Crear thread (desde PropertyDetail o inbox)
│   │   │   ├── GetThread.ts             # Obtener thread por ID
│   │   │   ├── ListThreads.ts           # Listar threads (inbox)
│   │   │   ├── ArchiveThread.ts         # Archivar conversación
│   │   │   └── MarkThreadAsRead.ts      # Marcar todos los mensajes como leídos
│   │   ├── message/
│   │   │   ├── SendMessage.ts           # Enviar mensaje
│   │   │   ├── GetMessages.ts           # Obtener mensajes de un thread
│   │   │   ├── MarkAsDelivered.ts       # Actualizar estado a delivered
│   │   │   ├── MarkAsRead.ts            # Actualizar estado a read
│   │   │   └── DeleteMessage.ts         # Soft delete de mensaje
│   │   ├── participant/
│   │   │   ├── AddParticipant.ts        # Agregar participante a thread
│   │   │   ├── RemoveParticipant.ts     # Remover participante
│   │   │   └── GetParticipants.ts       # Listar participantes
│   │   ├── lead/
│   │   │   ├── CreateOrGetLead.ts       # Crear/obtener lead por email/phone
│   │   │   └── UpdateLead.ts            # Actualizar info del lead
│   │   └── realtime/
│   │       ├── SubscribeToThread.ts     # Setup de suscripción realtime
│   │       ├── BroadcastTyping.ts       # Emitir evento "escribiendo"
│   │       └── UnsubscribeFromThread.ts # Cleanup de suscripciones
│   ├── ports/
│   │   ├── ChatThreadRepo.ts       # Interface para repositorio de threads
│   │   ├── ChatMessageRepo.ts      # Interface para repositorio de mensajes
│   │   ├── LeadContactRepo.ts      # Interface para repositorio de leads
│   │   ├── RealtimeService.ts      # Interface para servicio de realtime
│   │   ├── NotificationService.ts  # Interface para notificaciones
│   │   └── AuthService.ts          # Reutilizar de shared o properties
│   ├── dto/
│   │   ├── ThreadDTO.ts            # DTO de Thread con campos calculados
│   │   ├── MessageDTO.ts           # DTO de Message
│   │   ├── ParticipantDTO.ts       # DTO de Participant
│   │   ├── LeadDTO.ts              # DTO de Lead
│   │   └── FiltersDTO.ts           # Filtros para listados
│   ├── mappers/
│   │   ├── thread.mapper.ts        # Domain ↔ DTO
│   │   ├── message.mapper.ts
│   │   ├── participant.mapper.ts
│   │   └── lead.mapper.ts
│   ├── validators/
│   │   ├── thread.schema.ts        # Validación con Zod
│   │   ├── message.schema.ts
│   │   └── lead.schema.ts
│   ├── fakes/
│   │   ├── FakeChatThreadRepo.ts   # Mock para tests
│   │   └── FakeRealtimeService.ts
│   └── _shared/
│       └── result.ts               # Reutilizar de properties
├── infrastructure/
│   ├── adapters/
│   │   ├── SupbaseChatThreadRepo.ts     # Implementación con Supabase
│   │   ├── SupabaseChatMessageRepo.ts
│   │   ├── SupbaseLeadContactRepo.ts
│   │   ├── SupabaseRealtimeService.ts   # Wrapper de Supabase Realtime
│   │   └── SupabaseNotificationService.ts
│   ├── mappers/
│   │   ├── thread-row.mapper.ts    # DTO ↔ Database Row
│   │   ├── message-row.mapper.ts
│   │   └── lead-row.mapper.ts
│   └── types/
│       ├── chat-rows.ts            # Tipos de rows de la BD
│       └── realtime-events.ts      # Tipos de eventos realtime
├── UI/
│   ├── pages/
│   │   └── ChatInboxPage/
│   │       ├── ChatInboxPage.tsx
│   │       ├── ChatInboxPage.module.css
│   │       ├── index.ts
│   │       ├── hooks/
│   │       │   ├── useChatInbox.ts         # Hook principal del inbox
│   │       │   └── useUnreadCount.ts       # Hook para badge de no leídos
│   │       └── components/
│   │           ├── ThreadList.tsx          # Sidebar con lista de threads
│   │           ├── ThreadListItem.tsx      # Item individual de thread
│   │           ├── ConversationPanel.tsx   # Panel derecho con mensajes
│   │           ├── ProspectInfoPanel.tsx   # Info del lead/prospecto
│   │           └── EmptyInbox.tsx          # Estado vacío
│   ├── components/
│   │   ├── ChatWidget/
│   │   │   ├── ChatWidget.tsx              # Widget flotante para PropertyDetail
│   │   │   ├── ChatWidget.module.css
│   │   │   ├── ChatWidgetButton.tsx        # Botón flotante
│   │   │   ├── ChatWidgetDialog.tsx        # Diálogo con chat
│   │   │   ├── LeadCaptureForm.tsx         # Formulario para usuarios no auth
│   │   │   └── index.ts
│   │   ├── MessageList/
│   │   │   ├── MessageList.tsx             # Lista virtualizada de mensajes
│   │   │   ├── MessageList.module.css
│   │   │   ├── MessageItem.tsx             # Mensaje individual
│   │   │   ├── MessageBubble.tsx           # Burbuja de mensaje
│   │   │   ├── TypingIndicator.tsx         # "Usuario escribiendo..."
│   │   │   └── index.ts
│   │   ├── MessageInput/
│   │   │   ├── MessageInput.tsx            # Input con detección de tecleo
│   │   │   ├── MessageInput.module.css
│   │   │   └── index.ts
│   │   ├── ThreadActions/
│   │   │   ├── ThreadActions.tsx           # Acciones: archivar, agendar, etc.
│   │   │   └── ThreadActions.module.css
│   │   └── UnreadBadge/
│   │       ├── UnreadBadge.tsx             # Badge con contador
│   │       └── UnreadBadge.module.css
│   ├── hooks/
│   │   ├── useChatActions.ts          # Hook para acciones de chat (send, mark read, etc.)
│   │   ├── useChat.ts                 # Hook principal para un thread específico
│   │   ├── useChatRealtime.ts         # Hook para suscripción realtime
│   │   ├── useTypingIndicator.ts      # Hook para "escribiendo..."
│   │   └── useMessageStatus.ts        # Hook para estados de mensajes
│   ├── utils/
│   │   ├── formatTimestamp.ts         # Formatear "hace 5 min", "Ayer", etc.
│   │   ├── groupMessagesByDate.ts     # Agrupar mensajes por fecha
│   │   └── generateThreadTitle.ts     # Generar título del thread
│   └── index.ts
└── chat.container.ts                  # Dependency Injection Container
```

### **Responsabilidades por archivo (archivos clave)**

#### **Domain Layer**

**ChatThread.ts**:
```typescript
export class ChatThread {
  readonly id: UniqueEntityID;
  readonly orgId: UniqueEntityID;
  readonly propertyId?: UniqueEntityID;
  private _lastMessageAt?: Date;
  private _participants: Participant[];
  
  addMessage(message: ChatMessage): void {
    this._lastMessageAt = message.createdAt;
    this.touch();
  }
  
  markAllAsRead(userId: string): void { /* ... */ }
  canAccess(userId: string, role: Role): boolean { /* ... */ }
}
```

**ChatMessage.ts**:
```typescript
export class ChatMessage {
  readonly id: UniqueEntityID;
  readonly threadId: UniqueEntityID;
  private _body: MessageBody;
  private _deliveredAt?: Date;
  private _readAt?: Date;
  
  markAsDelivered(at: Date): void { /* ... */ }
  markAsRead(at: Date): void { /* ... */ }
  get status(): 'sent' | 'delivered' | 'read' { /* ... */ }
}
```

#### **Application Layer**

**SendMessage.ts**:
```typescript
export class SendMessage {
  constructor(private deps: {
    messageRepo: ChatMessageRepo;
    threadRepo: ChatThreadRepo;
    realtimeService: RealtimeService;
    auth: AuthService;
  }) {}
  
  async execute(input: SendMessageInput): Promise<Result<MessageDTO>> {
    // 1. Validar input
    // 2. Obtener auth context
    // 3. Verificar acceso al thread
    // 4. Crear entidad Message
    // 5. Persistir
    // 6. Broadcast vía realtime
    // 7. Actualizar last_message_at del thread
  }
}
```

**ListThreads.ts**:
```typescript
export class ListThreads {
  async execute(filters: ThreadFiltersDTO): Promise<Result<Page<ThreadDTO>>> {
    // 1. Validar filtros
    // 2. Obtener userId del contexto
    // 3. Aplicar filtros (unread, archived, por propiedad)
    // 4. Ordenar por last_message_at DESC
    // 5. Paginar
    // 6. Incluir contador de no leídos por thread
  }
}
```

#### **Infrastructure Layer**

**SupabaseRealtimeService.ts**:
```typescript
export class SupabaseRealtimeService implements RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  async subscribeToThread(
    threadId: string, 
    callbacks: {
      onNewMessage: (msg: MessageDTO) => void;
      onTyping: (userId: string) => void;
      onMessageRead: (messageId: string) => void;
    }
  ): Promise<Result<void>> {
    const channel = this.client
      .channel(`chat:${threadId}`)
      .on('postgres_changes', { /* ... */ }, callbacks.onNewMessage)
      .on('broadcast', { event: 'typing' }, callbacks.onTyping)
      .subscribe();
    
    this.channels.set(threadId, channel);
    return Result.ok(undefined);
  }
  
  async unsubscribe(threadId: string): Promise<void> {
    const channel = this.channels.get(threadId);
    if (channel) {
      await this.client.removeChannel(channel);
      this.channels.delete(threadId);
    }
  }
  
  async broadcastTyping(threadId: string, userId: string): Promise<void> {
    const channel = this.channels.get(threadId);
    await channel?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, timestamp: Date.now() }
    });
  }
}
```

#### **UI Layer**

**useChat.ts**:
```typescript
export function useChat(threadId: string) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<string[]>([]);
  const { sendMessage, markAsRead } = useChatActions();
  
  // Cargar mensajes iniciales
  useEffect(() => {
    loadMessages(threadId).then(setMessages);
  }, [threadId]);
  
  // Suscripción realtime
  useChatRealtime(threadId, {
    onNewMessage: (msg) => setMessages(prev => [...prev, msg]),
    onTyping: (userId) => { /* agregar a typing */ },
    onMessageRead: (msgId) => { /* actualizar estado */ }
  });
  
  const handleSend = async (body: string) => {
    const result = await sendMessage({ threadId, body });
    // El mensaje se agregará vía suscripción realtime
  };
  
  return {
    messages,
    loading,
    typing,
    sendMessage: handleSend,
    markAsRead
  };
}
```

**ChatWidget.tsx** (para PropertyDetailPage):
```typescript
export function ChatWidget({ propertyId }: { propertyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const { user } = useAuth();
  const { createThread } = useChatActions();
  
  const handleOpen = async () => {
    if (!user) {
      // Mostrar LeadCaptureForm
      return;
    }
    
    // Crear o obtener thread existente
    const result = await createThread({ propertyId });
    if (result.isOk()) {
      setThreadId(result.value.id);
      setIsOpen(true);
    }
  };
  
  return (
    <>
      <ChatWidgetButton onClick={handleOpen} />
      {isOpen && threadId && (
        <ChatWidgetDialog 
          threadId={threadId} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
```

---

**FIN DE PARTE 1**

La Parte 2 incluirá:
- 6. Integración con módulos existentes
- 7. Dependencias y configuración
- 8. Flujos de datos detallados
- 9. Estado y contexto
- 10. Casos edge y testing
