# 📊 Sistema de Métricas y Eventos - Implementación Completa

> ⚠️ **CORRECCIÓN APLICADA:** Si estás experimentando problemas con eventos que no se guardan en la base de datos, consulta **[TELEMETRY_FIX.md](./TELEMETRY_FIX.md)** para la solución completa. La implementación original tenía un problema con la gestión de sesiones que ha sido corregido.

## ✅ Lo que se ha creado

### 1. **Módulo de Telemetría** (`/src/modules/telemetry/`)

#### Domain Layer (Capa de Dominio)
- ✅ `Event.ts` - Entidades de dominio
  - Tipos: `EventType`, `EventMetadata`, `PropertyMetrics`
  - 5 tipos de eventos: `page_view`, `property_click`, `first_contact`, `share`, `chat_message`

- ✅ `EventRepository.ts` - Puerto de salida (interfaz)
  - `trackEvent()` - Registrar evento
  - `getPropertyMetrics()` - Obtener métricas de una propiedad
  - `getBulkPropertyMetrics()` - Obtener métricas de múltiples propiedades

#### Application Layer (Capa de Aplicación)
- ✅ `TrackEventUseCase.ts` - Caso de uso para registrar eventos
- ✅ `GetPropertyMetricsUseCase.ts` - Caso de uso para obtener métricas

#### Infrastructure Layer (Capa de Infraestructura)
- ✅ `SupabaseEventRepository.ts` - Implementación con Supabase
  - Conexión a tablas: `events` y `properties_metrics`
  - Mapeo de DTOs
  - Manejo de errores

#### UI Layer (Capa de Presentación)
- ✅ `useTelemetry.ts` - Hook de React
  - Métodos helpers: `trackPropertyView`, `trackPropertyClick`, `trackFirstContact`, `trackShare`
  - Auto-detección de usuario autenticado
  - Fire-and-forget (no bloquea UI)

### 2. **Integración en Componentes**

#### ✅ PropertyPublicCard
**Ubicación:** `/src/modules/properties/UI/pages/PublicHomePage/components/PropertyPublicCard/`

**Cambios:**
- Agregado prop `id: string` para tracking
- Importado `useTelemetry` hook
- Implementado `handleClick()` que registra evento `property_click`
- Metadata incluida: `source: 'public_home'`, `propertyType`, `hasImage`

**Efecto:** Cada vez que un usuario hace click en una card de propiedad, se registra el evento automáticamente.

#### ✅ PublicHomePage
**Ubicación:** `/src/modules/properties/UI/pages/PublicHomePage/PublicHomePage.tsx`

**Cambios:**
- Pasando prop `id={property.id}` a `PropertyPublicCard`

#### ✅ PropertyQuickView
**Ubicación:** `/src/modules/properties/UI/pages/MyPropertiesPage/components/PropertyQuickView/`

**Cambios:**
- Importado `useTelemetry` hook
- Agregado tracking en `useEffect` cuando se carga la propiedad
- Registra evento `page_view` con metadata: `source: 'quickview'`, `status`

**Efecto:** Cada vez que un propietario abre el QuickView de su propiedad, se registra como vista.

### 3. **Base de Datos** (Ya existente)

La migración SQL `2500_properties_metrics.sql` ya está creada e incluye:

#### Tablas:
- ✅ `events` - Almacena todos los eventos
- ✅ `properties_metrics` - Métricas materializadas (actualización automática)

#### Características:
- ✅ Trigger automático que actualiza métricas en tiempo real
- ✅ Exclusión de auto-interacciones (owner no cuenta sus propias vistas)
- ✅ Índices optimizados para consultas rápidas
- ✅ RLS (Row Level Security) habilitado
- ✅ Backfill de datos históricos

## 🎯 Cómo Funciona

### Flujo de Tracking

```
1. Usuario hace click en PropertyPublicCard
   ↓
2. handleClick() llama a trackPropertyClick(propertyId, metadata)
   ↓
3. useTelemetry hook obtiene userId de sesión (o null si anónimo)
   ↓
4. TrackEventUseCase.execute() crea objeto Event
   ↓
5. SupabaseEventRepository.trackEvent() inserta en tabla events
   ↓
6. Trigger SQL se ejecuta automáticamente
   ↓
7. properties_metrics se actualiza (UPSERT)
   ✓ clicks_count += 1
   ✓ last_event_at = now()
```

### Ejemplo de Evento Registrado

```json
{
  "id": "uuid-generado",
  "event_type": "property_click",
  "user_id": "auth-user-id-o-null",
  "property_id": "prop-123",
  "metadata": {
    "source": "public_home",
    "propertyType": "house",
    "hasImage": true
  },
  "occurred_at": "2025-10-29T10:30:00Z",
  "created_at": "2025-10-29T10:30:00Z"
}
```

### Métricas Resultantes

```json
{
  "property_id": "prop-123",
  "views_count": 150,
  "clicks_count": 45,
  "contacts_count": 3,
  "shares_count": 2,
  "chat_messages_count": 10,
  "last_event_at": "2025-10-29T10:30:00Z",
  "updated_at": "2025-10-29T10:30:00Z"
}
```

## 📝 Próximos Pasos

### Implementaciones Pendientes:

1. **Página de Detalles Públicos** (`/properties/:id`)
   ```tsx
   // En PropertyDetailsPage.tsx
   const { trackPropertyView } = useTelemetry();
   
   useEffect(() => {
     if (propertyId) {
       trackPropertyView(propertyId, {
         source: 'details_page',
         referrer: document.referrer
       });
     }
   }, [propertyId]);
   ```

2. **Botón de Compartir**
   ```tsx
   const handleShare = async () => {
     await trackShare(propertyId, {
       method: 'whatsapp', // o 'facebook', 'twitter', 'copy_link'
     });
   };
   ```

3. **Formulario de Contacto**
   ```tsx
   const handleSubmitContact = async () => {
     // ... lógica de envío ...
     await trackFirstContact(propertyId, {
       contact_method: 'email',
     });
   };
   ```

4. **Dashboard de Métricas para Propietarios**
   ```tsx
   import { GetPropertyMetricsUseCase } from '@/modules/telemetry';
   
   const metrics = await useCase.execute(propertyId);
   
   <div>
     <p>Vistas: {metrics?.viewsCount}</p>
     <p>Clicks: {metrics?.clicksCount}</p>
     <p>Contactos: {metrics?.contactsCount}</p>
   </div>
   ```

## 🔍 Verificación en Base de Datos

### Consultar eventos recientes:
```sql
SELECT 
  event_type,
  property_id,
  user_id,
  metadata,
  occurred_at
FROM events
ORDER BY occurred_at DESC
LIMIT 10;
```

### Consultar métricas de propiedad:
```sql
SELECT 
  p.title,
  pm.*
FROM properties_metrics pm
JOIN properties p ON p.id = pm.property_id
WHERE pm.property_id = 'tu-property-id';
```

### Top propiedades más vistas:
```sql
SELECT 
  p.title,
  pm.views_count,
  pm.clicks_count,
  pm.last_event_at
FROM properties_metrics pm
JOIN properties p ON p.id = pm.property_id
ORDER BY pm.views_count DESC
LIMIT 10;
```

## 🎓 Documentación Adicional

- Ver `README.md` en `/src/modules/telemetry/` para más detalles
- Revisar migración SQL `2500_properties_metrics.sql` para entender triggers
- Consultar comentarios en código para ejemplos de uso

## ✨ Beneficios Implementados

1. ✅ **Tracking Automático**: Solo agregar hook y llamar función
2. ✅ **No Bloquea UI**: Fire-and-forget, errores solo en consola
3. ✅ **Arquitectura Limpia**: Fácil de testear y mantener
4. ✅ **Extensible**: Fácil agregar nuevos tipos de eventos
5. ✅ **Seguro**: RLS + auto-exclusión de propietarios
6. ✅ **Performance**: Triggers optimizados + índices
7. ✅ **Tiempo Real**: Métricas actualizadas instantáneamente

## 🚀 ¡Listo para Producción!

El sistema está completamente funcional y listo para:
- Registrar clicks en cards (✅ implementado)
- Registrar vistas en QuickView (✅ implementado)
- Agregaciones automáticas en tiempo real (✅ funcionando)
- Consultas de métricas (✅ disponible)

**Siguiente paso:** Implementar tracking en más puntos de contacto según necesidad del negocio.
