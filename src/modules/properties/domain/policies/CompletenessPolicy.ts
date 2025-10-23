// src/modules/properties/domain/policies/CompletenessPolicy.ts
// Pesos/umbrales del score y helpers para calcularlo y clasificarlo.
// Alineado con la lógica del Wizard UI: 9 requirements con peso igual (~11% cada uno)

export const COMPLETENESS_WEIGHTS = {
  title: 11,           // Título presente
  propertyType: 11,    // Tipo de propiedad
  price: 11,           // Precio > 0
  city: 11,            // Ciudad presente
  state: 11,           // Estado presente
  description: 11,     // Descripción presente (cualquier longitud)
  amenities: 11,       // Al menos 1 amenidad
  media: 12,           // Al menos 1 foto/video
  documents: 11,       // Al menos 1 documento
} as const;

export const PROGRESS_THRESHOLDS = {
  red: 0, amber: 50, green: 80,
} as const;

export const MIN_PUBLISH_SCORE = 80; // alineado a UI

export type CompletenessInputs = {
  hasTitle: boolean;
  hasPropertyType: boolean;
  priceAmount: number;
  hasCity: boolean;
  hasState: boolean;
  hasDescription: boolean;
  hasAmenities: boolean;
  mediaCount: number;
  documentCount: number;
};

export function computeScore(i: CompletenessInputs): number {
  const w = COMPLETENESS_WEIGHTS;
  let s = 0;
  
  // 1. Título (Paso 1)
  if (i.hasTitle) s += w.title;
  
  // 2. Tipo (Paso 1)
  if (i.hasPropertyType) s += w.propertyType;
  
  // 3. Precio (Paso 1)
  if (i.priceAmount > 0) s += w.price;
  
  // 4. Ciudad (Paso 2)
  if (i.hasCity) s += w.city;
  
  // 5. Estado (Paso 2)
  if (i.hasState) s += w.state;
  
  // 6. Descripción (Paso 1)
  if (i.hasDescription) s += w.description;
  
  // 7. Amenidades (Paso 3)
  if (i.hasAmenities) s += w.amenities;
  
  // 8. Fotos min. 1 (Paso 4)
  if (i.mediaCount > 0) s += w.media;
  
  // 9. Documentos (Paso 5)
  if (i.documentCount >= 1) s += w.documents;
  
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function classify(score: number): "red" | "amber" | "green" {
  if (score >= PROGRESS_THRESHOLDS.green) return "green";
  if (score >= PROGRESS_THRESHOLDS.amber) return "amber";
  return "red";
}
