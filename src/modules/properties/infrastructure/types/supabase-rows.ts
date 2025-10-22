// src/modules/properties/infrastructure/types/supabase-rows.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface PropertyRow {
  id: string;
  org_id: string | null;
  lister_user_id: string | null;
  status: string;
  property_type: string;
  operation_type: string;
  title: string;
  description: string | null;
  price: string | number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: string | number | null;
  parking_spots: number | null;
  construction_m2: string | number | null;
  land_m2: string | number | null;
  amenities: string[] | null;
  address_line: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  display_address: boolean | null;
  location: Json | null; // JSONB: { lat: number, lng: number }
  normalized_address: Json | null;
  rpp_verified: string | null;
  completeness_score: number | null;
  trust_score: number | null;
  tags_cached: string[] | null;
  internal_id: string | null;
  levels: number | null;
  year_built: number | null;
  floor: number | null;
  hoa_fee: string | number | null;
  condition: string | null;
  furnished: boolean | null;
  pet_friendly: boolean | null;
  orientation: string | null;
  published_at: string | null;
  sold_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentRow {
  id: string;
  org_id: string | null;
  related_type: string;
  related_id: string;
  doc_type: string;
  verification: string;
  source: string | null;
  hash_sha256: string | null;
  s3_key: string | null;
  url: string | null;
  metadata: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MediaAssetRow {
  id: string;
  org_id: string | null;
  property_id: string | null;
  media_type: string;
  s3_key: string | null;
  url: string | null;
  position: number | null;
  metadata: Json | null;
  created_at: string | null;
}

export type GeoPoint =
  | string
  | {
      type: "Point";
      coordinates: [number, number];
    };

export type PropertyInsertPayload = Omit<
  PropertyRow,
  "created_at" | "updated_at" | "org_id"
> & { org_id: string | null };

export type PropertyUpdatePayload = Partial<PropertyInsertPayload>;

export type DocumentInsertPayload = {
  id: string;
  org_id: string | null;
  related_type: string;
  related_id: string;
  doc_type: string;
  verification: string;
  source: string | null;
  hash_sha256: string | null;
  s3_key: string | null;
  url: string | null;
  metadata: Json | null;
};

export type DocumentUpdatePayload = Partial<
  Pick<DocumentInsertPayload, "verification" | "metadata" | "url" | "s3_key">
>;

export type MediaInsertPayload = {
  id: string;
  org_id: string | null;
  property_id: string | null;
  media_type: string;
  s3_key: string | null;
  url: string | null;
  position: number;
  metadata: Json | null;
};
