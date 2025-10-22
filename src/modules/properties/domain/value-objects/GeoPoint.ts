// src/modules/properties/domain/value-objects/GeoPoint.ts
// Geographic point with latitude/longitude validation.

import { InvalidValueError } from "../errors/InvalidValueError";

export class GeoPoint {
  public readonly lat: number;
  public readonly lng: number;

  constructor(lat: number, lng: number) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new InvalidValueError("Latitude must be between -90 and 90", { details: { lat } });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new InvalidValueError("Longitude must be between -180 and 180", { details: { lng } });
    }
    this.lat = lat;
    this.lng = lng;
  }
}

