# 📊 Flujo del Sistema de Telemetría

## 🔄 Flujo Completo de Tracking

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIO INTERACTÚA                            │
│                    (Click en propiedad / Vista)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENTE UI (React)                             │
│  • PropertyPublicCard     → trackPropertyClick()                     │
│  • PropertyQuickView      → trackPropertyView()                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   HOOK: useTelemetry()                               │
│  • Obtiene userId de Supabase Auth (o null si anónimo)              │
│  • Llama a TrackEventUseCase.execute()                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│               USE CASE: TrackEventUseCase                            │
│  • Crea objeto Event con datos del evento                            │
│  • Llama a eventRepository.trackEvent()                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│          REPOSITORY: SupabaseEventRepository                         │
│  • Genera fingerprint del navegador:                                 │
│    - User Agent                                                      │
│    - Resolución pantalla (width x height)                            │
│    - Zona horaria                                                    │
│  • Prepara metadata (incluye userAgent)                              │
│  • Llama a supabase.rpc('track_property_event')                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            SUPABASE RPC: track_property_event()                      │
│                                                                       │
│  PASO 1: Gestión de Fingerprint                                      │
│  ┌───────────────────────────────────────────────────────┐          │
│  │ ¿Existe fingerprint con este hash?                    │          │
│  │   SÍ  → Reutilizar                                    │          │
│  │   NO  → Crear nuevo en tabla fingerprints            │          │
│  └───────────────────────────────────────────────────────┘          │
│                             │                                         │
│                             ▼                                         │
│  PASO 2: Gestión de Sesión                                          │
│  ┌───────────────────────────────────────────────────────┐          │
│  │ ¿Existe sesión activa? (last_seen < 30 min)          │          │
│  │   SÍ  → Reutilizar y actualizar last_seen_at         │          │
│  │   NO  → Crear nueva sesión                           │          │
│  └───────────────────────────────────────────────────────┘          │
│                             │                                         │
│                             ▼                                         │
│  PASO 3: Obtener org_id                                             │
│  ┌───────────────────────────────────────────────────────┐          │
│  │ SELECT org_id FROM properties                         │          │
│  │ WHERE id = p_property_id                              │          │
│  └───────────────────────────────────────────────────────┘          │
│                             │                                         │
│                             ▼                                         │
│  PASO 4: Insertar Evento                                            │
│  ┌───────────────────────────────────────────────────────┐          │
│  │ INSERT INTO events (                                  │          │
│  │   session_id,      ← De PASO 2                        │          │
│  │   user_id,         ← Parámetro (null si anónimo)      │          │
│  │   org_id,          ← De PASO 3                        │          │
│  │   property_id,     ← Parámetro                        │          │
│  │   event_type,      ← Parámetro                        │          │
│  │   payload,         ← Metadata (JSON)                  │          │
│  │   occurred_at      ← now()                            │          │
│  │ )                                                      │          │
│  └───────────────────────────────────────────────────────┘          │
│                             │                                         │
│                             ▼                                         │
│  PASO 5: Retornar Resultado                                         │
│  ┌───────────────────────────────────────────────────────┐          │
│  │ RETURN jsonb_build_object(                            │          │
│  │   'id', event_id,                                     │          │
│  │   'session_id', session_id,                           │          │
│  │   'fingerprint_id', fingerprint_id,                   │          │
│  │   'event_type', event_type,                           │          │
│  │   'occurred_at', timestamp                            │          │
│  │ )                                                      │          │
│  └───────────────────────────────────────────────────────┘          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TRIGGER: events_after_insert_sync_metrics               │
│  (Se ejecuta automáticamente después del INSERT)                     │
│                                                                       │
│  • Obtiene lister_user_id de la propiedad                            │
│  • ¿user_id == lister_user_id? (¿dueño viendo su propiedad?)        │
│    - SÍ:  Solo actualiza last_event_at (no cuenta en métricas)      │
│    - NO:  Incrementa contador según event_type:                      │
│             * page_view      → views_count++                         │
│             * property_click → clicks_count++                        │
│             * first_contact  → contacts_count++                      │
│             * share          → shares_count++                        │
│             * chat_message   → chat_messages_count++                 │
│                                                                       │
│  • UPSERT en properties_metrics:                                     │
│    - Si existe: incrementa contadores                                │
│    - Si no existe: crea fila nueva                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TABLAS ACTUALIZADAS                              │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  fingerprints    │  │    sessions      │  │     events       │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  │
│  │ • fp_hash        │  │ • fingerprint_id │  │ • session_id     │  │
│  │ • user_agent     │  │ • user_id        │  │ • user_id        │  │
│  │ • created_at     │  │ • started_at     │  │ • property_id    │  │
│  └──────────────────┘  │ • last_seen_at   │  │ • event_type     │  │
│                        │ • utm            │  │ • occurred_at    │  │
│                        └──────────────────┘  └──────────────────┘  │
│                                                                       │
│                         ┌──────────────────────────────────┐        │
│                         │    properties_metrics            │        │
│                         ├──────────────────────────────────┤        │
│                         │ • property_id (PK)               │        │
│                         │ • views_count                    │        │
│                         │ • clicks_count                   │        │
│                         │ • contacts_count                 │        │
│                         │ • shares_count                   │        │
│                         │ • chat_messages_count            │        │
│                         │ • last_event_at                  │        │
│                         │ • updated_at                     │        │
│                         └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔑 Conceptos Clave

### Fingerprint (Huella Digital del Navegador)
```
Hash generado a partir de:
  • User Agent (navegador)
  • Resolución de pantalla
  • Zona horaria

Ejemplo:
  "Mozilla/5.0...-1920-1080-America/Mexico_City"
  → Hash: "k9m2p7q4"

Propósito:
  • Identificar el mismo dispositivo/navegador entre sesiones
  • Funciona para usuarios anónimos
  • No requiere cookies
```

### Sesión
```
Duración: 30 minutos de inactividad

Reutilización:
  • Si last_seen_at < 30 min → Reutilizar sesión
  • Si last_seen_at > 30 min → Crear nueva sesión

Actualización:
  • Cada evento actualiza last_seen_at = now()

Asociación:
  • Una sesión puede tener múltiples eventos
  • Una sesión pertenece a un fingerprint
  • Una sesión puede tener user_id (autenticado) o NULL (anónimo)
```

### Evento
```
Tipos soportados:
  • page_view       - Vista de página de propiedad
  • property_click  - Click en card de propiedad
  • first_contact   - Primer contacto con propietario
  • share           - Compartir propiedad
  • chat_message    - Mensaje en chat

Metadata (ejemplos):
  {
    "source": "home" | "search" | "quick_view",
    "propertyType": "house" | "apartment" | ...,
    "hasImage": true | false,
    "status": "active" | "sold" | ...,
    "userAgent": "Mozilla/5.0..."
  }
```

### Métricas
```
Cálculo en tiempo real via trigger:
  • Cada INSERT en events → UPDATE en properties_metrics

Exclusión de auto-vistas:
  • Si user_id == property.lister_user_id
    → NO incrementa contadores (evita inflación)
    → SÍ actualiza last_event_at (tracking de actividad)

Agregación:
  • views_count      = COUNT(page_view)
  • clicks_count     = COUNT(property_click)
  • contacts_count   = COUNT(first_contact)
  • shares_count     = COUNT(share)
  • chat_messages_count = COUNT(chat_message)
```

## 📈 Ejemplo de Flujo Real

### Usuario Anónimo hace Click en Propiedad

```
1. Usuario ve homepage
   └─ PropertyPublicCard renderiza card de "Casa en Polanco"

2. Usuario hace click en card
   └─ onClick() → trackPropertyClick('prop-123', {source: 'home', ...})

3. useTelemetry hook
   └─ supabase.auth.getUser() → null (anónimo)
   └─ TrackEventUseCase.execute({
        eventType: 'property_click',
        propertyId: 'prop-123',
        userId: null,
        metadata: {source: 'home', propertyType: 'house', hasImage: true}
      })

4. SupabaseEventRepository.trackEvent()
   └─ generateFingerprint() → "k9m2p7q4"
   └─ supabase.rpc('track_property_event', {
        p_fingerprint_hash: "k9m2p7q4",
        p_property_id: "prop-123",
        p_user_id: null,
        p_event_type: "property_click",
        p_metadata: {source: 'home', ...}
      })

5. RPC Function track_property_event()
   
   5.1. Fingerprint
        SELECT id FROM fingerprints WHERE fp_hash = 'k9m2p7q4'
        → No existe
        → INSERT INTO fingerprints (...) RETURNING id
        → fingerprint_id = "fp-abc-123"
   
   5.2. Sesión
        SELECT id FROM sessions 
        WHERE fingerprint_id = 'fp-abc-123' 
          AND last_seen_at > (now() - interval '30 min')
        → No existe
        → INSERT INTO sessions (...) RETURNING id
        → session_id = "sess-xyz-789"
   
   5.3. Org ID
        SELECT org_id FROM properties WHERE id = 'prop-123'
        → org_id = "org-456"
   
   5.4. Insertar Evento
        INSERT INTO events (
          session_id,    -- "sess-xyz-789"
          user_id,       -- NULL
          org_id,        -- "org-456"
          property_id,   -- "prop-123"
          event_type,    -- "property_click"
          payload,       -- {"source": "home", ...}
          occurred_at    -- "2025-10-29 14:30:00"
        )
        → event_id = "evt-001"
   
   5.5. Retornar
        RETURN {
          "id": "evt-001",
          "session_id": "sess-xyz-789",
          "fingerprint_id": "fp-abc-123",
          "event_type": "property_click",
          "occurred_at": "2025-10-29T14:30:00Z"
        }

6. TRIGGER events_after_insert_sync_metrics
   
   6.1. Verificar auto-vista
        SELECT lister_user_id FROM properties WHERE id = 'prop-123'
        → lister_user_id = "user-999"
        → user_id (NULL) != lister_user_id ("user-999")
        → No es auto-vista, contar en métricas
   
   6.2. Determinar contador
        event_type = 'property_click' → clicks_delta = 1
   
   6.3. UPSERT en properties_metrics
        INSERT INTO properties_metrics (
          property_id,
          clicks_count,
          last_event_at,
          updated_at
        ) VALUES (
          'prop-123',
          1,
          '2025-10-29 14:30:00',
          now()
        )
        ON CONFLICT (property_id) DO UPDATE SET
          clicks_count = properties_metrics.clicks_count + 1,
          last_event_at = GREATEST(...),
          updated_at = now()

7. Respuesta a UI
   └─ Console log: ✅ Event tracked successfully: {...}
   └─ Usuario navega a detalle de propiedad

8. Base de Datos Resultante
   
   fingerprints:
   ┌──────────────┬────────────┬──────────────────────────┐
   │ id           │ fp_hash    │ user_agent               │
   ├──────────────┼────────────┼──────────────────────────┤
   │ fp-abc-123   │ k9m2p7q4   │ Mozilla/5.0 (Windows...  │
   └──────────────┴────────────┴──────────────────────────┘
   
   sessions:
   ┌──────────────┬────────────────┬─────────┬──────────────────┐
   │ id           │ fingerprint_id │ user_id │ last_seen_at     │
   ├──────────────┼────────────────┼─────────┼──────────────────┤
   │ sess-xyz-789 │ fp-abc-123     │ NULL    │ 2025-10-29 14:30 │
   └──────────────┴────────────────┴─────────┴──────────────────┘
   
   events:
   ┌──────────┬──────────────┬─────────┬─────────┬────────────────┐
   │ id       │ session_id   │ user_id │ prop_id │ event_type     │
   ├──────────┼──────────────┼─────────┼─────────┼────────────────┤
   │ evt-001  │ sess-xyz-789 │ NULL    │ prop-123│ property_click │
   └──────────┴──────────────┴─────────┴─────────┴────────────────┘
   
   properties_metrics:
   ┌─────────┬─────────────┬─────────────┬──────────────────┐
   │ prop_id │ views_count │ clicks_count│ last_event_at    │
   ├─────────┼─────────────┼─────────────┼──────────────────┤
   │ prop-123│      0      │      1      │ 2025-10-29 14:30 │
   └─────────┴─────────────┴─────────────┴──────────────────┘
```

## 🎯 Ventajas de Esta Arquitectura

### 1. Cross-Session Tracking
```
Mismo usuario en diferentes días:
  Día 1, 10:00 → fingerprint "k9m2p7q4" → sesión "sess-001"
  Día 1, 10:15 → fingerprint "k9m2p7q4" → sesión "sess-001" (reutilizada)
  Día 2, 15:00 → fingerprint "k9m2p7q4" → sesión "sess-002" (nueva)

Resultado:
  • Mismo fingerprint_id en múltiples sesiones
  • Analytics: "Este dispositivo ha visitado 5 propiedades"
```

### 2. Soporte de Usuarios Anónimos y Autenticados
```
Flujo típico:
  1. Usuario anónimo navega → user_id = NULL
  2. Usuario se registra → user_id = "user-123"
  3. Usuario continúa navegando → user_id = "user-123"

Sesión se actualiza:
  UPDATE sessions SET user_id = "user-123" WHERE id = ...

Analytics:
  • Misma sesión antes y después de auth
  • Se puede ver: "Usuarios anónimos que se convirtieron"
```

### 3. Prevención de Auto-Inflación
```
Propietario (user_id = "owner-999") ve su propia propiedad:
  
  Evento SE REGISTRA en tabla events:
    ✅ INSERT INTO events (user_id = "owner-999", property_id = "prop-123")
  
  Métricas NO SE INCREMENTAN:
    ❌ clicks_count NO aumenta
    ❌ views_count NO aumenta
    ✅ last_event_at SÍ se actualiza

Resultado:
  • Owner puede ver actividad en su propiedad
  • Pero no infla artificialmente las métricas
```

### 4. Metadata Extensible
```
Evento con contexto rico:
  {
    "source": "home",           → ¿De dónde vino el usuario?
    "propertyType": "house",    → ¿Qué tipo de propiedad?
    "hasImage": true,           → ¿Tenía foto?
    "position": 3,              → ¿En qué posición del listado?
    "filters": {...},           → ¿Qué filtros tenía aplicados?
    "userAgent": "...",         → ¿Qué dispositivo?
    "referrer": "...",          → ¿De qué sitio vino?
    "utm_source": "facebook",   → ¿De qué campaña?
    "utm_campaign": "summer"
  }

Análisis posible:
  • ¿Qué propiedades son más clickeadas desde Facebook?
  • ¿Qué dispositivos generan más conversiones?
  • ¿Qué posición en listado tiene mejor CTR?
```

---

**Nota:** Este diagrama es una representación visual del sistema. Para detalles de implementación, consulta los archivos de código fuente.
