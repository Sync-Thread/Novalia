# 🔄 Flujo de Creación de Contratos - Antes vs Después

## ❌ ANTES (con error)

```
Usuario selecciona propiedad
         ↓
UI llama: get_interested_profiles()
         ↓
Retorna: profiles.id (UUID de tabla profiles)
         ↓
Usuario selecciona cliente
         ↓
UI guarda: client_contact_id = profile.id  ← ❌ ERROR!
         ↓
INSERT intenta guardar en contracts:
  - client_contact_id: "uuid-de-profile"  ← ❌ FK VIOLATION!
         ↓
Base de datos rechaza:
  "FK constraint contracts_client_contact_id_fkey violated"
  (porque ese UUID no existe en lead_contacts)
```

---

## ✅ DESPUÉS (corregido)

```
Usuario selecciona propiedad
         ↓
UI llama: get_interested_profiles()
         ↓
Retorna: profiles.id + type: "profile"  ← ✅ Con tipo!
         ↓
Usuario selecciona cliente
         ↓
UI guarda: 
  - clientId = profile.id
  - clientType = "profile"  ← ✅ Sabe qué tipo es!
         ↓
INSERT usa columna correcta:
  - client_contact_id: null
  - client_profile_id: "uuid-de-profile"  ← ✅ Columna correcta!
         ↓
Base de datos acepta:
  ✅ FK válida a profiles
         ↓
Contrato creado exitosamente! 🎉
```

---

## 🗂️ Estructura de Tablas

### Tabla: `lead_contacts` (leads/contactos anónimos)
```
┌─────────────────────────────────────┐
│        lead_contacts                │
├─────────────────────────────────────┤
│ id           uuid PK                │
│ full_name    text                   │
│ email        citext                 │
│ phone        text                   │
│ created_at   timestamptz            │
└─────────────────────────────────────┘
```

### Tabla: `profiles` (usuarios autenticados)
```
┌─────────────────────────────────────┐
│          profiles                   │
├─────────────────────────────────────┤
│ id           uuid PK → auth.users   │
│ org_id       uuid FK                │
│ full_name    text                   │
│ email        citext                 │
│ phone        text                   │
│ role_hint    text                   │
│ created_at   timestamptz            │
└─────────────────────────────────────┘
```

### Tabla: `contracts` (ANTES de migración)
```
┌─────────────────────────────────────┐
│          contracts                  │
├─────────────────────────────────────┤
│ id                   uuid PK        │
│ org_id               uuid FK        │
│ user_id              uuid FK        │
│ property_id          uuid FK        │
│ client_contact_id    uuid FK ───┐   │  ❌ Solo una columna
│ contract_type        enum        │   │     (apunta a lead_contacts)
│ status               enum        │   │
│ ...                              │   │
└──────────────────────────────────┼───┘
                                   ↓
                         ┌────────────────────┐
                         │  lead_contacts     │
                         └────────────────────┘
```

### Tabla: `contracts` (DESPUÉS de migración ✨)
```
┌─────────────────────────────────────┐
│          contracts                  │
├─────────────────────────────────────┤
│ id                   uuid PK        │
│ org_id               uuid FK        │
│ user_id              uuid FK        │
│ property_id          uuid FK        │
│ client_contact_id    uuid FK ───┐   │  ✅ Dos columnas
│ client_profile_id    uuid FK ───┼─┐ │     (una para cada tipo)
│ contract_type        enum        │ │ │
│ status               enum        │ │ │
│ ...                              │ │ │
└──────────────────────────────────┼─┼─┘
                                   ↓ ↓
                    ┌──────────────┘ └──────────────┐
                    ↓                                ↓
          ┌────────────────┐              ┌────────────────┐
          │ lead_contacts  │              │    profiles    │
          └────────────────┘              └────────────────┘
```

**🔒 Regla**: Solo UNA de las dos columnas puede tener valor  
**✅ Permite**: Ambas en `null` (contrato sin cliente/plantilla)

---

## 🎭 Casos de Uso

### Caso 1: Contrato con lead (contacto anónimo)
```typescript
{
  client_contact_id: "uuid-123",  // ← lead_contacts.id
  client_profile_id: null          // ← sin profile
}
```
**Ejemplo**: Cliente que llenó un formulario pero no tiene cuenta

---

### Caso 2: Contrato con profile (usuario autenticado)
```typescript
{
  client_contact_id: null,         // ← sin lead
  client_profile_id: "uuid-456"    // ← profiles.id
}
```
**Ejemplo**: Usuario registrado interesado en una propiedad

---

### Caso 3: Plantilla (sin cliente)
```typescript
{
  client_contact_id: null,
  client_profile_id: null
}
```
**Ejemplo**: Plantilla de contrato reutilizable

---

## 📊 Decisión del Sistema

```
┌─────────────────────────────────────────────┐
│  ¿De dónde viene el cliente?                │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
  ┌───────────┐      ┌────────────┐
  │ Sin filtro│      │ Con filtro │
  │  (todos)  │      │ (propiedad)│
  └─────┬─────┘      └──────┬─────┘
        │                   │
        ↓                   ↓
  lead_contacts    get_interested_profiles()
  (anónimos)           (autenticados)
        │                   │
        ↓                   ↓
  type="lead_contact"  type="profile"
        │                   │
        ↓                   ↓
  client_contact_id   client_profile_id
```

---

## 🧪 Pruebas Recomendadas

### ✅ Test 1: Crear contrato sin propiedad
- No seleccionar propiedad
- Buscar cliente en lista general
- Guardar contrato
- **Esperar**: `client_contact_id` con valor

### ✅ Test 2: Crear contrato con propiedad
- Seleccionar propiedad
- Buscar cliente interesado
- Guardar contrato
- **Esperar**: `client_profile_id` con valor

### ✅ Test 3: Crear plantilla
- No seleccionar propiedad
- No seleccionar cliente
- Guardar contrato
- **Esperar**: Ambas columnas en `null`

### ❌ Test 4: Validar constraint
- Intentar INSERT con ambas columnas con valor
- **Esperar**: Error de check constraint

---

**Última actualización**: 5 de noviembre de 2025
