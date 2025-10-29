# Módulo de Telemetría - Novalia

Sistema de tracking de eventos y métricas de propiedades siguiendo arquitectura limpia (Clean Architecture).

> ⚠️ **IMPORTANTE:** Este módulo requiere que la migración `2510_track_property_event_function.sql` esté aplicada en la base de datos. Ver [TELEMETRY_FIX.md](../../../TELEMETRY_FIX.md) para detalles de la implementación correcta.

## 📁 Estructura

```
telemetry/
├── domain/
│   ├── entities/
│   │   └── Event.ts          # Entidades de dominio (Event, PropertyMetrics)
│   └── ports/
│       └── EventRepository.ts # Interfaz del repositorio (output port)
├── application/
│   ├── TrackEventUseCase.ts        # Caso de uso: registrar eventos
│   └── GetPropertyMetricsUseCase.ts # Caso de uso: obtener métricas
├── infrastructure/
│   └── SupabaseEventRepository.ts # Implementación con Supabase
├── UI/
│   └── hooks/
│       └── useTelemetry.ts   # Hook de React para componentes
└── index.ts                  # Barrel export
```

## 🎯 Tipos de Eventos

Según la migración SQL `2500_properties_metrics.sql`:

- **`page_view`**: Vista de página de detalles de propiedad
- **`property_click`**: Click en card de propiedad
- **`first_contact`**: Primer contacto con el propietario
- **`share`**: Compartir propiedad
- **`chat_message`**: Mensaje de chat

## 📊 Métricas Generadas

Las métricas se calculan automáticamente mediante triggers en la base de datos:

```typescript
interface PropertyMetrics {
  propertyId: string;
  viewsCount: number;           // Total de vistas
  clicksCount: number;          // Total de clicks
  contactsCount: number;        // Total de contactos
  sharesCount: number;          // Total de shares
  chatMessagesCount: number;    // Total de mensajes
  lastEventAt: Date | null;     // Último evento
  updatedAt: Date;              // Última actualización
}
```

## 🚀 Uso en Componentes

### Tracking de Eventos

```tsx
import { useTelemetry } from "@/modules/telemetry";

function MyComponent() {
  const { trackPropertyView, trackPropertyClick } = useTelemetry();

  // Registrar vista de propiedad
  const handleView = async () => {
    await trackPropertyView(propertyId, {
      source: 'home',        // Origen: 'home', 'search', 'quickview', 'details'
      referrer: document.referrer,
    });
  };

  // Registrar click en card
  const handleClick = async () => {
    await trackPropertyClick(propertyId, {
      source: 'public_home',
      propertyType: 'house',
    });
  };

  return <div onClick={handleClick}>...</div>;
}
```

### Métodos Disponibles

```typescript
const {
  // Método genérico
  trackEvent,
  
  // Métodos específicos (helpers)
  trackPropertyView,
  trackPropertyClick,
  trackFirstContact,
  trackShare,
} = useTelemetry();
```

## 🔧 Implementación Actual

### ✅ Componentes con Tracking Implementado

1. **PropertyPublicCard** (`PublicHomePage`)
   - Evento: `property_click`
   - Cuándo: Al hacer click en la card
   - Metadata: `source: 'public_home'`, `propertyType`, `hasImage`

2. **PropertyQuickView** (`MyPropertiesPage`)
   - Evento: `page_view`
   - Cuándo: Al abrir el QuickView
   - Metadata: `source: 'quickview'`, `status`

### 📝 Pendientes de Implementación

- [ ] Página de detalles públicos (`/properties/:id`)
- [ ] Botones de compartir
- [ ] Formularios de contacto (first_contact)
- [ ] Chat (chat_message)
- [ ] Búsquedas y filtros

## 🏗️ Arquitectura

### Flujo de Datos

```
UI Component (React)
  ↓ usa
useTelemetry Hook
  ↓ llama
TrackEventUseCase (Application Layer)
  ↓ usa
EventRepository Interface (Domain Port)
  ↓ implementado por
SupabaseEventRepository (Infrastructure)
  ↓ escribe en
Supabase Database
  ↓ trigger automático
properties_metrics table (materializada)
```

### Ventajas de esta Arquitectura

1. **Desacoplamiento**: La lógica de negocio no depende de Supabase
2. **Testeable**: Fácil crear mocks del repositorio
3. **Extensible**: Puedes cambiar a otro proveedor sin tocar la UI
4. **Seguro**: Los eventos NO bloquean la UI (fire-and-forget)

## 🔒 Seguridad

- **Auto-exclusión**: El sistema NO cuenta eventos cuando `user_id === lister_user_id` (evita inflación)
- **RLS Habilitado**: Row Level Security en `properties_metrics`
- **SECURITY DEFINER**: El trigger usa permisos elevados para actualizar métricas
- **Anónimos**: Los usuarios no autenticados tienen `userId: null`

## 📈 Consultas de Métricas

```typescript
import { GetPropertyMetricsUseCase, SupabaseEventRepository } from "@/modules/telemetry";

// Obtener métricas de una propiedad
const useCase = new GetPropertyMetricsUseCase(repository);
const metrics = await useCase.execute(propertyId);

console.log(metrics?.viewsCount); // 150
console.log(metrics?.clicksCount); // 45

// Obtener métricas de múltiples propiedades (bulk)
const metricsMap = await useCase.executeMany([id1, id2, id3]);
metricsMap.get(id1)?.viewsCount; // 100
```

## 🐛 Debugging

Los eventos se registran de forma asíncrona y NO lanzan errores a la UI. Para ver errores:

```typescript
// En consola del navegador
// Los errores se loguean automáticamente
console.error("Failed to track event:", error);
```

## 🔄 Sincronización

- **Tiempo Real**: Los triggers ejecutan en <10ms después del INSERT
- **Consistencia**: ACID garantizado por PostgreSQL
- **Backfill**: La migración SQL incluye carga inicial de datos históricos

## 📊 Ejemplo de Query SQL

```sql
-- Top 10 propiedades más vistas
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

## 🚦 Performance

- **Índices**: La migración crea índices optimizados
- **Bulk Queries**: `getBulkPropertyMetrics()` usa `IN` para evitar N+1
- **Caché**: Considera agregar caché de métricas en frontend si es necesario

## 🎓 Próximos Pasos

1. Implementar tracking en página de detalles
2. Agregar dashboard de métricas para propietarios
3. Crear reportes de analítica
4. Implementar A/B testing con eventos
5. Agregar heatmaps y funnels de conversión
