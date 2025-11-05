# SignaturePad Component

Componente de firma digital interactivo que funciona con mouse y touch (móvil/tablet).

## Características

✅ **Compatible con mouse y touch** - Funciona en desktop y dispositivos móviles
✅ **Personalizable** - Ajusta color, grosor, y tamaño del canvas
✅ **Exportación a imagen** - Guarda la firma como PNG base64
✅ **Descarga directa** - Permite descargar la firma como archivo PNG
✅ **Responsive** - Se adapta a diferentes tamaños de pantalla
✅ **Interfaz intuitiva** - Con placeholder y controles claros

## Uso Básico

```tsx
import { SignaturePad } from "@/modules/contracts/UI/components/SignaturePad";

function MyComponent() {
  const handleSave = (dataUrl: string) => {
    console.log("Firma guardada:", dataUrl);
    // Aquí puedes:
    // 1. Guardar en Supabase Storage
    // 2. Guardar en base de datos
    // 3. Superponer en un PDF
  };

  return (
    <SignaturePad
      width={800}
      height={400}
      onSave={handleSave}
      onClear={() => console.log("Firma limpiada")}
      backgroundColor="#ffffff"
      penColor="#000000"
      penWidth={2}
    />
  );
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `width` | `number` | `800` | Ancho del canvas en píxeles |
| `height` | `number` | `400` | Alto del canvas en píxeles |
| `onSave` | `(dataUrl: string) => void` | - | Callback cuando se guarda la firma |
| `onClear` | `() => void` | - | Callback cuando se limpia la firma |
| `backgroundColor` | `string` | `"#ffffff"` | Color de fondo del canvas |
| `penColor` | `string` | `"#000000"` | Color inicial del trazo |
| `penWidth` | `number` | `2` | Grosor inicial del trazo |

## Página de Firma (SignContractPage)

Página completa para firmar contratos con preview y confirmación.

### Ruta

```
/contracts/:contractId/sign
```

### Características

- Instrucciones claras para el usuario
- Preview de la firma antes de confirmar
- Opción de editar la firma
- Información sobre el proceso de firma
- Integración con el flujo de contratos

## Integración con Contratos

El botón "Firmar con FIEL" en `ContractDetailSideSheet` navega automáticamente a la página de firma:

```tsx
onClick={() => {
  navigate(`/contracts/${contract.id}/sign`);
  onClose();
}}
```

## Próximos Pasos (TODO)

### 1. Guardar en Supabase Storage

```tsx
const handleConfirmSignature = async () => {
  // Convertir base64 a Blob
  const base64Response = await fetch(signatureData);
  const blob = await base64Response.blob();
  
  // Subir a Supabase Storage
  const { data, error } = await supabase.storage
    .from('signatures')
    .upload(`${contractId}/signature.png`, blob);
    
  if (error) throw error;
  
  // Guardar referencia en la base de datos
  await supabase
    .from('contracts')
    .update({ 
      signature_url: data.path,
      signed_at: new Date().toISOString(),
      estado_firma: 'Firmado'
    })
    .eq('id', contractId);
};
```

### 2. Superponer firma en PDF

```tsx
import { PDFDocument } from 'pdf-lib';

const addSignatureToPDF = async (pdfUrl: string, signatureData: string) => {
  // Cargar el PDF existente
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  // Cargar la imagen de la firma
  const signatureImage = await pdfDoc.embedPng(signatureData);
  
  // Obtener la última página
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  
  // Agregar la firma
  lastPage.drawImage(signatureImage, {
    x: 50,
    y: 50,
    width: 200,
    height: 100,
  });
  
  // Guardar el PDF modificado
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
```

### 3. Migración de Base de Datos

```sql
-- Agregar campos para firma digital
ALTER TABLE contracts
ADD COLUMN signature_url TEXT,
ADD COLUMN signed_at TIMESTAMPTZ,
ADD COLUMN signature_metadata JSONB;

-- Índice para búsquedas rápidas
CREATE INDEX idx_contracts_signed_at ON contracts(signed_at);
```

## Validaciones Recomendadas

1. **Verificar que la firma no esté vacía** antes de guardar
2. **Validar el tamaño de la imagen** (< 1MB recomendado)
3. **Verificar permisos del usuario** antes de firmar
4. **Registrar timestamp de la firma** para auditoría
5. **Hashear la firma** para verificación de integridad

## Ejemplo Completo

Ver `SignContractPage.tsx` para un ejemplo completo de implementación con:
- Estado local para preview
- Loading states
- Manejo de errores
- Navegación
- UI/UX completa

## Notas de Desarrollo

- El canvas usa `touch-action: none` para prevenir scroll mientras se firma
- La firma se exporta como PNG con transparencia
- Los eventos touch y mouse están bien manejados para evitar conflictos
- El componente es completamente controlado (no mantiene estado de la firma)

## Recursos

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Touch Events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
