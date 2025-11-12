-- Rollback 3000: Restore original chat RLS policies and schema

BEGIN;

-- ============================================================================
-- 1. Drop the new RLS policies FIRST (before dropping columns they reference)
-- ============================================================================

DROP POLICY IF EXISTS threads_participant_or_creator_access ON public.chat_threads;
DROP POLICY IF EXISTS threads_participant_access ON public.chat_threads;
DROP POLICY IF EXISTS threads_authenticated_insert ON public.chat_threads;
DROP POLICY IF EXISTS threads_creator_update ON public.chat_threads;
DROP POLICY IF EXISTS participants_select_all ON public.chat_participants;
DROP POLICY IF EXISTS participants_thread_member_select ON public.chat_participants;
DROP POLICY IF EXISTS participants_insert_by_thread_creator ON public.chat_participants;
DROP POLICY IF EXISTS participants_insert_with_thread ON public.chat_participants;
DROP POLICY IF EXISTS messages_participant_select ON public.chat_messages;
DROP POLICY IF EXISTS messages_participant_insert ON public.chat_messages;
DROP POLICY IF EXISTS messages_sender_update ON public.chat_messages;

-- ============================================================================
-- 2. Restore chat_participants original structure
-- ============================================================================

-- Drop new constraints and indexes
DROP INDEX IF EXISTS uq_chat_participants_thread_user;
DROP INDEX IF EXISTS uq_chat_participants_thread_contact;
ALTER TABLE public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_has_user_or_contact;
ALTER TABLE public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_pkey;

-- Remove id column if it was added
ALTER TABLE public.chat_participants DROP COLUMN IF EXISTS id;

-- Restore original composite primary key (if data allows - may fail if there's NULL data)
-- WARNING: This will fail if there are participants with NULL contact_id
-- ALTER TABLE public.chat_participants ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (thread_id, user_id, contact_id);

-- ============================================================================
-- 3. Restore org_id as NOT NULL in chat_threads (if data allows)
-- ============================================================================

-- WARNING: This will fail if there are threads with NULL org_id
-- ALTER TABLE public.chat_threads ALTER COLUMN org_id SET NOT NULL;

-- ============================================================================
-- 4. Restore original RLS policies
-- ============================================================================

-- Restore original policies from 1610_rls_policies.sql
CREATE POLICY threads_org_rw ON public.chat_threads
  FOR ALL USING (public.is_in_org(org_id)) WITH CHECK (public.is_in_org(org_id));

CREATE POLICY participants_org_rw ON public.chat_participants
  FOR ALL USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND public.is_in_org(t.org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND public.is_in_org(t.org_id)));

CREATE POLICY messages_thread_scope ON public.chat_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND public.is_in_org(t.org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND public.is_in_org(t.org_id)));

COMMIT;

