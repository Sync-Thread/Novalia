import { supabase } from '../../../../core/supabase/client';

/**
 * Descarga las coordenadas de una propiedad específica
 * @param propertyId - ID de la propiedad
 * @returns Objeto con id y coordenadas (lat, lng) o null si no existe
 */
export const descargarCoordenadasDePropiedad = async (propertyId: string) => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, location')
    .eq('id', propertyId)
    .single();
        
  if (error) {
    console.error('Error al descargar coordenadas:', error.message);
    return null;
  }

  if (!data?.location) {
    console.log('La propiedad no tiene coordenadas');
    return null;
  }

  // El campo 'location' es JSONB con formato: {"lat": number, "lng": number}
  const location = data.location as any;
  console.log('location: ',location);
  
  
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    const result = {
      // id: data.id,
      lat: location.lat,
      lng: location.lng,
    };
    
    console.log('Coordenadas descargadas:', result);
    return result;
  }
  
  console.log('Location no tiene el formato esperado {lat, lng}');
  return null;
};

/**
 * Descarga las coordenadas de TODAS las propiedades
 * @returns Array de objetos con id y coordenadas
 */
export const descargarTodasLasCoordenadas = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, location')
    .not('location', 'is', null); // Solo propiedades con coordenadas
      
  if (error) {
    console.error('Error al descargar coordenadas:', error.message);
    return [];
  }

  // Mapear cada registro a formato {id, lat, lng}
  const coordenadas = data
    .map((property) => {
      const location = property.location as any;
      
      // Ahora location es JSONB: {"lat": number, "lng": number}
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        return {
          id: property.id,
          lat: location.lat,
          lng: location.lng,
        };
      }
      
      return null;
    })
    .filter((item) => item !== null);

  console.log(`Descargadas ${coordenadas.length} coordenadas`);
  return coordenadas;
};
