# Properties Application Layer

La capa de _application_ orquesta la interacción entre la UI y el dominio del módulo de propiedades siguiendo la arquitectura Hexagonal. Todos los casos de uso dependen exclusivamente de entidades, policies y value objects del dominio, además de puertos definidos aquí.

## Puertos

| Puerto | Responsabilidad principal |
| --- | --- |
| `PropertyRepo` | Persistencia de propiedades (listar, CRUD, publicación, duplicado). |
| `DocumentRepo` | Gestión de documentos adjuntos (RPP y otros). |
| `MediaStorage` | Gestión de media (upload/remove/cover). |
| `AuthService` | Resolver usuario/organización actual y estado KYC. |
| `Clock` | Fuente de tiempo inyectable reutilizando `DomainClock`. |

## DTO & Validaciones

Los DTO viven en `dto/` y se validan vía esquemas Zod (`validators/`). Estos esquemas se consumen en cada caso de uso para garantizar inputs consistentes antes de tocar el dominio o los puertos.

## Mappers

Los mapeadores (`mappers/`) convierten entre DTO y entidades de dominio (`Property`, `MediaAsset`, `Document`) para aplicar políticas (publicación, duplicado, verificación RPP) sin duplicar reglas del dominio.

## Casos de uso disponibles

- Lectura: `ListProperties`, `GetProperty`.
- Escritura base: `CreateProperty`, `UpdateProperty`.
- Publicación: `PublishProperty`, `PauseProperty`, `SchedulePublish`.
- Venta: `MarkSold`.
- Ciclo de vida: `DeleteProperty`, `DuplicateProperty`.
- Media: `UploadMedia`, `RemoveMedia`, `SetCoverMedia`.
- Documentos: `AttachDocument`, `VerifyRpp`.

Cada caso de uso recibe dependencias por constructor (`{ repo, auth, media, documents, clock }`) y devuelve un `Result` tipado. Esto permite que la UI interactúe mediante invocaciones determinísticas (`UI → UseCase.execute() → Puerto → Dominio → Puerto`).

## Fakes in-memory

Para habilitar prototipos rápidos o pruebas de UI, la carpeta `fakes/` incluye implementaciones en memoria de los puertos principales (`PropertyRepo`, `DocumentRepo`, `MediaStorage`). Cumplen con los contratos y soportan filtros básicos, paginación y banderas de duplicado.

## Barrel exports

`application/index.ts` re-exporta puertos, DTO, validadores, mapeadores, casos de uso y fakes, simplificando la importación desde la UI o adaptadores de infraestructura.
