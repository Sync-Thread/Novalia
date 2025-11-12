-- Migration 3001: Fix chat_participants to allow NULL in user_id and contact_id
-- 
-- Problem: After adding id column, user_id and contact_id still have NOT NULL constraint
-- This prevents inserting rows with user_id OR contact_id (one must be NULL)

BEGIN;

-- Drop the check constraint temporarily to modify columns
ALTER TABLE public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_has_user_or_contact;

-- Make user_id and contact_id nullable
ALTER TABLE public.chat_participants ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_participants ALTER COLUMN contact_id DROP NOT NULL;

-- Re-add the check constraint
ALTER TABLE public.chat_participants 
  ADD CONSTRAINT chat_participants_has_user_or_contact 
  CHECK (
    (user_id IS NOT NULL AND contact_id IS NULL) 
    OR 
    (user_id IS NULL AND contact_id IS NOT NULL)
  );

COMMIT;
