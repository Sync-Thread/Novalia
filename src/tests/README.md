# Testing - Proyecto Novalia

## 📋 Información General

Este documento describe la configuración y ejecución de tests para el proyecto Novalia.

## 🛠️ Tecnologías de Testing

- **Vitest** - Framework de testing (compatible con Vite)
- **React Testing Library** - Testing de componentes React
- **@testing-library/jest-dom** - Matchers adicionales para el DOM
- **Vitest UI** - Interfaz visual para ejecutar tests

## 📁 Estructura de Tests

```
src/tests/
├── setup.ts                          # Configuración global de tests
├── helpers/
│   └── testUtils.ts                  # Utilidades compartidas
└── modules/
    └── properties/
        ├── domain/                   # Tests de entidades, value objects, policies
        │   ├── Money.test.ts
        │   ├── Address.test.ts
        │   └── CompletenessPolicy.test.ts
        ├── application/              # Tests de use cases
        │   └── CreateProperty.test.ts
        └── UI/                       # Tests de componentes (pendiente)
```

## 🚀 Comandos Disponibles

```bash
# Ejecutar todos los tests (modo watch)
npm test

# Ejecutar tests una sola vez
npm run test:run

# Ejecutar tests con interfaz UI
npm run test:ui

# Generar reporte de cobertura
npm run test:coverage
```

## ✅ Estado Actual de Tests

### HU-04: Módulo de Propiedades

| Categoría | Tests | Pass | Status |
|-----------|-------|------|--------|
| Domain - Value Objects | 13 | 13 | ✅ |
| Domain - Policies | 20 | 20 | ✅ |
| Application - Use Cases | 7 | 4 | 🟡 |
| **TOTAL** | **40** | **37** | **92.5%** |

### Tests Implementados:

#### ✅ Domain Layer (100% passing)
- **Money.test.ts** (5 tests)
  - Validación de montos positivos
  - Soporte de múltiples monedas (MXN, USD)
  - Manejo de decimales
  - Validación de errores (montos negativos/cero)

- **Address.test.ts** (8 tests)
  - Validación de campos requeridos (city, state, country)
  - Privacidad de direcciones (displayAddress)
  - Normalización de strings (trim)
  - Conversión de strings vacíos a null

- **CompletenessPolicy.test.ts** (20 tests)
  - Cálculo de score 0-100%
  - Pesos individuales por componente
  - Threshold de publicación (80%)
  - Clasificación por colores (red/amber/green)
  - Bonus por documento RPP

#### 🟡 Application Layer (57% passing)
- **CreateProperty.test.ts** (7 tests, 4 passing)
  - ✅ Validación de inputs
  - ✅ Integración con auth service
  - ✅ Manejo de errores
  - 🔴 Creación de propiedades (bug de UUID en testing)

## 🐛 Bugs Conocidos

### BUG-001 (P1): UUID Generation en Testing
- **Status:** Identificado, workaround disponible
- **Impacto:** Solo afecta entorno de testing, no producción
- **Tests afectados:** 3 tests en CreateProperty
- **Solución temporal:** Mock de `generateId()` pendiente

## 📦 Dependencias de Testing

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^27.0.0",
    "vitest": "^3.2.4"
  }
}
```

## 🎯 Testing sin Credenciales

Gracias a la arquitectura hexagonal y los **repositorios fake** (InMemory), puedes ejecutar la mayoría de tests **SIN necesidad de credenciales** de Supabase o AWS S3:

### Fakes Disponibles:
- ✅ `InMemoryPropertyRepo` - Repositorio de propiedades en memoria
- ✅ `InMemoryMediaStorage` - Storage de media en memoria
- ✅ `InMemoryDocumentRepo` - Repositorio de documentos en memoria

Estos fakes implementan los mismos contratos (ports) que los adapters reales, permitiendo:
- Testing de use cases completo
- Testing de lógica de negocio
- Validación de flujos sin base de datos

## 📝 Próximos Tests a Implementar

### Prioridad Alta:
1. ✅ Resolver BUG-001 (UUID mocking)
2. 📝 UpdateProperty Use Case
3. 📝 DeleteProperty Use Case (soft delete)
4. 📝 ListProperties Use Case (filtros y paginación)

### Prioridad Media:
5. 📝 UploadMedia Use Case
6. 📝 Tests de búsqueda avanzada
7. 📝 Tests de UI Components

### Prioridad Baja:
8. 📝 Tests de integración (requieren credenciales)
9. 📝 Tests E2E con Playwright

## 🔧 Configuración

### vitest.config.ts
```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Paths configurados:
- `@/*` → `./src/*`
- `@modules/*` → `./src/modules/*`
- `@core/*` → `./src/core/*`
- `@shared/*` → `./src/shared/*`

## 📊 Reportes

Los reportes de testing se encuentran en:
- **Reporte Semanal:** `REPORTE_QA_SEMANA_1.md`
- **Coverage HTML:** `coverage/index.html` (después de ejecutar `npm run test:coverage`)

## 🤝 Contribuir

Al agregar nuevos tests:
1. ✅ Seguir la estructura de carpetas existente
2. ✅ Nombrar archivos como `[Nombre].test.ts`
3. ✅ Usar los fakes cuando sea posible
4. ✅ Documentar bugs encontrados
5. ✅ Actualizar este README

## 📞 Contacto

Para dudas sobre testing: [Tu email/contacto]

---

**Última actualización:** 22 de octubre de 2025
