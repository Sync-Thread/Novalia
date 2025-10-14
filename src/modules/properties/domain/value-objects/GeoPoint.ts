// src/modules/properties/domain/value-objects/GeoPoint.ts
// V.O: Punto geográfico (lat/lng)
export class GeoPoint {
  public readonly lat: number;
  public readonly lng: number;

  constructor(lat: number, lng: number) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error("Invalid lat");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error("Invalid lng");
    }
    this.lat = lat;
    this.lng = lng;
  }
}
