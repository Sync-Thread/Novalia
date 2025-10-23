// src/modules/properties/domain/policies/MediaOrderingPolicy.ts
// Normalize positions and pick a cover asset (index 0).

import type { MediaType } from "../enums";

export type MediaLite = {
  id: unknown;          // UniqueEntityID or any identifier
  type: MediaType;      // "image" | "video" | "document"
  position: number;     // 0-based
};

export function selectCover(list: MediaLite[]): number {
  if (!list.length) return -1;
  const images = list.filter(m => m.type === "image").sort((a, b) => a.position - b.position);
  const candidate = (images[0] ?? list.slice().sort((a, b) => a.position - b.position)[0]);
  return list.findIndex(m => m === candidate);
}

export function normalizePositions(list: MediaLite[]): MediaLite[] {
  const ordered = list.slice().sort((a, b) => a.position - b.position);
  return ordered.map((m, i) => ({ ...m, position: i }));
}

export function ensureCoverAtZero(list: MediaLite[]): MediaLite[] {
  if (!list.length) return list;
  const idx = selectCover(list);
  if (idx <= 0) return normalizePositions(list);
  const copy = list.slice();
  const [cover] = copy.splice(idx, 1);
  copy.unshift(cover);
  return normalizePositions(copy);
}

