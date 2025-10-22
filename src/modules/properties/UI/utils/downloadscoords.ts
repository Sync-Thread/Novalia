import { supabase } from '../../../../core/supabase/client'; // Tu cliente Supabase

/**
 * Descarga las coordenadas de una propiedad específica
 * @param propertyId - ID de la propiedad
 * @returns Objeto con id y coordenadas (lat, lng) o null si no existe
 */
// export const descargarCoordenadasDePropiedad = async (propertyId: string) => {
//   console.log('a descargar las de la propiedad ',propertyId);

//   const { data, error } = await supabase
//     .from('properties')
//     .select('id, location')
//     .eq('id', propertyId)
//     .single();
//   console.log('algun error con el supabase?');
        
//   if (error) {
//     console.error('Error al descargar coordenadas:', error.message);
//     return null;
//   }

//   if (!data?.location) {
//     console.log('La propiedad no tiene coordenadas');
//     return null;
//   }

//   // El campo 'location' viene en formato GeoJSON desde Supabase
//   // Formato: {"type":"Point","coordinates":[lng,lat]}
//   console.log('casi a geoJson');
  
//   const geoJson = data.location as any;
//   console.log('geoJson',geoJson);
  
//   if (geoJson?.coordinates && Array.isArray(geoJson.coordinates)) {
//     const [lng, lat] = geoJson.coordinates;
    
//     const result = {
//       id: data.id,
//       lat,
//       lng,
//     };
    
//     console.log('Coordenadas descargadas:', result);
//     return result;
//   }
//   console.log(' no fue posible? .... :c');
  
//   return null;
// };

// La forma más robusta:
export const descargarCoordenadasDePropiedad = async (propertyId: string) => {
  console.log('a descargar las de la propiedad ', propertyId);

  // Usa ST_Y (Latitud) y ST_X (Longitud) directamente
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id,
      ST_Y(location::geometry)::float as lat,
      ST_X(location::geometry)::float as lng
    `)
    .eq('id', propertyId)
    .single();

  if (error) {
    // Si la extensión POSTGIS no está activada, el error aparecerá aquí.
    console.error('Error al descargar coordenadas:', error.message);
    return null;
  }
  
  // ... (el resto de tu lógica para manejar data.lat y data.lng)
  console.log(data);
  
  // if (data?.lat && data?.lng) {
  //   const result = {
  //     id: data.id,
  //     lat: data.lat,
  //     lng: data.lng,
  //   };
    
  //   console.log('Coordenadas descargadas:', result);
  //   return result;
  // }
  
  console.log('No fue posible obtener lat/lng.');
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
      const geoJson = property.location as any;
      
      if (geoJson?.coordinates && Array.isArray(geoJson.coordinates)) {
        const [lng, lat] = geoJson.coordinates;
        return {
          id: property.id,
          lat,
          lng,
        };
      }
      
      return null;
    })
    .filter((item) => item !== null);

  console.log(`Descargadas ${coordenadas.length} coordenadas`);
  return coordenadas;
};
