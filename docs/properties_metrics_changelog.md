# Properties Metrics - Changelog de Modificaciones

## 📝 Cambio Implementado: Exclusión de Auto-Interacciones

**Fecha**: 27 de octubre de 2025  
**Status**: ✅ Listo para migración (no aplicado a DB todavía)

---

## 🎯 Problema Identificado

Los propietarios de propiedades podían inflar artificialmente las métricas de sus listados al:
- Ver sus propias propiedades repetidamente
- Hacer clicks desde su perfil
- Generar interacciones que no representan interés real de terceros

**Ejemplo**:
```
Propietario: user-456
Propiedad: property-abc

❌ Antes:
- Propietario ve su propiedad 50 veces → views_count = 50 ✗
- Propietario hace click 30 veces → clicks_count = 30 ✗
- Métricas infladas e incorrectas
```

---

## ✅ Solución Implementada

### Cambios en la Migración SQL

#### 1. Función `sync_property_metrics_from_event()`

**Agregado**:
```sql
DECLARE
    v_property_owner_id uuid; -- Nueva variable

BEGIN
    -- Obtener el propietario de la propiedad
    SELECT lister_user_id INTO v_property_owner_id
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Skip counting si el usuario ES el propietario
    IF NEW.user_id IS NOT NULL 
       AND v_property_owner_id IS NOT NULL 
       AND NEW.user_id = v_property_owner_id THEN
        -- Solo actualizar last_event_at, NO incrementar counters
        UPDATE public.properties_metrics
        SET 
            last_event_at = GREATEST(last_event_at, NEW.occurred_at),
            updated_at = now()
        WHERE property_id = NEW.property_id;
        
        RETURN NEW; -- Salir sin incrementar métricas
    END IF;
    
    -- Resto del código continúa normal para otros usuarios...
END;
```

#### 2. Backfill Inicial (Línea ~185)

**Antes**:
```sql
SELECT 
    property_id,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS views_count,
    ...
FROM public.events
WHERE property_id IS NOT NULL
GROUP BY property_id
```

**Después**:
```sql
SELECT 
    e.property_id,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS views_count,
    ...
FROM public.events e
LEFT JOIN public.properties p ON p.id = e.property_id
WHERE e.property_id IS NOT NULL
  -- 🔥 Nueva condición: Excluir auto-interacciones
  AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
GROUP BY e.property_id
```

#### 3. Vista Materializada Diaria (Comentada)

Actualizada con la misma lógica de exclusión para consistencia.

#### 4. Queries de Validación

Todos los queries de validación actualizados para incluir el JOIN y el WHERE de exclusión.

---

## 🔍 Lógica de Exclusión

### Condición SQL

```sql
-- NO contar si se cumplen TODAS estas condiciones simultáneamente:
WHERE (
    e.user_id IS NULL                    -- Usuario anónimo → Contar ✓
    OR p.lister_user_id IS NULL          -- Sin propietario → Contar ✓
    OR e.user_id != p.lister_user_id     -- Usuario diferente → Contar ✓
)
```

### Tabla de Verdad

| `event.user_id` | `property.lister_user_id` | `user_id == lister_user_id` | ¿Se cuenta? | Razón |
|-----------------|---------------------------|----------------------------|-------------|-------|
| `null`          | `user-123`                | N/A                        | ✅ SÍ       | Usuario anónimo |
| `user-456`      | `null`                    | N/A                        | ✅ SÍ       | Propiedad sin dueño |
| `user-456`      | `user-789`                | ❌ NO                      | ✅ SÍ       | Usuarios diferentes |
| `user-456`      | `user-456`                | ✅ SÍ                      | ❌ NO       | **Auto-interacción** |

---

## 📦 Archivos Modificados

### 1. `/database/migrations/2500_properties_metrics.sql`

**Cambios**:
- ✏️ Header: Agregado comentario explicando comportamiento
- ✏️ Función trigger: Agregado check de propietario (líneas ~75-95)
- ✏️ Backfill: Agregado LEFT JOIN y WHERE exclusión (línea ~195)
- ✏️ Materialized view: Agregado lógica consistente (línea ~225)
- ✏️ Queries validación: Actualizados 3 queries con LEFT JOIN (líneas ~310-365)
- ✏️ Comentarios: Documentado comportamiento en función y comentarios

### 2. `/docs/properties_metrics_implementation.md`

**Agregado**:
- 📝 Sección de advertencia en Resumen (línea ~8)
- 📝 Diagrama de flujo actualizado con check de propietario
- 📝 Tabla de mapeo con columna "Nota" explicando exclusión
- 📝 Bloque de código SQL mostrando lógica
- 📝 Nueva sección "Casos de Uso" con 4 escenarios completos
- 📝 Notas en ejemplos de código TypeScript resaltando importancia del `user_id`

---

## ✅ Testing Sugerido Post-Migration

### Test 1: Auto-Interacción No Cuenta
```sql
-- Preparación
INSERT INTO public.properties (id, lister_user_id, title) 
VALUES ('prop-test', 'user-owner', 'Test Property');

INSERT INTO public.events (event_type, property_id, user_id, occurred_at)
VALUES ('page_view', 'prop-test', 'user-owner', now());

-- Verificación
SELECT views_count FROM public.properties_metrics WHERE property_id = 'prop-test';
-- Expected: 0 (no debe contar)
```

### Test 2: Interacción de Terceros Sí Cuenta
```sql
INSERT INTO public.events (event_type, property_id, user_id, occurred_at)
VALUES ('page_view', 'prop-test', 'user-other', now());

-- Verificación
SELECT views_count FROM public.properties_metrics WHERE property_id = 'prop-test';
-- Expected: 1 (sí debe contar)
```

### Test 3: Usuario Anónimo Cuenta
```sql
INSERT INTO public.events (event_type, property_id, user_id, occurred_at)
VALUES ('page_view', 'prop-test', NULL, now());

-- Verificación
SELECT views_count FROM public.properties_metrics WHERE property_id = 'prop-test';
-- Expected: 2 (1 de test anterior + 1 anónimo)
```

### Test 4: last_event_at Sí Se Actualiza para Owner
```sql
-- Obtener timestamp actual
SELECT last_event_at FROM public.properties_metrics WHERE property_id = 'prop-test';

-- Esperar 2 segundos
SELECT pg_sleep(2);

-- Owner hace evento (no debe contar en counters)
INSERT INTO public.events (event_type, property_id, user_id, occurred_at)
VALUES ('property_click', 'prop-test', 'user-owner', now());

-- Verificación
SELECT 
    views_count,        -- Expected: 2 (sin cambios)
    clicks_count,       -- Expected: 0 (no contó el click del owner)
    last_event_at       -- Expected: timestamp más reciente ✓
FROM public.properties_metrics 
WHERE property_id = 'prop-test';
```

---

## 🚨 Impacto en Datos Existentes

### Si ya tienes eventos en la tabla

**El backfill automático excluirá auto-interacciones históricas**:

```sql
-- La migration ya incluye esta lógica en el backfill:
LEFT JOIN public.properties p ON p.id = e.property_id
WHERE e.property_id IS NOT NULL
  AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
```

**Resultado**:
- ✅ Métricas actuales serán correctas desde el inicio
- ✅ No necesitas recalcular manualmente
- ✅ Trigger aplica lógica a eventos futuros

---

## 💡 Recomendaciones

### 1. Comunicación a Usuarios

Si los propietarios están acostumbrados a ver métricas infladas, podrían notar una "caída" en sus estadísticas al aplicar esta migration. Considera:

```
📊 Actualización de Métricas

Hemos mejorado el cálculo de estadísticas de propiedades:
- ✅ Ahora solo cuentan vistas de usuarios interesados
- ✅ Tus propias visitas ya no inflan los números
- ✅ Métricas más precisas y confiables
```

### 2. Analytics y Dashboards

Si tienes dashboards que muestran métricas históricas:
- Los números cambiarán después de la migration
- Documenta el cambio en reportes
- Considera agregar un "antes/después" si es relevante

### 3. Frontend: Siempre Enviar user_id

**CRÍTICO**: Asegúrate de que tu código frontend **siempre** pase el `user_id` cuando esté disponible:

```typescript
// ❌ MAL - No sabe si es el propietario
trackPropertyView(propertyId);

// ✅ BIEN - Puede detectar auto-interacción
trackPropertyView(propertyId, currentUser?.id);
```

---

## 🔄 Rollback

Si necesitas revertir este comportamiento en el futuro:

1. Ejecutar la sección DOWN de la migration (elimina todo)
2. Re-crear sin las condiciones de exclusión
3. O simplemente comentar el bloque `IF NEW.user_id = v_property_owner_id` en la función

---

## 📌 Referencias

- Migration: `/database/migrations/2500_properties_metrics.sql`
- Documentación: `/docs/properties_metrics_implementation.md`
- Tabla origen: `public.properties` (columna `lister_user_id`)
- Tabla eventos: `public.events` (columna `user_id`)

---

**Preparado por**: GitHub Copilot  
**Fecha**: 27 de octubre de 2025  
**Status**: ✅ Ready for production
