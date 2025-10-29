// PropertyMap.tsx - Mapa interactivo para mostrar ubicación de propiedad
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PropertyMap.module.css";

interface PropertyMapProps {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Componente de mapa interactivo que muestra la ubicación de una propiedad
 * Basado en la lógica del wizard de publicación
 */
export default function PropertyMap({ lat, lng, label }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Crear mapa solo una vez
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(leafletMap.current);

      // Crear marker en la ubicación de la propiedad (no draggable en vista pública)
      markerRef.current = L.marker([lat, lng], {
        draggable: false,
      })
        .addTo(leafletMap.current)
        .bindPopup(label || "Ubicación de la propiedad");
    }

    // cleanup al desmontar
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Actualizar posición del mapa y marker cuando cambien las coordenadas
  useEffect(() => {
    if (leafletMap.current && markerRef.current) {
      leafletMap.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
      if (label) {
        markerRef.current.bindPopup(label);
      }
    }
  }, [lat, lng, label]);

  return (
    <div
      ref={mapRef}
      className={styles.map}
      aria-label="Mapa de ubicación de la propiedad"
    />
  );
}
