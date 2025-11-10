-- Migration: Hacer org_id opcional y agregar columnas de usuario dueño
-- Fecha: 2025-11-04
-- Descripción: Permite que usuarios sin organización puedan usar el sistema

-- ============================================================================
-- 1. Hacer org_id NULLABLE en properties
-- ============================================================================
ALTER TABLE public.properties 
  ALTER COLUMN org_id DROP NOT NULL;

-- Agregar columna lister_user_id (usuario dueño de la propiedad)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lister_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_properties_lister_user_id 
  ON public.properties(lister_user_id) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. Hacer org_id NULLABLE en contracts
-- ============================================================================
ALTER TABLE public.contracts 
  ALTER COLUMN org_id DROP NOT NULL;

-- Agregar columna user_id (usuario creador del contrato)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_contracts_user_id 
  ON public.contracts(user_id);

-- ============================================================================
-- 3. Actualizar políticas RLS para properties
-- ============================================================================

-- Eliminar política antigua
DROP POLICY IF EXISTS properties_org_rw ON public.properties;

-- Nueva política: acceso por org O por usuario dueño
CREATE POLICY properties_org_or_owner_rw ON public.properties
  FOR ALL 
  USING (
    -- Si tiene org: verificar que el usuario pertenezca al org
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    -- Si NO tiene org: verificar que sea el dueño
    (org_id IS NULL AND lister_user_id = auth.uid())
  )
  WITH CHECK (
    -- Mismo criterio para INSERT/UPDATE
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    (org_id IS NULL AND lister_user_id = auth.uid())
  );

-- ============================================================================
-- 4. Actualizar políticas RLS para contracts
-- ============================================================================

-- Eliminar política antigua
DROP POLICY IF EXISTS contracts_org_rw ON public.contracts;

-- Nueva política: acceso por org O por usuario creador
CREATE POLICY contracts_org_or_owner_rw ON public.contracts
  FOR ALL 
  USING (
    -- Si tiene org: verificar que el usuario pertenezca al org
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    -- Si NO tiene org: verificar que sea el creador
    (org_id IS NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    -- Mismo criterio para INSERT/UPDATE
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    (org_id IS NULL AND user_id = auth.uid())
  );

-- ============================================================================
-- 5. Actualizar políticas RLS para media_assets (fotos de propiedades)
-- ============================================================================

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS media_assets_org_rw ON public.media_assets;

-- Nueva política: acceso por org O por dueño de la propiedad
CREATE POLICY media_assets_org_or_owner_rw ON public.media_assets
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = media_assets.property_id
      AND (
        (p.org_id IS NOT NULL AND public.is_in_org(p.org_id))
        OR
        (p.org_id IS NULL AND p.lister_user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = media_assets.property_id
      AND (
        (p.org_id IS NOT NULL AND public.is_in_org(p.org_id))
        OR
        (p.org_id IS NULL AND p.lister_user_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- 6. Actualizar políticas RLS para property_leads
-- ============================================================================

-- Hacer org_id nullable en property_leads
ALTER TABLE public.property_leads 
  ALTER COLUMN org_id DROP NOT NULL;

-- Agregar columna user_id para usuarios sin org
ALTER TABLE public.property_leads
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS property_leads_org_rw ON public.property_leads;

-- Nueva política: acceso por org O por usuario dueño de la propiedad
CREATE POLICY property_leads_org_or_owner_rw ON public.property_leads
  FOR ALL 
  USING (
    -- Si el lead tiene org: verificar que el usuario pertenezca al org
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    -- Si NO tiene org: verificar que la propiedad pertenezca al usuario
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_leads.property_id
      AND p.lister_user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_leads.property_id
      AND p.lister_user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 7. Actualizar políticas RLS para attributions
-- ============================================================================

-- Hacer org_id nullable en attributions
ALTER TABLE public.attributions 
  ALTER COLUMN org_id DROP NOT NULL;

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS attributions_org_rw ON public.attributions;

-- Nueva política: acceso por org O por dueño de la propiedad
CREATE POLICY attributions_org_or_owner_rw ON public.attributions
  FOR ALL 
  USING (
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = attributions.property_id
      AND p.lister_user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (org_id IS NOT NULL AND public.is_in_org(org_id))
    OR
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = attributions.property_id
      AND p.lister_user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 8. Migrar datos existentes (opcional)
-- ============================================================================

-- COMENTADO: Descomentar si quieres asignar lister_user_id automáticamente
-- a propiedades existentes basándote en el created_by o primer admin del org

-- UPDATE public.properties
-- SET lister_user_id = (
--   SELECT p.id 
--   FROM public.profiles p
--   WHERE p.org_id = properties.org_id
--   AND p.role = 'admin'
--   LIMIT 1
-- )
-- WHERE org_id IS NOT NULL 
-- AND lister_user_id IS NULL;

-- ============================================================================
-- 9. Comentarios en columnas
-- ============================================================================

COMMENT ON COLUMN public.properties.lister_user_id IS 
  'Usuario dueño de la propiedad (para usuarios sin organización)';

COMMENT ON COLUMN public.contracts.user_id IS 
  'Usuario creador del contrato (para usuarios sin organización)';

COMMENT ON COLUMN public.property_leads.user_id IS 
  'Usuario dueño del lead (para usuarios sin organización)';

-- ============================================================================
-- Fin de migration
-- ============================================================================
