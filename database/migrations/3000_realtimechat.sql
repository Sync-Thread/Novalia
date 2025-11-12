-- Migration: Enable Realtime for Chat Module
-- Description: Adds chat tables to supabase_realtime publication for WebSocket support
-- Created: 2025-11-11

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- This allows WebSocket subscriptions to receive real-time updates when:
-- - New messages are sent (INSERT)
-- - Messages are marked as read (UPDATE)
-- - Threads are updated (UPDATE)
-- - Participants join/leave (INSERT/UPDATE)