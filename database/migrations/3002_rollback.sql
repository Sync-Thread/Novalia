-- Rollback for Migration 3002

BEGIN;

-- Drop the new policy
DROP POLICY IF EXISTS profiles_self_and_chat_select ON public.profiles;

-- Restore the original restrictive policy
CREATE POLICY profiles_self_select ON public.profiles 
  FOR SELECT 
  USING (id = auth.uid());

COMMIT;
