# 🧪 Testing Infrastructure - Novalia

## 📋 Descripción

Infraestructura de testing automatizado para el proyecto Novalia usando Vitest, React Testing Library y Playwright.

## 🎯 Módulos Testeados

- **HU-04:** Módulo de Propiedades (En progreso - 92.5%)
- **HU-03:** Tracking y Atribución (Pendiente)

## 🚀 Ejecutar Tests

### Tests Unitarios y de Integración

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm test

# Ejecutar tests una vez (CI)
npm run test:run

# Ver UI interactiva de tests
npm run test:ui

# Generar reporte de cobertura
npm run test:coverage
```

### Ver Reporte de Cobertura

Después de ejecutar `npm run test:coverage`, abre:

```bash
open coverage/index.html
```

## 📁 Estructura de Tests

```
src/tests/
├── setup.ts                    # Configuración global de tests
├── helpers/
│   └── testUtils.ts            # Utilidades compartidas
└── modules/
    └── properties/
        ├── domain/             # Tests de entidades y lógica de negocio
        ├── application/        # Tests de use cases
        └── UI/                 # Tests de componentes React
```

## 🧰 Stack de Testing

- **Vitest** - Test runner (compatible con Jest)
- **@testing-library/react** - Testing de componentes React
- **@testing-library/jest-dom** - Matchers adicionales
- **@testing-library/user-event** - Simulación de interacciones
- **JSDOM** - Entorno de navegador simulado
- **V8** - Coverage provider

## ✅ Tests Implementados (Semana 1)

### Domain Layer

- ✅ **Money Value Object** (5 tests)
- ✅ **Address Value Object** (8 tests)
- ✅ **Completeness Policy** (20 tests)

### Application Layer

- 🟡 **CreateProperty Use Case** (7 tests - 4 passing, 3 con bug conocido)

**Total: 37/40 tests pasando (92.5%)**

## 🐛 Bugs Conocidos

### BUG-001 (P2): UUID generation en testing

3 tests fallan debido a problema con generación de UUIDs en entorno JSDOM. No afecta producción.

**Workaround temporal:** Los tests de validación siguen funcionando correctamente.

## 📊 Cobertura Actual

| Layer | Cobertura | Target |
|-------|-----------|--------|
| Domain | ~70% | 80% |
| Application | ~20% | 70% |
| UI | 0% | 60% |

## 🔄 Próximos Pasos

1. Fix BUG-001 (UUID generation)
2. Completar tests de CRUD (GetProperty, UpdateProperty, DeleteProperty)
3. Tests de Upload de Imágenes
4. Tests de Búsqueda y Filtros
5. Tests de UI Components

## 📝 Escribir Nuevos Tests

### Ejemplo de Test Unitario

```typescript
import { describe, it, expect } from 'vitest';
import { Money } from '@modules/properties/domain/value-objects/Money';

describe('Money Value Object', () => {
  it('should create money with valid amount', () => {
    const money = new Money(1000000);
    expect(money.amount).toBe(1000000);
  });
});
```

### Ejemplo de Test de Use Case

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPropertyRepo } from '@modules/properties/application/fakes/InMemoryPropertyRepo';

describe('ListProperties Use Case', () => {
  let repo: InMemoryPropertyRepo;

  beforeEach(() => {
    repo = new InMemoryPropertyRepo();
  });

  it('should list all properties', async () => {
    const result = await repo.list({ page: 1, pageSize: 20 });
    expect(result.isOk()).toBe(true);
  });
});
```

## 🎨 Convenciones

- Archivos de test deben terminar en `.test.ts` o `.spec.ts`
- Usar `describe` para agrupar tests relacionados
- Usar `it` o `test` para casos de prueba individuales
- Seguir patrón AAA (Arrange, Act, Assert)
- Nombrar tests de forma descriptiva: `should ... when ...`

## 🔧 Configuración

### vitest.config.ts

Configuración principal de Vitest con:
- Entorno JSDOM
- Path mappings
- Setup files
- Coverage con V8

### tsconfig.app.json

Path aliases configurados:
- `@/*` → `./src/*`
- `@modules/*` → `./src/modules/*`
- `@core/*` → `./src/core/*`
- `@shared/*` → `./src/shared/*`

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)

## 👥 Equipo QA

- **Jose Hernández** - QA Lead

---

**Nota:** Esta infraestructura está en rama `testing/integration-analysis` y no se ha mergeado a `main` para no interferir con el desarrollo activo.
