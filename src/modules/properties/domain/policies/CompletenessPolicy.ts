// src/modules/properties/domain/policies/CompletenessPolicy.ts
// Pesos/umbrales del score y helpers para calcularlo y clasificarlo.

export const COMPLETENESS_WEIGHTS = {
  title: 5,
  description: 10, // >=120 chars
  price: 10,
  address: 10, // city+state+country
  features: 20, // 5 campos * 4
  mediaMax: 30, // 5+ assets = 30
  rppBonus: 15,
} as const;

export const PROGRESS_THRESHOLDS = {
  red: 0, amber: 50, green: 80,
} as const;

export const MIN_PUBLISH_SCORE = 80; // alineado a UI

export type CompletenessInputs = {
  hasTitle: boolean;
  descriptionLength: number;
  priceAmount: number;
  addressFilled: boolean;            // city && state && country
  featuresFilledCount: number;       // entre 0 y 5
  mediaCount: number;                // imágenes/vídeos
  hasRppDoc?: boolean;
};

export function computeScore(i: CompletenessInputs): number {
  const w = COMPLETENESS_WEIGHTS;
  let s = 0;
  if (i.hasTitle) s += w.title;
  if (i.descriptionLength >= 120) s += w.description;
  if (i.priceAmount > 0) s += w.price;
  if (i.addressFilled) s += w.address;
  s += Math.min(w.features, (i.featuresFilledCount || 0) * 4);
  s += Math.min(w.mediaMax, (i.mediaCount || 0) * 6);
  if (i.hasRppDoc) s += w.rppBonus;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function classify(score: number): "red" | "amber" | "green" {
  if (score >= PROGRESS_THRESHOLDS.green) return "green";
  if (score >= PROGRESS_THRESHOLDS.amber) return "amber";
  return "red";
}
