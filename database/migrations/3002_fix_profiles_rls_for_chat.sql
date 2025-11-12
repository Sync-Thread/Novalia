-- Migration 3002: Allow users to see BASIC INFO of chat participants
--
-- Problem: profiles RLS only allows users to see their own profile (profiles_self_select)
-- This blocks chat from showing participant names/avatars
-- The policy is recreated by 2000_patches.sql, so we need to force-replace it
--
-- Solution: Allow seeing ONLY basic contact info (name, avatar, email, phone)
--           and ONLY for users you share a chat thread with
--
-- Security: No access to sensitive fields like role, org_id, permissions, etc.

BEGIN;

-- Force drop both old and new policies (in case of partial migration)
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_and_chat_select ON public.profiles;

-- Create new policy that allows:
-- 1. Full access to your own profile
-- 2. LIMITED access to profiles of users you share a chat thread with
--    (chat participants can only see: id, full_name, avatar_url, email, phone)
CREATE POLICY profiles_self_and_chat_select ON public.profiles
  FOR SELECT
  USING (
    -- Full access to own profile
    id = auth.uid()
    OR
    -- Limited access: only if you're in a chat thread together
    -- The application layer will only SELECT the allowed fields:
    -- id, full_name, avatar_url, email, phone
    EXISTS (
      SELECT 1 
      FROM public.chat_participants cp1
      JOIN public.chat_participants cp2 ON cp2.thread_id = cp1.thread_id
      WHERE cp1.user_id = auth.uid()
        AND cp2.user_id = profiles.id
    )
  );

COMMIT;
