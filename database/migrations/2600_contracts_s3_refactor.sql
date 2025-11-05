-- ============================================================
-- Contracts — adaptar tabla existente para S3 privado + mínimos de negocio
-- Requisitos previos: enums contract_type_enum y contract_status_enum.
-- Tabla public.contracts YA existe (puede estar vacía).
-- ============================================================

-- Helper: updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 1) Limpieza de columnas que ya no usaremos
ALTER TABLE public.contracts
  DROP COLUMN IF EXISTS template_id,
  DROP COLUMN IF EXISTS seller_org_id,
  DROP COLUMN IF EXISTS buyer_contact_id,
  DROP COLUMN IF EXISTS file_url;

-- 2) Nuevos campos de negocio y de archivo S3 (idempotentes)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS title               text,
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS client_contact_id   uuid,
  ADD COLUMN IF NOT EXISTS is_template         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS issued_on           date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS due_on              date,
  ADD COLUMN IF NOT EXISTS s3_key              text,
  ADD COLUMN IF NOT EXISTS url                 text,
  ADD COLUMN IF NOT EXISTS hash_sha256         text,
  ADD COLUMN IF NOT EXISTS metadata            jsonb;

-- 3) FKs (crear sólo si no existen con ese nombre)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_org_id_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_property_id_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_client_contact_fkey') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_client_contact_fkey
      FOREIGN KEY (client_contact_id) REFERENCES public.lead_contacts(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 4) Constraints de negocio y archivo (sólo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_template_requires_no_property') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_template_requires_no_property
      CHECK (is_template = false OR property_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_real_requires_property') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_real_requires_property
      CHECK (is_template = true OR property_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_due_gte_issued') THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_due_gte_issued
      CHECK (due_on IS NULL OR due_on >= issued_on);
  END IF;

END$$;

-- 5) Índices útiles (idempotentes)
CREATE INDEX IF NOT EXISTS idx_contracts_status_created ON public.contracts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_org_created    ON public.contracts (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_property       ON public.contracts (property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_is_template    ON public.contracts (is_template);

-- 6) Asegurar trigger updated_at
DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) (Opcional) Forzar título obligatorio si la tabla está vacía
DO $$
BEGIN
  IF (SELECT COUNT(*) = 0 FROM public.contracts) THEN
    ALTER TABLE public.contracts
      ALTER COLUMN title SET NOT NULL;
  END IF;
END$$;

-- Comentarios (documentación en DB)
COMMENT ON TABLE  public.contracts IS 'Contratos/plantillas con archivo en S3 privado. Acceso por RLS de org_id.';
COMMENT ON COLUMN public.contracts.title              IS 'Título del contrato o plantilla (obligatorio si la tabla está vacía).';
COMMENT ON COLUMN public.contracts.description        IS 'Descripción opcional.';
COMMENT ON COLUMN public.contracts.client_contact_id  IS 'Cliente/contacto asociado desde lead_contacts (opcional).';
COMMENT ON COLUMN public.contracts.is_template        IS 'true = plantilla (no requiere property_id); false = contrato real (requiere property_id).';
COMMENT ON COLUMN public.contracts.issued_on          IS 'Fecha de emisión.';
COMMENT ON COLUMN public.contracts.due_on             IS 'Fecha de vencimiento (>= issued_on).';
COMMENT ON COLUMN public.contracts.s3_key             IS 'Clave en bucket privado (p. ej. contracts/{org_id}/{id}.pdf).';
COMMENT ON COLUMN public.contracts.url                IS 'URL pública temporal (presigned) generada bajo demanda.';
COMMENT ON COLUMN public.contracts.hash_sha256        IS 'Hash SHA-256 del archivo para verificación de integridad.';
COMMENT ON COLUMN public.contracts.metadata           IS 'Metadatos adicionales en formato JSON (MIME, tamaño, etc.).';
