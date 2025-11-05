-- ============================================================================
-- Migration 2950: Fix contracts client reference
-- Problem: contracts.client_contact_id references lead_contacts, but the UI
--          is trying to save profiles.id when filtering by property
-- Solution: Add a client_profile_id column to support both lead_contacts
--           and authenticated profiles
-- Date: 2025-11-05
-- ============================================================================

-- =============================================================================
-- ANALYSIS OF THE PROBLEM
-- =============================================================================
-- 1. contracts.client_contact_id → FK to lead_contacts (anonymous/external contacts)
-- 2. get_interested_profiles() returns profiles (authenticated users)
-- 3. UI tries to save profiles.id in client_contact_id → FK violation
--
-- SOLUTION: Support both types of clients:
-- - client_contact_id → lead_contacts (anonymous contacts, leads)
-- - client_profile_id → profiles (authenticated users)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Add new column for authenticated users
-- =============================================================================
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_profile_id uuid;

-- Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contracts_client_profile_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_client_profile_id_fkey
      FOREIGN KEY (client_profile_id) 
      REFERENCES public.profiles(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key contracts_client_profile_id_fkey created';
  END IF;
END$$;

-- =============================================================================
-- 2. Add check constraint: only one client type can be set
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contracts_only_one_client_type'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_only_one_client_type
      CHECK (
        (client_contact_id IS NOT NULL AND client_profile_id IS NULL) OR
        (client_contact_id IS NULL AND client_profile_id IS NOT NULL) OR
        (client_contact_id IS NULL AND client_profile_id IS NULL)
      );
    
    RAISE NOTICE 'Check constraint contracts_only_one_client_type created';
  END IF;
END$$;

-- =============================================================================
-- 3. Add index for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_contracts_client_profile ON public.contracts(client_profile_id);

-- =============================================================================
-- 4. Add comments
-- =============================================================================
COMMENT ON COLUMN public.contracts.client_contact_id IS 
  'Cliente/contacto desde lead_contacts (leads, contactos anónimos). Mutuamente exclusivo con client_profile_id.';

COMMENT ON COLUMN public.contracts.client_profile_id IS 
  'Cliente desde profiles (usuarios autenticados). Mutuamente exclusivo con client_contact_id.';

-- =============================================================================
-- 5. Create helper function to get client info regardless of type
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_contract_client_info(p_contract_id uuid)
RETURNS TABLE (
  client_id uuid,
  client_type text,
  full_name text,
  email text,
  phone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return lead_contact info if set
  IF EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = p_contract_id 
    AND c.client_contact_id IS NOT NULL
  ) THEN
    RETURN QUERY
    SELECT 
      lc.id,
      'lead_contact'::text,
      lc.full_name,
      lc.email::text,
      lc.phone
    FROM contracts c
    INNER JOIN lead_contacts lc ON lc.id = c.client_contact_id
    WHERE c.id = p_contract_id;
    RETURN;
  END IF;

  -- Return profile info if set
  IF EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = p_contract_id 
    AND c.client_profile_id IS NOT NULL
  ) THEN
    RETURN QUERY
    SELECT 
      pr.id,
      'profile'::text,
      pr.full_name,
      pr.email::text,
      pr.phone
    FROM contracts c
    INNER JOIN profiles pr ON pr.id = c.client_profile_id
    WHERE c.id = p_contract_id;
    RETURN;
  END IF;

  -- No client set
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_contract_client_info IS 
  'Helper function to get client information from either lead_contacts or profiles';

GRANT EXECUTE ON FUNCTION public.get_contract_client_info TO authenticated;

COMMIT;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================
/*
-- Example 1: Contract with lead_contact (anonymous)
INSERT INTO contracts (
  org_id, user_id, property_id, 
  client_contact_id,  -- lead_contact
  contract_type, status, title, issued_on
) VALUES (
  'org-uuid', 'user-uuid', 'property-uuid',
  'lead-contact-uuid',
  'intermediacion', 'draft', 'Contrato de intermediación', current_date
);

-- Example 2: Contract with profile (authenticated user)
INSERT INTO contracts (
  org_id, user_id, property_id, 
  client_profile_id,  -- authenticated user
  contract_type, status, title, issued_on
) VALUES (
  'org-uuid', 'user-uuid', 'property-uuid',
  'profile-uuid',
  'promesa', 'draft', 'Promesa de compraventa', current_date
);

-- Example 3: Get client info (works for both types)
SELECT * FROM get_contract_client_info('contract-uuid');
*/

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
/*
BEGIN;

DROP FUNCTION IF EXISTS public.get_contract_client_info(uuid);

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_only_one_client_type,
  DROP CONSTRAINT IF EXISTS contracts_client_profile_id_fkey,
  DROP COLUMN IF EXISTS client_profile_id;

COMMIT;
*/
