# 🚨 ACCIÓN REQUERIDA: Ejecutar Migración 2950

## ⚡ Resumen Ejecutivo

**Problema**: Error al subir contratos - "FK constraint violation"  
**Causa**: Mezcla de tipos de clientes (profiles vs lead_contacts)  
**Solución**: Nueva columna en BD + código actualizado  
**Estado**: ✅ Código listo - ⚠️ **DEBES EJECUTAR MIGRACIÓN EN SUPABASE**

---

## 🎯 Lo que debes hacer AHORA:

### 1️⃣ Ejecutar Migración en Supabase (OBLIGATORIO)

1. Abre tu dashboard de **Supabase**
2. Ve a **SQL Editor**
3. Copia y pega el contenido COMPLETO del archivo:
   ```
   database/migrations/2950_fix_contracts_client_reference.sql
   ```
4. Haz clic en **Run** (o presiona Ctrl+Enter)
5. Espera a que diga **"Success"**

### 2️⃣ Verificar que funcionó

Ejecuta esta query en el mismo SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN ('client_contact_id', 'client_profile_id');
```

**✅ Deberías ver 2 filas:**
- `client_contact_id` | `uuid`
- `client_profile_id` | `uuid`

### 3️⃣ Probar desde la UI

1. Ve a la aplicación
2. Intenta crear un nuevo contrato
3. Selecciona una propiedad
4. Selecciona un cliente interesado
5. Sube un archivo
6. ✅ Debería guardarse SIN errores

---

## 📁 Archivos Importantes

| Archivo | Qué hace |
|---------|----------|
| `database/migrations/2950_fix_contracts_client_reference.sql` | **Migración SQL (ejecutar en Supabase)** |
| `database/migrations/2950_fix_contracts_client_reference.README.md` | Documentación detallada |
| `FIX_CONTRACT_UPLOAD_ERROR.md` | Este resumen expandido |
| `database/verify_2950_migration.sh` | Script de verificación (opcional) |

---

## 🔧 Cambios Técnicos

### En la Base de Datos (requiere migración)

```
Tabla: contracts
├─ client_contact_id  → FK a lead_contacts (YA EXISTÍA)
└─ client_profile_id  → FK a profiles (NUEVO) ✨
```

**Regla**: Solo UNA de las dos puede tener valor (mutuamente exclusivo)

### En el Código (ya actualizado ✅)

- DTO tiene campo `type: "profile" | "lead_contact"`
- Repositorio marca el tipo según la fuente de datos
- Componente usa la columna correcta al guardar

---

## ❓ FAQ

**P: ¿Por qué pasó esto?**  
R: La función `get_interested_profiles()` devuelve usuarios de `profiles`, pero el código intentaba guardar esos IDs en `client_contact_id` que apunta a `lead_contacts`.

**P: ¿Qué pasa si no ejecuto la migración?**  
R: Seguirás viendo el error "FK constraint violation" al intentar crear contratos con clientes de propiedades específicas.

**P: ¿Puedo revertir la migración?**  
R: Sí, el archivo SQL incluye instrucciones de rollback al final (comentadas).

**P: ¿Afecta a contratos existentes?**  
R: No, todos los contratos existentes siguen funcionando. Solo agrega una nueva columna opcional.

---

## ✅ Checklist

- [ ] Abrir Supabase SQL Editor
- [ ] Copiar contenido de `2950_fix_contracts_client_reference.sql`
- [ ] Ejecutar la migración
- [ ] Verificar que se creó `client_profile_id`
- [ ] Probar crear un contrato desde la UI
- [ ] Confirmar que se guarda sin errores

---

**Fecha**: 5 de noviembre de 2025  
**Prioridad**: 🔴 ALTA - Bloquea creación de contratos
