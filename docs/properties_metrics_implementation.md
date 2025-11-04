# Properties Metrics Implementation Guide

## 📋 Resumen

Esta migration implementa un sistema de **métricas materializadas** para propiedades que agrega eventos en tiempo real desde la tabla `public.events` hacia `public.properties_metrics`. El objetivo es proporcionar acceso rápido a estadísticas agregadas sin ejecutar queries costosas cada vez.

### ⚠️ Comportamiento Importante: Exclusión de Auto-Interacciones

**El sistema NO cuenta eventos cuando el usuario es el propietario de la propiedad.**

- ✅ Usuario A ve propiedad de Usuario B → **Se cuenta**
- ❌ Usuario A (propietario) ve su propia propiedad → **NO se cuenta**
- 📊 Los eventos del propietario sí actualizan `last_event_at` (para tracking de actividad)

**Previene**: Que los propietarios inflen artificialmente las métricas de sus propiedades haciendo click/viendo desde su perfil.

---

## 🏗️ Arquitectura

### Componentes Principales

```
┌─────────────────┐
│  public.events  │
│  (insert event) │
└────────┬────────┘
         │
         │ TRIGGER: events_after_insert_sync_metrics
         ▼
┌─────────────────────────────────────────────────┐
│ sync_property_metrics_from_event()              │
│ (SECURITY DEFINER function)                     │
│ 1. Verifica property_id != NULL                 │
│ 2. Obtiene lister_user_id de la propiedad      │
│ 3. ¿event.user_id == lister_user_id?           │
│    ├─ SÍ → Solo actualiza last_event_at        │
│    └─ NO → Analiza event_type e incrementa     │
│             counter apropiado                   │
└────────┬────────────────────────────────────────┘
         │
         │ UPSERT (INSERT ... ON CONFLICT)
         ▼
┌───────────────────────────────┐
│ public.properties_metrics     │
│ - views_count                 │
│ - clicks_count                │
│ - contacts_count              │
│ - shares_count                │
│ - chat_messages_count         │
│ - last_event_at               │
│ - updated_at                  │
└───────────────────────────────┘
```

### Mapeo de Event Types

La función `sync_property_metrics_from_event()` mapea tipos de eventos a contadores **solo si el usuario NO es el propietario**:

| Event Type        | Counter Incrementado    | Nota |
|-------------------|------------------------|------|
| `page_view`       | `views_count`          | No cuenta si `user_id == lister_user_id` |
| `property_click`  | `clicks_count`         | No cuenta si `user_id == lister_user_id` |
| `first_contact`   | `contacts_count`       | No cuenta si `user_id == lister_user_id` |
| `share`           | `shares_count`         | No cuenta si `user_id == lister_user_id` |
| `chat_message`    | `chat_messages_count`  | No cuenta si `user_id == lister_user_id` |
| Otros             | Solo actualiza `last_event_at` | Siempre actualiza |

**Lógica de Exclusión:**
```sql
-- En el trigger, antes de incrementar counters:
IF NEW.user_id IS NOT NULL 
   AND property.lister_user_id IS NOT NULL 
   AND NEW.user_id = property.lister_user_id THEN
    -- Solo actualizar last_event_at, NO counters
END IF;
```

---

## 🔒 Seguridad: SECURITY DEFINER

### ¿Por qué SECURITY DEFINER?

La función está marcada como `SECURITY DEFINER`, lo que significa que **se ejecuta con los permisos del creador de la función** (típicamente el superusuario o propietario del schema), no con los permisos del usuario que disparó el trigger.

**Razón**: Las tablas tienen **Row Level Security (RLS)** habilitado. Si el trigger se ejecutara con permisos del usuario que inserta el evento, podría fallar al intentar actualizar `properties_metrics` debido a políticas RLS restrictivas.

### Mitigación de Riesgos

Para evitar que esta función sea llamada directamente por usuarios maliciosos:

```sql
REVOKE EXECUTE ON FUNCTION public.sync_property_metrics_from_event() 
FROM PUBLIC, anon, authenticated;
```

**Efecto**: Solo el trigger (que corre automáticamente en contexto del servidor) puede ejecutar esta función. Los usuarios no pueden llamarla manualmente.

### search_path Security

```sql
SET search_path = public
```

Previene ataques de **search path hijacking** donde un usuario podría crear funciones maliciosas en otro schema para sobreescribir `public` temporalmente.

---

## 🚀 Cómo Ejecutar la Migration

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a **Database > SQL Editor** en tu dashboard de Supabase
2. Copia todo el contenido de `database/migrations/2500_properties_metrics.sql`
3. Pega en el editor y haz clic en **Run**
4. Verifica que no haya errores en la consola

### Opción 2: CLI de Supabase

```bash
cd /home/luis/Proyectos/novDev/Novalia
supabase db push --db-url "postgresql://..."
```

### Opción 3: psql directo

```bash
psql "postgresql://postgres:password@db.project.supabase.co:5432/postgres" \
  -f database/migrations/2500_properties_metrics.sql
```

---

## 📊 Validación Post-Migration

Después de ejecutar la migration, corre estos queries para verificar:

### 1. Top 10 Propiedades Más Vistas

```sql
SELECT 
    pm.property_id,
    p.title AS property_title,
    pm.views_count,
    pm.clicks_count,
    pm.contacts_count,
    pm.shares_count,
    pm.last_event_at
FROM public.properties_metrics pm
JOIN public.properties p ON p.id = pm.property_id
ORDER BY pm.views_count DESC
LIMIT 10;
```

### 2. Verificar Consistencia (Events vs Metrics)

```sql
WITH events_sum AS (
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
        COUNT(*) FILTER (WHERE event_type = 'property_click') AS total_clicks
    FROM public.events
    WHERE property_id IS NOT NULL
),
metrics_sum AS (
    SELECT 
        SUM(views_count) AS total_views,
        SUM(clicks_count) AS total_clicks
    FROM public.properties_metrics
)
SELECT 'events' AS source, e.* FROM events_sum e
UNION ALL
SELECT 'metrics' AS source, m.* FROM metrics_sum m;
```

**Resultado esperado**: Ambas filas deben mostrar números idénticos.

### 3. Sample de una Propiedad Específica

```sql
WITH sample_property AS (
    SELECT property_id 
    FROM public.properties_metrics 
    WHERE views_count > 0 
    LIMIT 1
)
SELECT 
    'events_count' AS source,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
    MAX(occurred_at) AS last_event
FROM public.events
WHERE property_id = (SELECT property_id FROM sample_property)
UNION ALL
SELECT 
    'metrics_count' AS source,
    views_count AS views,
    last_event_at AS last_event
FROM public.properties_metrics
WHERE property_id = (SELECT property_id FROM sample_property);
```

---

## 💻 Integración en tu Código Frontend/Backend

### 1. Consultar Métricas desde TypeScript (Supabase Client)

```typescript
// src/modules/properties/infrastructure/PropertyMetricsRepository.ts

import { supabase } from '@/core/supabase/client';

export interface PropertyMetrics {
  property_id: string;
  views_count: number;
  clicks_count: number;
  contacts_count: number;
  shares_count: number;
  chat_messages_count: number;
  last_event_at: string | null;
  updated_at: string;
}

export async function getPropertyMetrics(
  propertyId: string
): Promise<PropertyMetrics | null> {
  const { data, error } = await supabase
    .from('properties_metrics')
    .select('*')
    .eq('property_id', propertyId)
    .single();

  if (error) {
    console.error('Error fetching property metrics:', error);
    return null;
  }

  return data;
}

export async function getTopViewedProperties(
  limit: number = 10
): Promise<PropertyMetrics[]> {
  const { data, error } = await supabase
    .from('properties_metrics')
    .select(`
      *,
      properties:property_id (
        id,
        title,
        price,
        location
      )
    `)
    .order('views_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top properties:', error);
    return [];
  }

  return data || [];
}
```

### 2. Mostrar Métricas en UI (React Component)

```tsx
// src/modules/properties/UI/PropertyMetricsCard.tsx

import React, { useEffect, useState } from 'react';
import { getPropertyMetrics, PropertyMetrics } from '../infrastructure/PropertyMetricsRepository';

interface Props {
  propertyId: string;
}

export const PropertyMetricsCard: React.FC<Props> = ({ propertyId }) => {
  const [metrics, setMetrics] = useState<PropertyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      const data = await getPropertyMetrics(propertyId);
      setMetrics(data);
      setLoading(false);
    }
    loadMetrics();
  }, [propertyId]);

  if (loading) return <div>Cargando métricas...</div>;
  if (!metrics) return <div>No hay métricas disponibles</div>;

  return (
    <div className="metrics-card">
      <h3>Estadísticas de la Propiedad</h3>
      <div className="metrics-grid">
        <MetricItem icon="👁️" label="Vistas" value={metrics.views_count} />
        <MetricItem icon="🖱️" label="Clics" value={metrics.clicks_count} />
        <MetricItem icon="✉️" label="Contactos" value={metrics.contacts_count} />
        <MetricItem icon="🔗" label="Compartidos" value={metrics.shares_count} />
        <MetricItem icon="💬" label="Mensajes" value={metrics.chat_messages_count} />
      </div>
      {metrics.last_event_at && (
        <p className="last-event">
          Último evento: {new Date(metrics.last_event_at).toLocaleString()}
        </p>
      )}
    </div>
  );
};

const MetricItem: React.FC<{ icon: string; label: string; value: number }> = ({
  icon,
  label,
  value,
}) => (
  <div className="metric-item">
    <span className="icon">{icon}</span>
    <span className="label">{label}</span>
    <span className="value">{value.toLocaleString()}</span>
  </div>
);
```

### 3. Registrar Eventos (No requiere cambios)

La belleza de este sistema es que **solo necesitas insertar eventos** como ya lo haces. El trigger se encarga automáticamente de actualizar las métricas:

```typescript
// src/modules/telemetry/domain/EventTracker.ts

import { supabase } from '@/core/supabase/client';

export async function trackPropertyView(propertyId: string, userId?: string) {
  await supabase.from('events').insert({
    event_type: 'page_view',
    property_id: propertyId,
    user_id: userId, // ⚠️ IMPORTANTE: Siempre pasar el userId cuando esté disponible
    occurred_at: new Date().toISOString(),
    // ... otros campos
  });
  
  // ✅ El trigger actualiza properties_metrics automáticamente
  // ✅ Si userId == propietario, NO se cuenta (previene inflación)
  // No necesitas código adicional
}

export async function trackPropertyClick(propertyId: string, userId?: string) {
  await supabase.from('events').insert({
    event_type: 'property_click',
    property_id: propertyId,
    user_id: userId, // ⚠️ CRÍTICO para la lógica de exclusión
    occurred_at: new Date().toISOString(),
  });
}
```

**⚠️ IMPORTANTE**: Siempre pasa el `user_id` cuando lo tengas disponible. Esto permite que el trigger:
1. Identifique si el usuario es el propietario
2. Excluya auto-interacciones de las métricas
3. Mantenga la integridad de los datos

---

## 🔍 Casos de Uso: Exclusión de Auto-Interacciones

### Escenario 1: Usuario Normal Viendo Propiedad
```typescript
// Usuario con ID "user-123" ve propiedad de otro usuario
trackPropertyView("property-abc", "user-123");

// ✅ Result: views_count incrementa +1
// properties.lister_user_id = "user-456" (diferente)
// event.user_id = "user-123" (diferente)
// ✅ Se cuenta la vista
```

### Escenario 2: Propietario Viendo Su Propia Propiedad
```typescript
// Usuario con ID "user-456" (propietario) ve su propia propiedad
trackPropertyView("property-abc", "user-456");

// ❌ Result: views_count NO incrementa
// properties.lister_user_id = "user-456" (propietario)
// event.user_id = "user-456" (mismo usuario)
// ❌ NO se cuenta (previene inflación)
// ℹ️ Pero sí actualiza last_event_at
```

### Escenario 3: Usuario Anónimo (Sin user_id)
```typescript
// Usuario no autenticado ve propiedad
trackPropertyView("property-abc", null);

// ✅ Result: views_count incrementa +1
// event.user_id = null
// Condición de exclusión: user_id IS NOT NULL → false
// ✅ Se cuenta la vista (asumimos que no es el propietario)
```

### Escenario 4: Propiedad Sin Propietario Definido
```typescript
// Propiedad con lister_user_id = null
trackPropertyView("property-orphan", "user-123");

// ✅ Result: views_count incrementa +1
// properties.lister_user_id = null
// Condición de exclusión: lister_user_id IS NOT NULL → false
// ✅ Se cuenta la vista
```

---

## ⚡ Consideraciones de Rendimiento

### Para Tráfico Normal (<1000 eventos/seg)

✅ El trigger por fila funciona perfectamente
✅ No requiere optimizaciones adicionales

### Para Alto Tráfico (>1000 eventos/seg)

Considera estas optimizaciones:

#### 1. Batching con Background Worker

En lugar de actualizar por evento, acumula eventos y actualiza en lotes:

```sql
-- Crear job con pg_cron (requiere extensión pg_cron)
SELECT cron.schedule(
  'refresh-property-metrics',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  INSERT INTO public.properties_metrics (property_id, views_count, clicks_count, ...)
  SELECT property_id, 
    COUNT(*) FILTER (WHERE event_type = 'page_view'),
    COUNT(*) FILTER (WHERE event_type = 'property_click'),
    ...
  FROM public.events
  WHERE occurred_at > NOW() - INTERVAL '5 minutes'
    AND property_id IS NOT NULL
  GROUP BY property_id
  ON CONFLICT (property_id) DO UPDATE SET
    views_count = properties_metrics.views_count + EXCLUDED.views_count,
    ...;
  $$
);
```

#### 2. Partitioning de la Tabla Events

```sql
-- Particionar events por rango de fechas (mensual)
CREATE TABLE events_2025_01 PARTITION OF events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE events_2025_02 PARTITION OF events
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

#### 3. Materialización Diaria para Analytics

Si necesitas reportes históricos, descomenta la sección de **materialized view** en la migration:

```sql
-- En la migration, busca y descomenta:
CREATE MATERIALIZED VIEW public.property_views_daily_mv AS ...
```

Luego refresca periódicamente:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.property_views_daily_mv;
```

---

## 🔄 Rollback (Revertir la Migration)

Si necesitas revertir los cambios, ejecuta las queries de la sección `DOWN MIGRATION` al final del archivo SQL:

```sql
-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS events_after_insert_sync_metrics ON public.events;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS public.sync_property_metrics_from_event() CASCADE;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS public.idx_properties_metrics_views;
DROP INDEX IF EXISTS public.idx_properties_metrics_last_event;
DROP INDEX IF EXISTS public.idx_events_property_type_occurred;

-- Step 4: Drop table
DROP TABLE IF EXISTS public.properties_metrics CASCADE;
```

---

## 📈 Monitoreo

### Verificar Performance del Trigger

```sql
-- Ver estadísticas de la tabla metrics
SELECT 
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'properties_metrics';
```

### Detectar Contención de Locks

```sql
-- Queries bloqueadas en properties_metrics
SELECT 
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND blocked.query ILIKE '%properties_metrics%';
```

---

## 🎯 Mejores Prácticas

1. **Inicialmente**: Monitorea el rendimiento durante la primera semana
2. **Backups**: Asegúrate de tener backups antes de ejecutar la migration
3. **Testing**: Prueba en staging antes de producción
4. **Índices**: Los índices creados son esenciales para performance, no los elimines
5. **RLS Policy**: Ajusta la política RLS según tu modelo de ownership (`properties.user_id`, etc.)

---

## 🐛 Troubleshooting

### Problema: Las métricas no se actualizan

```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'events_after_insert_sync_metrics';

-- Verificar que la función existe
SELECT proname, prosrc FROM pg_proc WHERE proname = 'sync_property_metrics_from_event';

-- Insertar evento de prueba manualmente
INSERT INTO public.events (event_type, property_id, occurred_at)
VALUES ('page_view', 'uuid-de-propiedad-real', now());

-- Verificar que se actualizó
SELECT * FROM public.properties_metrics WHERE property_id = 'uuid-de-propiedad-real';
```

### Problema: Errores de permisos RLS

Si ves errores como "new row violates row-level security policy":

```sql
-- Verificar políticas RLS en properties_metrics
SELECT * FROM pg_policies WHERE tablename = 'properties_metrics';

-- Temporalmente deshabilitar RLS para debug (¡NO EN PRODUCCIÓN!)
ALTER TABLE public.properties_metrics DISABLE ROW LEVEL SECURITY;
```

---

## 📚 Referencias

- [Postgres Triggers Documentation](https://www.postgresql.org/docs/current/trigger-definition.html)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Postgres Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)

---

**¿Preguntas?** Este sistema es robusto y production-ready. Si tienes dudas sobre optimizaciones específicas para tu caso de uso, déjame saber los números de tráfico esperado y ajustaremos la estrategia.
