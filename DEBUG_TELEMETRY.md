# 🐛 Guía de Debugging - Telemetría

## Problema Actual

**Síntomas:**
- ❌ Solo 2 eventos en tabla `events` (esperabas más)
- ❌ Tabla `properties_metrics` vacía (0 filas)
- ⚠️ Error en consola: `runtime.lastError` (warning de extensión del navegador, ignorar)
- ❌ Eventos no se registran al navegar entre páginas

---

## 🔍 Paso 1: Verificar que la Migración se Aplicó

### En Supabase SQL Editor, ejecuta:

```sql
-- ¿Existe la función?
SELECT proname FROM pg_proc WHERE proname = 'track_property_event';
```

**Resultado esperado:** 1 fila con `track_property_event`

**Si NO devuelve nada:**
1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu proyecto
2. Click en **SQL Editor**
3. Abre `/database/migrations/2510_track_property_event_function.sql`
4. Copia TODO el contenido
5. Pégalo y ejecuta (`Run`)

---

## 🔍 Paso 2: Test Manual de la Función

```sql
-- Test básico
SELECT public.track_property_event(
    'test_fingerprint_abc123',
    (SELECT id FROM properties LIMIT 1),
    NULL,
    'page_view',
    '{"source": "test", "test": true}'::jsonb
);
```

**Resultado esperado:** JSON con `id`, `session_id`, `fingerprint_id`, etc.

**Si devuelve error:**
- Lee el mensaje de error
- Verifica que las tablas `fingerprints`, `sessions`, `events` existan
- Verifica que el tipo enum `event_type_enum` incluye 'page_view'

```sql
-- Verificar enum
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'event_type_enum'::regtype;

-- Debe mostrar: page_view, property_click, share, first_contact, chat_message, etc.
```

---

## 🔍 Paso 3: Verificar Tabla events

```sql
SELECT 
    e.id,
    e.session_id,
    e.event_type,
    e.property_id,
    e.user_id,
    e.occurred_at,
    s.fingerprint_id
FROM events e
LEFT JOIN sessions s ON s.id = e.session_id
ORDER BY e.occurred_at DESC
LIMIT 10;
```

**Resultado esperado:** Varias filas con `session_id` poblado

**Si solo hay 2 filas:**
- Los eventos nuevos no se están registrando
- Problema en el código TypeScript o en la función RPC

---

## 🔍 Paso 4: Verificar Trigger de Métricas

```sql
-- ¿Existe el trigger?
SELECT * FROM pg_trigger 
WHERE tgname = 'events_after_insert_sync_metrics';
```

**Resultado esperado:** 1 fila

**Si NO existe:**
```sql
-- Aplica la migración 2500 primero
-- Copia y ejecuta: /database/migrations/2500_properties_metrics.sql
```

---

## 🔍 Paso 5: Test del Trigger

Después de ejecutar el test manual del Paso 2:

```sql
-- ¿Se actualizó properties_metrics?
SELECT * FROM properties_metrics
WHERE property_id = (SELECT id FROM properties LIMIT 1);
```

**Resultado esperado:** 1 fila con `views_count = 1`

**Si NO hay filas o views_count = 0:**
- El trigger no está funcionando
- Verifica que la función `sync_property_metrics_from_event()` existe:

```sql
SELECT proname FROM pg_proc 
WHERE proname = 'sync_property_metrics_from_event';
```

---

## 🔍 Paso 6: Debugging en Navegador

### Abre la aplicación con DevTools (F12)

1. **Limpia la consola** (Clear console)
2. **Ve a la página principal** (PublicHomePage)
3. **Haz click en una propiedad**
4. **Busca estos logs en la consola:**

```
🔍 Tracking event: {eventType: "property_click", propertyId: "...", ...}
📡 Calling RPC track_property_event with: {...}
📥 RPC Response: {data: {...}, error: null}
✅ Event tracked successfully: {...}
```

**Si NO ves estos logs:**
- El código no se está ejecutando
- Verifica que el archivo fue modificado correctamente
- Recarga con `Ctrl+Shift+R` (hard reload)

**Si ves error `❌ Error tracking event:`**
- Lee el mensaje de error completo
- Probablemente: "function track_property_event does not exist"
- Solución: Aplica la migración (Paso 1)

**Si ves error de permisos:**
```sql
-- Ejecuta en SQL Editor:
GRANT EXECUTE ON FUNCTION public.track_property_event 
TO anon, authenticated;
```

---

## 🔍 Paso 7: Verificar Navegación

El problema de "solo 2 eventos" puede ser porque:

### A) Los clicks no esperan al tracking

**Solución:** Ya lo corregimos en `PropertyPublicCard.tsx`

Verifica que el código tiene:

```typescript
const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault(); // ✅ Debe estar aquí
  
  try {
    // Esperar tracking
    await Promise.race([
      trackPropertyClick(id, {...}),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
  } finally {
    window.location.href = href; // ✅ Navegar después
  }
};
```

### B) PropertyQuickView no se está abriendo

**Verificar:** Cuando haces click en una propiedad desde el dashboard (MyPropertiesPage), ¿se abre el QuickView?

Si SÍ:
- Deberías ver log: `🔍 Tracking event: {eventType: "page_view", ...}`

Si NO:
- El QuickView no se abre
- El tracking no se ejecuta

---

## 🔍 Paso 8: Verificar PublicHomePage

En `PublicHomePage.tsx`, línea ~139:

```tsx
<PropertyPublicCard
  key={property.id}
  id={property.id}  // ✅ Debe estar aquí
  // ... otros props
/>
```

Si falta `id={property.id}`, el tracking no funcionará.

---

## 🚨 Problemas Comunes y Soluciones

### 1. "function track_property_event does not exist"

**Causa:** La migración no se aplicó

**Solución:**
```bash
# Opción 1: Supabase Dashboard
# SQL Editor → Copia migración 2510 → Run

# Opción 2: Terminal (si tienes psql)
psql "your_connection_string" \
  -f database/migrations/2510_track_property_event_function.sql
```

### 2. "permission denied for function track_property_event"

**Causa:** Falta el GRANT

**Solución:**
```sql
GRANT EXECUTE ON FUNCTION public.track_property_event 
TO anon, authenticated;
```

### 3. Eventos se crean pero properties_metrics vacía

**Causa:** El trigger no está funcionando

**Verificar:**
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'events_after_insert_sync_metrics';
```

**Si no existe:**
```bash
# Aplicar migración 2500 primero
# Supabase SQL Editor → Copia migración 2500 → Run
```

### 4. Solo 2 eventos en total

**Causas posibles:**
a) La función RPC falla silenciosamente
b) Los clicks navegan antes de registrar
c) El código no se está ejecutando

**Diagnóstico:**
- Abre DevTools → Console
- Haz click en 3-4 propiedades diferentes
- ¿Cuántos logs `✅ Event tracked successfully` ves?
  - 0 → La función no se ejecuta o falla
  - 3-4 → El problema es en la BD (RPC o trigger)
  - Menos de lo esperado → Algunos clicks navegan antes de registrar

### 5. Error "runtime.lastError"

**Causa:** Extensión del navegador (no relacionado con telemetría)

**Solución:** Ignorar o deshabilitar extensiones temporalmente

---

## ✅ Checklist de Validación

Ejecuta cada paso y marca:

- [ ] Función `track_property_event` existe
- [ ] Función tiene permisos (GRANT)
- [ ] Test manual crea evento en `events`
- [ ] Trigger `events_after_insert_sync_metrics` existe
- [ ] Test manual actualiza `properties_metrics`
- [ ] Logs `🔍 Tracking event` aparecen en consola
- [ ] Logs `✅ Event tracked successfully` aparecen
- [ ] Al hacer click, navigation espera 500ms
- [ ] Eventos nuevos aparecen en tabla `events`
- [ ] Métricas se actualizan en `properties_metrics`

---

## 📊 Query de Validación Final

Después de hacer 5-10 clicks en diferentes propiedades:

```sql
-- Cuántos eventos hay
SELECT 
    event_type,
    COUNT(*) as total,
    COUNT(DISTINCT property_id) as unique_properties,
    MAX(occurred_at) as last_event
FROM events
GROUP BY event_type;

-- Debe mostrar:
-- property_click | 5-10 | 3-5 | 2025-10-29 ...
-- page_view      | X    | Y   | ...

-- Métricas calculadas
SELECT 
    pm.property_id,
    p.title,
    pm.views_count,
    pm.clicks_count,
    pm.last_event_at
FROM properties_metrics pm
LEFT JOIN properties p ON p.id = pm.property_id
ORDER BY pm.updated_at DESC
LIMIT 10;

-- Debe mostrar propiedades con clicks_count > 0
```

---

## 🎯 Próximos Pasos

Una vez que todo funcione:

1. **Elimina los logs de debug** (🔍, 📡, 📥) del código
2. **Deja solo los importantes** (✅, ❌)
3. **Prueba en diferentes navegadores**
4. **Verifica con usuario autenticado vs anónimo**
5. **Implementa dashboard de métricas**

---

**¿Necesitas ayuda?**
- Ejecuta `/database/VERIFY_TELEMETRY.sql` completo
- Copia los resultados
- Comparte los logs de la consola del navegador
