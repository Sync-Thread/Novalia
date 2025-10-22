# 🔐 Módulo de Verificaciones (KYC)

## 📋 Descripción General

Este módulo maneja las verificaciones requeridas para los usuarios:
- **Verificación de Identidad (INE)**: Validación de la Identificación Nacional Electoral
- **Verificación de Documento RPP**: Validación del Registro Público de la Propiedad

## 🏗️ Arquitectura

```
src/modules/verifications/
├── INE.ts                      # Utilidad para comunicación con worker (verificación INE)
├── RPP.ts                      # Utilidad para comunicación con worker (verificación RPP)
├── UI/
│   └── pages/
│       ├── VerifyINEPage.tsx   # Página de verificación de INE
│       ├── VerifyINEPage.module.css
│       ├── VerifyRPPPage.tsx   # Página de verificación de RPP
│       └── VerifyRPPPage.module.css
└── README.md                   # Este archivo
```

## 🔄 Flujo de Verificación INE

### 1. **Usuario no verificado**
- El usuario entra a `/properties` (MyPropertiesPage)
- `useEffect` llama a `getAuthProfile()` al montar el componente
- Si `kycStatus !== "verified"` → se muestra el `KycBanner`
- Banner tiene un link a `/kyc` → redirige a `VerifyINEPage`

### 2. **Proceso de verificación (VerifyINEPage)**
```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Upload    │ ──> │   Review    │ ──> │  Processing  │ ──> │   Result    │
│ (Subir docs)│     │ (Confirmar) │     │  (Validando) │     │ (Resultado) │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

#### **Paso 1: Upload**
- Usuario sube 3 imágenes:
  - INE Frontal
  - INE Reverso
  - Selfie con INE
- Validación: max 5MB, solo imágenes
- Conversión a base64 con `FileReader`

#### **Paso 2: Review**
- Previsualización de las 3 imágenes
- Formulario con 2 campos:
  - Nombre completo (debe coincidir con INE)
  - CURP (18 caracteres)

#### **Paso 3: Processing**
- Se crea el payload con `createPayload()` del archivo `INE.ts`
- Se envía a Cloudflare Worker: `https://verification.novaliaprops.workers.dev/verify-ine`
- Worker responde con:
  ```typescript
  {
    status: 200,
    body: {
      status: true,      // o verified: true
      message: "...",
      // ... otros datos
    }
  }
  ```

#### **Paso 4: Result**
- Si `response.status === 200/201/204`:
  - Se verifica: `response.body?.status || response.body?.verified`
  - Si es `true` → **se guarda en BD**
  - Muestra mensaje de éxito
- Si falla:
  - Muestra error
  - Opción de "Intentar de nuevo"

### 3. **Guardado en Base de Datos**

```typescript
// Función: saveVerificationToDatabase()
await supabase
  .from("kyc_verifications")
  .insert({
    user_id: user.id,           // UUID del usuario
    provider: "ine_worker",     // Identificador del servicio
    status: "verified",         // ← IMPORTANTE: Este es el valor que se lee
    evidence: {                 // JSONB con toda la info
      verificationResponse: verificationData,
      submittedData: { name, curp },
      timestamp: ISO_DATE
    }
  });
```

**Tabla `kyc_verifications`:**
```sql
CREATE TABLE kyc_verifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status verification_status_enum NOT NULL DEFAULT 'pending',  -- enum: 'pending' | 'verified' | 'rejected'
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4. **Lectura del Estado de Verificación**

**Archivo:** `src/modules/properties/infrastructure/adapters/SupabaseAuthService.ts`

```typescript
// Método: getCurrent()
async getCurrent(): Promise<Result<AuthProfile>> {
  // ... obtiene usuario y perfil ...
  
  // Consulta el registro MÁS RECIENTE de verificaciones
  const { data: kycRow } = await this.client
    .from("kyc_verifications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })  // ← Del más nuevo al más viejo
    .limit(1)                                    // ← Solo el primero
    .maybeSingle();                              // ← Puede ser null
  
  // Mapea el status
  const kycStatus = mapKycStatus(kycRow?.status ?? null);
  // Si kycRow es null → "pending"
  // Si status = "verified" → "verified"
  // Si status = "rejected" → "rejected"
  
  return Result.ok({
    userId: user.id,
    kycStatus,  // ← Este valor se usa en MyPropertiesPage
    // ... otros campos ...
  });
}
```

**Función de mapeo:**
```typescript
function mapKycStatus(input: string | null | undefined): "verified" | "rejected" | "pending" {
  if (input === "verified") return "verified";
  if (input === "rejected") return "rejected";
  return "pending";  // Por defecto
}
```

### 5. **Actualización de UI**

**Archivo:** `src/modules/properties/UI/pages/MyPropertiesPage.tsx`

```typescript
const [authStatus, setAuthStatus] = useState<"verified" | "pending" | "rejected">("pending");

useEffect(() => {
  // Se ejecuta al montar el componente
  void getAuthProfile().then((result) => {
    if (result.isOk()) {
      setAuthStatus(result.value.kycStatus);  // ← Actualiza estado local
    }
  });
}, [getAuthProfile]);

// En el render:
{authStatus !== "verified" && <KycBanner visible actionHref="/kyc" />}
// ↑ Si authStatus es "pending" o "rejected" → muestra banner
// ↑ Si authStatus es "verified" → NO muestra banner
```

## 🎯 Puntos Clave del Sistema

### ✅ **Por qué funciona correctamente:**

1. **Histórico de verificaciones:**
   - Se pueden insertar múltiples registros por usuario
   - Siempre se lee el más reciente (`ORDER BY created_at DESC LIMIT 1`)
   - Permite auditoría: ver todas las verificaciones pasadas

2. **No hay UPDATE, solo INSERT:**
   - Cada verificación crea un nuevo registro
   - `getAuthProfile()` siempre toma el más nuevo
   - Más simple y mantiene el histórico completo

3. **Estados posibles:**
   - `"pending"`: Usuario sin verificaciones o con status pending
   - `"verified"`: Usuario con verificación aprobada
   - `"rejected"`: Usuario con verificación rechazada

4. **Refresh automático:**
   - Al regresar a `/properties` desde `/kyc`
   - `useEffect` se ejecuta nuevamente
   - Llama a `getAuthProfile()` que lee de BD
   - Si hay un registro nuevo con `status="verified"` → banner desaparece

## 🔧 Archivos Relacionados

### **Frontend:**
- `src/modules/verifications/INE.ts` - Utilidades del worker
- `src/modules/verifications/UI/pages/VerifyINEPage.tsx` - UI de verificación
- `src/modules/properties/UI/pages/MyPropertiesPage.tsx` - Muestra banner KYC
- `src/modules/properties/UI/components/KycBanner.tsx` - Banner de verificación
- `src/app/routes.tsx` - Ruta `/kyc`

### **Backend/Infraestructura:**
- `src/modules/properties/infrastructure/adapters/SupabaseAuthService.ts` - Lectura de KYC
- `src/modules/properties/application/ports/AuthService.ts` - Interface de AuthProfile
- `src/modules/properties/UI/hooks/usePropertiesActions.ts` - Hook de `getAuthProfile()`

### **Base de Datos:**
- `database/migrations/1000_kyc.sql` - Tabla kyc_verifications
- `database/migrations/0100_enums.sql` - Enum verification_status_enum
- `database/migrations/1610_rls_policies.sql` - Políticas RLS

### **Worker Externo:**
- URL: `https://verification.novaliaprops.workers.dev/verify-ine`
- Método: POST
- Body: `{ nameForm, curpForm, frontImage, backImage, selfieImage }`

## 🐛 Debugging

### **Ver logs en consola:**

1. **Al guardar verificación:**
   ```
   === 💾 Guardando verificación en base de datos ===
   📊 Datos de verificación: {...}
   👤 Usuario ID: abc-123-def
   ✅ Verificación guardada exitosamente
   📄 Registro creado: { id, user_id, provider, status, created_at }
   🎉 El usuario ahora aparecerá como verificado en MyPropertiesPage
   ```

2. **Al cargar perfil:**
   ```
   [auth] profile snapshot { userId, kycStatus, ... }
   ```

### **Verificar en Supabase:**

```sql
-- Ver verificaciones de un usuario
SELECT * FROM kyc_verifications 
WHERE user_id = 'USER_UUID' 
ORDER BY created_at DESC;

-- Ver el estado actual (lo mismo que hace getAuthProfile)
SELECT status FROM kyc_verifications 
WHERE user_id = 'USER_UUID' 
ORDER BY created_at DESC 
LIMIT 1;
```

## 🚀 Testing Manual

1. Entrar a `/properties` (sin verificar) → debe ver banner
2. Click en "Completar verificación" → ir a `/kyc`
3. Subir los 3 documentos (INE frente, reverso, selfie)
4. Completar nombre y CURP
5. Enviar verificación
6. Ver resultado exitoso
7. Regresar a `/properties` → banner debe desaparecer
8. Verificar en consola los logs de guardado
9. Verificar en BD que existe el registro con `status='verified'`

## 📝 Notas Adicionales

- **RLS (Row Level Security):** Los usuarios solo pueden ver sus propias verificaciones
- **Provider INE:** Usa `"ine_worker"` para identificar verificaciones de INE
- **Provider RPP:** Usa `"rpp_document"` para identificar verificaciones de RPP
- **Evidence:** Guarda toda la respuesta del worker para auditoría
- **Timestamp:** Se guarda la fecha de envío del formulario
- **CURP:** Debe tener exactamente 18 caracteres (validado en frontend)
- **Imágenes:** Max 5MB (INE) o 10MB (RPP), formato base64

---

## 🏢 Verificación de Documento RPP

### **Descripción**

La verificación de documento RPP (Registro Público de la Propiedad) permite validar documentos oficiales de propiedades.

### **Ruta de Acceso**
- URL: `/verify-rpp`
- Accesible desde: `PublishWizardPage` (banner de verificación)

### **Flujo del Proceso**

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Upload    │ ──> │   Review    │ ──> │  Processing  │ ──> │   Result    │
│ (Subir doc) │     │ (Confirmar) │     │  (Validando) │     │ (Resultado) │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

### **Paso 1: Upload**
- Usuario sube 1 documento:
  - Certificado de libertad de gravamen
  - Escritura pública registrada
  - O cualquier documento RPP válido
- Formatos aceptados: PDF, JPG, PNG
- Validación: max 10MB
- Conversión a base64

### **Paso 2: Review**
- Previsualización del documento
- Formulario con 3 campos:
  - Nombre del propietario (como aparece en el documento)
  - Dirección de la propiedad (dirección registrada)
  - Número de registro o folio real

### **Paso 3: Processing**
- Se crea el payload con `createRPPPayload()` del archivo `RPP.ts`
- Se envía al mismo worker: `https://verification.novaliaprops.workers.dev/verify-ine`
- **NOTA:** La respuesta del worker se ignora, siempre se considera verificado
- Se simula resultado exitoso en código:
  ```typescript
  const simulatedResult = {
    verified: true,
    status: "verified",
    message: "Documento RPP verificado correctamente",
    documentType: "rpp",
    timestamp: new Date().toISOString(),
  };
  ```

### **Paso 4: Result**
- Siempre muestra éxito (validación temporal)
- Mensaje: "¡Documento RPP verificado!"
- "El documento del Registro Público de la Propiedad ha sido verificado correctamente"
- Botón: "Ir a mis propiedades"

### **Guardado en Base de Datos**

```typescript
await supabase
  .from("kyc_verifications")
  .insert({
    user_id: user.id,
    provider: "rpp_document",  // ← Identificador único para RPP
    status: "verified",
    evidence: {
      verificationResponse: simulatedResult,
      submittedData: {
        ownerName,
        propertyAddress,
        registrationNumber
      },
      timestamp: ISO_DATE
    }
  });
```

### **Diferencias con INE**

| Aspecto | INE | RPP |
|---------|-----|-----|
| Documentos | 3 imágenes (frente, reverso, selfie) | 1 documento (PDF o imagen) |
| Tamaño máx | 5MB por imagen | 10MB |
| Formatos | Solo imágenes | PDF, JPG, PNG |
| Campos form | Nombre, CURP | Nombre propietario, Dirección, Folio |
| Provider | `"ine_worker"` | `"rpp_document"` |
| Worker | Usa respuesta real | Ignora respuesta, simula éxito |
| Mensaje | "INE verificada" | "Documento RPP verificado" |

### **Uso del Worker**

**IMPORTANTE:** Actualmente ambas verificaciones usan el mismo endpoint del worker:
```
POST https://verification.novaliaprops.workers.dev/verify-ine
```

- **Para INE:** La respuesta se procesa y valida normalmente
- **Para RPP:** La llamada se hace pero la respuesta se **ignora**. El resultado siempre es exitoso (código hardcoded).

**Motivo:** Funcionalidad temporal. En el futuro se creará un endpoint específico `/verify-rpp` en el worker.

### **Archivos del Módulo RPP**

- `src/modules/verifications/RPP.ts` - Utilidades y tipos
- `src/modules/verifications/UI/pages/VerifyRPPPage.tsx` - Componente principal
- `src/modules/verifications/UI/pages/VerifyRPPPage.module.css` - Estilos
- `src/app/routes.tsx` - Ruta `/verify-rpp`

### **Integración con PublishWizardPage**

```tsx
<div className="wizard-summary wizard-summary--alert">
  <strong>Verificación de documento RPP requerida</strong>
  <p>Para publicar propiedades necesitas verificar el documento del Registro Público de la Propiedad.</p>
  <button onClick={() => navigate("/verify-rpp")}>
    Verificar documento ahora
  </button>
</div>
```

---
