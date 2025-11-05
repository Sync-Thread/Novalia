# 🎯 RESUMEN PARA LUIS

## El Problema
Al intentar subir un contrato y asignarle un cliente que viene de una propiedad, daba este error:
```
Failed to create contract: FK constraint "contracts_client_contact_id_fkey" violated
```

## La Causa
- Cuando seleccionas una propiedad, el sistema busca **usuarios registrados** (tabla `profiles`)
- Pero al guardar, intentaba meter ese ID en `client_contact_id` que apunta a `lead_contacts`
- Era como intentar meter una llave cuadrada en un agujero redondo 🔲❌⭕

## La Solución
Agregué una nueva columna en la tabla `contracts`:
- `client_contact_id` → para leads/contactos anónimos (ya existía)
- `client_profile_id` → para usuarios registrados (NUEVA) ✨

Ahora el sistema sabe dónde guardar cada tipo de cliente.

---

## ⚠️ LO QUE TIENES QUE HACER:

### 1. Ejecutar esta migración en Supabase:

Ve a: **Supabase → SQL Editor**

Copia y pega **TODO** el archivo:
```
database/migrations/2950_fix_contracts_client_reference.sql
```

Dale a **Run** y espera a que diga **Success**.

### 2. Probar que funciona:

1. Abre la app
2. Intenta crear un contrato
3. Selecciona una propiedad
4. Selecciona un cliente
5. Sube el archivo
6. ✅ Debería guardarse sin problemas

---

## 📁 Archivos que creé:

1. **`database/migrations/2950_fix_contracts_client_reference.sql`**  
   → La migración SQL (ejecuta esto en Supabase)

2. **`ACCION_REQUERIDA_MIGRACION_2950.md`**  
   → Resumen ejecutivo del problema y solución

3. **`FIX_CONTRACT_UPLOAD_ERROR.md`**  
   → Documentación detallada

4. **`DIAGRAMA_FLUJO_CONTRATOS.md`**  
   → Diagramas visuales del flujo

5. **`database/verify_2950_migration.sh`**  
   → Script de verificación (opcional)

---

## 🔧 Cambios en el código (ya aplicados):

✅ `src/modules/contracts/application/dto/ClientDTO.ts`  
✅ `src/modules/contracts/infrastructure/repositories/SupabaseClientRepo.ts`  
✅ `src/modules/contracts/UI/components/NewDocumentQuickView.tsx`

El código ya está actualizado y compilando sin errores.

---

## 🚦 Estado:

- ✅ **Código**: Listo y funcionando
- ⚠️ **Base de datos**: Falta ejecutar migración
- 🔴 **Prioridad**: Alta (sin esto no puedes crear contratos con clientes de propiedades)

---

## ❓ Si tienes dudas:

**P: ¿Es seguro ejecutar la migración?**  
R: Sí, solo agrega una columna nueva. No modifica ni elimina datos existentes.

**P: ¿Cuánto tarda?**  
R: Menos de 1 segundo (es una migración muy simple).

**P: ¿Puedo revertirla?**  
R: Sí, el archivo SQL tiene instrucciones de rollback al final (comentadas).

---

**Siguiente paso**: Abre Supabase SQL Editor y ejecuta `2950_fix_contracts_client_reference.sql`

¡Avísame cuando lo hagas para ayudarte a verificar que funcionó! 🚀
