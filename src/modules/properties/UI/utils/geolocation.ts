import { useState, useEffect } from "react";

/**
 * Verifica si el navegador soporta geolocalización
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

export interface Coords {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocalización no soportada en este navegador");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return { coords, error, loading };
}

/**
 * Obtiene la posición actual del usuario de forma asíncrona
 * @returns Promise con las coordenadas {lat, lng}
 * @throws Error si la geolocalización no está soportada o el usuario la rechaza
 */
export async function getCurrentPosition(): Promise<Coords> {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocalización no soportada en este navegador");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(err.message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}