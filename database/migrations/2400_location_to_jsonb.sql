-- Cambiar columna location de geography a JSONB
-- Migración para almacenar coordenadas como objeto JSON simple

-- 1. Backup de datos existentes (convertir geography a JSONB)
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS location_jsonb JSONB;

-- 2. Migrar datos existentes de geography a JSONB
-- Extraer lat/lng de geography y guardar como JSON
UPDATE public.properties
SET location_jsonb = jsonb_build_object(
  'lat', ST_Y(location::geometry),
  'lng', ST_X(location::geometry)
)
WHERE location IS NOT NULL;

-- 3. Eliminar columna geography antigua
ALTER TABLE public.properties 
  DROP COLUMN IF EXISTS location;

-- 4. Renombrar la nueva columna
ALTER TABLE public.properties 
  RENAME COLUMN location_jsonb TO location;

-- 5. Opcional: Agregar índice GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_properties_location_jsonb 
  ON public.properties USING GIN (location);

-- 6. Opcional: Agregar constraint para validar estructura
ALTER TABLE public.properties 
  ADD CONSTRAINT location_valid_structure CHECK (
    location IS NULL OR (
      location ? 'lat' AND 
      location ? 'lng' AND
      jsonb_typeof(location->'lat') = 'number' AND
      jsonb_typeof(location->'lng') = 'number'
    )
  );

-- Nota: Ya no necesitamos el índice GIST geográfico
DROP INDEX IF EXISTS idx_properties_geo;
