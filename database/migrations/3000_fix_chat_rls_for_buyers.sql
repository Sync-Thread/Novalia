-- Migration 3000: Fix chat RLS policies to allow buyer-seller communication
-- 
-- Problem: Current RLS policy requires org_id and checks is_in_org()
-- This blocks buyers (who don't have org_id) from creating chat threads
--
-- Solution: Allow threads with or without org_id, and participants can be:
-- 1. Users with org (seller/agent) - must be in thread's org
-- 2. Users without org (buyers) - can create/participate in threads about properties they're interested in

BEGIN;

-- ============================================================================
-- 1. Make org_id NULLABLE in chat_threads (allows buyer-seller communication)
-- ============================================================================
ALTER TABLE public.chat_threads 
  ALTER COLUMN org_id DROP NOT NULL;

COMMENT ON COLUMN public.chat_threads.org_id IS 
  'Organization ID (null for buyer-initiated threads, not null for org-owned threads)';

-- ============================================================================
-- 1b. Fix chat_participants primary key to allow NULL in user_id OR contact_id
-- ============================================================================

-- Drop the old composite primary key that doesn't allow NULLs
ALTER TABLE public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_pkey;

-- Add id column as primary key
ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.chat_participants ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (id);

-- Add unique constraint: a user OR contact can only be in a thread once
-- Using partial unique indexes to handle NULL values correctly
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_participants_thread_user 
  ON public.chat_participants(thread_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_participants_thread_contact 
  ON public.chat_participants(thread_id, contact_id) 
  WHERE contact_id IS NOT NULL;

-- Add check constraint: must have either user_id OR contact_id (not both, not neither)
ALTER TABLE public.chat_participants 
  ADD CONSTRAINT chat_participants_has_user_or_contact 
  CHECK (
    (user_id IS NOT NULL AND contact_id IS NULL) 
    OR 
    (user_id IS NULL AND contact_id IS NOT NULL)
  );

-- ============================================================================
-- 2. Update RLS policies to support both org and non-org users
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS threads_org_rw ON public.chat_threads;
DROP POLICY IF EXISTS participants_org_rw ON public.chat_participants;
DROP POLICY IF EXISTS messages_thread_scope ON public.chat_messages;

-- New policy for chat_threads: 
-- - Users can see threads where they are a participant OR where they created it
-- - Users can create threads (with or without org_id)
CREATE POLICY threads_participant_or_creator_access ON public.chat_threads
  FOR SELECT 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.thread_id = id 
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY threads_authenticated_insert ON public.chat_threads
  FOR INSERT 
  WITH CHECK (
    -- Must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- If org_id is provided, user must be in that org
    (org_id IS NULL OR public.is_in_org(org_id))
    AND
    -- User creating the thread must be the created_by
    created_by = auth.uid()
  );

CREATE POLICY threads_creator_update ON public.chat_threads
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- New policy for chat_participants:
-- - Can see ALL participants (no restriction) to avoid recursion with threads
-- - Can insert participants when creating a thread (thread.created_by = auth.uid())
CREATE POLICY participants_select_all ON public.chat_participants
  FOR SELECT
  USING (true);

CREATE POLICY participants_insert_by_thread_creator ON public.chat_participants
  FOR INSERT
  WITH CHECK (
    -- Can add participants if you're the thread creator
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND t.created_by = auth.uid()
    )
  );

-- New policy for chat_messages:
-- - Can read messages from threads they're in
-- - Can send messages to threads they're in
CREATE POLICY messages_participant_select ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = thread_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY messages_participant_insert ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    -- Must be a participant of the thread
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.thread_id = thread_id
        AND cp.user_id = auth.uid()
    )
    AND
    -- Sender must be the authenticated user
    sender_user_id = auth.uid()
  );

CREATE POLICY messages_sender_update ON public.chat_messages
  FOR UPDATE
  USING (sender_user_id = auth.uid())
  WITH CHECK (sender_user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;

COMMIT;
