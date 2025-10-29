# ⚡ Guía Rápida - Aplicar Corrección de Telemetría

## 🎯 Problema
Los eventos de telemetría no se estaban guardando en la base de datos porque faltaba gestión de `session_id`.

## ✅ Solución
Se creó una función RPC que maneja automáticamente sesiones, fingerprints y eventos.

---

## 🚀 Aplicar en 3 Pasos

### Paso 1: Aplicar Migración

**Opción A - Supabase Dashboard (RECOMENDADO):**

1. Ve a: https://app.supabase.com → Tu Proyecto
2. Click en **SQL Editor** (icono de base de datos)
3. Click en **New query**
4. Abre el archivo: `/database/migrations/2510_track_property_event_function.sql`
5. Copia **todo el contenido** y pégalo en el editor
6. Click en **Run** (o presiona `Ctrl+Enter`)
7. Espera el mensaje: ✅ Success

**Opción B - Terminal (si tienes psql):**

```bash
# Desde la raíz del proyecto
./apply_telemetry_migration.sh

# O manualmente:
psql "tu_connection_string_aqui" \
  -f database/migrations/2510_track_property_event_function.sql
```

---

### Paso 2: Verificar Migración

En el **SQL Editor** de Supabase, ejecuta:

```sql
-- Verificar que la función existe
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'track_property_event';

-- Debe mostrar:
-- track_property_event | {p_fingerprint_hash, p_property_id, ...}
```

Si no muestra nada, repite el Paso 1.

---

### Paso 3: Probar en la Aplicación

```bash
# Inicia el servidor de desarrollo
npm run dev
```

**En el navegador:**

1. Abre **DevTools** → **Console** (F12)
2. Navega a la página principal
3. **Haz click** en una tarjeta de propiedad
4. Busca en la consola:
   ```
   ✅ Event tracked successfully: {id: "...", session_id: "..."}
   ```

5. **Abre un QuickView** de propiedad (desde tu dashboard)
6. Verifica otro log similar en consola

---

## 🔍 Validar en Base de Datos

En el **SQL Editor** de Supabase:

```sql
-- Ver eventos recientes (últimos 5)
SELECT 
    e.event_type,
    e.property_id,
    e.occurred_at,
    p.title
FROM public.events e
LEFT JOIN public.properties p ON p.id = e.property_id
ORDER BY e.occurred_at DESC
LIMIT 5;

-- Ver métricas calculadas
SELECT 
    pm.property_id,
    p.title,
    pm.views_count,
    pm.clicks_count,
    pm.last_event_at
FROM public.properties_metrics pm
LEFT JOIN public.properties p ON p.id = pm.property_id
WHERE pm.views_count > 0 OR pm.clicks_count > 0
ORDER BY pm.updated_at DESC
LIMIT 5;
```

**Debes ver:**
- ✅ Filas en la tabla `events` con timestamps recientes
- ✅ Métricas en `properties_metrics` con `views_count > 0` o `clicks_count > 0`

---

## 🐛 Problemas Comunes

### ❌ "function track_property_event does not exist"

**Solución:** La migración no se aplicó. Repite el Paso 1.

---

### ❌ "permission denied for function"

**Solución:** Falta el GRANT. Ejecuta en SQL Editor:

```sql
GRANT EXECUTE ON FUNCTION public.track_property_event 
TO anon, authenticated;
```

---

### ❌ No veo logs "✅ Event tracked" en consola

**Verificar:**
1. ¿Hay errores en consola? Busca `❌ Error tracking event`
2. ¿La consola está filtrada? Asegúrate de ver todos los niveles (Info, Warn, Error)
3. ¿El navegador bloquea la petición? Revisa la pestaña **Network** en DevTools

---

### ❌ Eventos se registran pero métricas no se actualizan

**Verificar trigger:**

```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'events_after_insert_sync_metrics';
```

Si no existe, aplica primero la migración `2500_properties_metrics.sql`:

```bash
# En Supabase SQL Editor
-- Copia y ejecuta: database/migrations/2500_properties_metrics.sql
```

---

## 📚 Documentación Completa

- **Problema detallado:** [TELEMETRY_FIX.md](./TELEMETRY_FIX.md)
- **Resumen de cambios:** [CHANGE_SUMMARY.md](./CHANGE_SUMMARY.md)
- **Implementación:** [TELEMETRY_IMPLEMENTATION.md](./TELEMETRY_IMPLEMENTATION.md)

---

## ✅ Checklist de Éxito

- [ ] Migración `2510_track_property_event_function.sql` aplicada
- [ ] Función `track_property_event` existe en base de datos
- [ ] Permisos GRANT aplicados
- [ ] Logs `✅ Event tracked successfully` en consola del navegador
- [ ] Eventos aparecen en tabla `events`
- [ ] Métricas se actualizan en `properties_metrics`

---

## 🎉 ¡Listo!

Si completaste todos los pasos y pasaste el checklist, **el sistema de telemetría está funcionando correctamente**.

Ahora puedes:
- 📊 Ver métricas de propiedades en tiempo real
- 🎯 Identificar propiedades populares
- 👥 Rastrear interacciones de usuarios
- 📈 Analizar conversiones (views → clicks → contacts)

---

**Última actualización:** 29 de octubre de 2025  
**Autor:** Sistema de IA - GitHub Copilot
