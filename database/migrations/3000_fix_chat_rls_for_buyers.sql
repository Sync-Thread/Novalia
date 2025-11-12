-- Migration 3000: Fix chat RLS policies to allow buyer-seller communication
-- 
-- Problem: Current RLS policy requires org_id and checks is_in_org()
-- This blocks buyers (who don't have org_id) from creating chat threads
--
-- Solution: Allow threads with or without org_id, and participants can be:
-- 1. Users with org (seller/agent) - must be in thread's org
-- 2. Users without org (buyers) - can create/participate in threads about properties they're interested in

-- Drop old restrictive policies
DROP POLICY IF EXISTS threads_org_rw ON public.chat_threads;
DROP POLICY IF EXISTS participants_org_rw ON public.chat_participants;
DROP POLICY IF EXISTS messages_thread_scope ON public.chat_messages;

-- New policy for chat_threads: 
-- - Users can see threads where they are a participant
-- - Users can create threads (with or without org_id)
CREATE POLICY threads_participant_access ON public.chat_threads
  FOR SELECT 
  USING (
    EXISTS (
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
-- - Can see participants of threads they're in
-- - Can insert themselves or be added to threads about properties they can access
CREATE POLICY participants_thread_member_select ON public.chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp2
      WHERE cp2.thread_id = thread_id
        AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY participants_insert_with_thread ON public.chat_participants
  FOR INSERT
  WITH CHECK (
    -- Thread must exist and be accessible
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        -- Either user is creating the thread (is creator)
        AND (
          t.created_by = auth.uid()
          OR
          -- Or user is being added to an existing thread they can access
          EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.thread_id = t.id
              AND cp.user_id = auth.uid()
          )
        )
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
