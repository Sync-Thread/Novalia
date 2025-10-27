-- ============================================================================
-- Migration: Properties Metrics Materialization from Events
-- Description: Creates a materialized metrics table with real-time sync via triggers
-- Author: Generated for Novalia
-- Date: 2025-10-27
-- 
-- IMPORTANT BEHAVIOR:
-- * Excludes self-interactions: Events where user_id = property.lister_user_id
--   are NOT counted in metrics to prevent owners from inflating their stats
-- * Owner events still update last_event_at for activity tracking
-- * This applies to: page_view, property_click, first_contact, share, chat_message
-- ============================================================================

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLE: properties_metrics
-- Stores aggregated event metrics per property for fast querying
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties_metrics (
    property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
    views_count bigint DEFAULT 0 NOT NULL CHECK (views_count >= 0),
    clicks_count bigint DEFAULT 0 NOT NULL CHECK (clicks_count >= 0),
    contacts_count bigint DEFAULT 0 NOT NULL CHECK (contacts_count >= 0),
    shares_count bigint DEFAULT 0 NOT NULL CHECK (shares_count >= 0),
    chat_messages_count bigint DEFAULT 0 NOT NULL CHECK (chat_messages_count >= 0),
    last_event_at timestamptz NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add comment documentation
COMMENT ON TABLE public.properties_metrics IS 'Materialized view of property event metrics for performance';
COMMENT ON COLUMN public.properties_metrics.property_id IS 'FK to properties table';
COMMENT ON COLUMN public.properties_metrics.views_count IS 'Total page_view events for this property';
COMMENT ON COLUMN public.properties_metrics.clicks_count IS 'Total property_click events';
COMMENT ON COLUMN public.properties_metrics.contacts_count IS 'Total first_contact events';
COMMENT ON COLUMN public.properties_metrics.shares_count IS 'Total share events';
COMMENT ON COLUMN public.properties_metrics.chat_messages_count IS 'Total chat_message events';
COMMENT ON COLUMN public.properties_metrics.last_event_at IS 'Timestamp of most recent event for this property';
COMMENT ON COLUMN public.properties_metrics.updated_at IS 'Last time metrics were updated';

-- -----------------------------------------------------------------------------
-- 2. CREATE INDEXES
-- Optimize queries on events table and support efficient metric calculation
-- -----------------------------------------------------------------------------

-- Index for events filtering by property_id, event_type, and time-based queries
-- This dramatically speeds up aggregation queries and backfills
CREATE INDEX IF NOT EXISTS idx_events_property_type_occurred 
    ON public.events(property_id, event_type, occurred_at DESC)
    WHERE property_id IS NOT NULL;

-- Index for time-based queries on properties_metrics
CREATE INDEX IF NOT EXISTS idx_properties_metrics_last_event 
    ON public.properties_metrics(last_event_at DESC NULLS LAST);

-- Index for sorting by view count (most viewed properties)
CREATE INDEX IF NOT EXISTS idx_properties_metrics_views 
    ON public.properties_metrics(views_count DESC);

-- -----------------------------------------------------------------------------
-- 3. CREATE FUNCTION: sync_property_metrics_from_event
-- Incremental UPSERT function called by trigger for each new event
-- Uses SECURITY DEFINER to bypass RLS when updating metrics
-- -----------------------------------------------------------------------------

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.sync_property_metrics_from_event() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_property_metrics_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Required to update metrics table even with RLS enabled
SET search_path = public -- Security: prevent search_path hijacking
AS $$
DECLARE
    v_views_delta bigint := 0;
    v_clicks_delta bigint := 0;
    v_contacts_delta bigint := 0;
    v_shares_delta bigint := 0;
    v_chat_messages_delta bigint := 0;
    v_property_owner_id uuid;
BEGIN
    -- Only process events that have a property_id
    IF NEW.property_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the property owner (lister_user_id) to avoid counting self-interactions
    SELECT lister_user_id INTO v_property_owner_id
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Skip counting if the event user is the property owner (avoid self-inflation)
    -- Only applies to trackable events, not system/automated events
    IF NEW.user_id IS NOT NULL 
       AND v_property_owner_id IS NOT NULL 
       AND NEW.user_id = v_property_owner_id THEN
        -- Owner interacting with their own property: don't count metrics
        -- But still update last_event_at for activity tracking
        UPDATE public.properties_metrics
        SET 
            last_event_at = GREATEST(last_event_at, NEW.occurred_at),
            updated_at = now()
        WHERE property_id = NEW.property_id;
        
        RETURN NEW;
    END IF;

    -- Determine which counter to increment based on event_type
    CASE NEW.event_type
        WHEN 'page_view' THEN
            v_views_delta := 1;
        WHEN 'property_click' THEN
            v_clicks_delta := 1;
        WHEN 'first_contact' THEN
            v_contacts_delta := 1;
        WHEN 'share' THEN
            v_shares_delta := 1;
        WHEN 'chat_message' THEN
            v_chat_messages_delta := 1;
        ELSE
            -- Other event types: just update last_event_at without incrementing counters
            NULL;
    END CASE;

    -- UPSERT: Insert new row or update existing metrics atomically
    INSERT INTO public.properties_metrics (
        property_id,
        views_count,
        clicks_count,
        contacts_count,
        shares_count,
        chat_messages_count,
        last_event_at,
        updated_at
    ) VALUES (
        NEW.property_id,
        v_views_delta,
        v_clicks_delta,
        v_contacts_delta,
        v_shares_delta,
        v_chat_messages_delta,
        NEW.occurred_at,
        now()
    )
    ON CONFLICT (property_id) DO UPDATE SET
        views_count = public.properties_metrics.views_count + EXCLUDED.views_count,
        clicks_count = public.properties_metrics.clicks_count + EXCLUDED.clicks_count,
        contacts_count = public.properties_metrics.contacts_count + EXCLUDED.contacts_count,
        shares_count = public.properties_metrics.shares_count + EXCLUDED.shares_count,
        chat_messages_count = public.properties_metrics.chat_messages_count + EXCLUDED.chat_messages_count,
        last_event_at = GREATEST(public.properties_metrics.last_event_at, EXCLUDED.last_event_at),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Security: Revoke execute from public roles to prevent abuse
-- Only the trigger (which runs as definer) should execute this function
REVOKE EXECUTE ON FUNCTION public.sync_property_metrics_from_event() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.sync_property_metrics_from_event() IS 
'Trigger function to sync properties_metrics on each new event. Excludes self-interactions (owner events on their own property). Uses SECURITY DEFINER to bypass RLS. REVOKED from public/anon/authenticated for security.';

-- -----------------------------------------------------------------------------
-- 4. CREATE TRIGGER: events_after_insert_sync_metrics
-- Automatically calls sync function after each INSERT on events
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS events_after_insert_sync_metrics ON public.events;

CREATE TRIGGER events_after_insert_sync_metrics
    AFTER INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_property_metrics_from_event();

COMMENT ON TRIGGER events_after_insert_sync_metrics ON public.events IS 
'Automatically updates properties_metrics table after each event insert';

-- -----------------------------------------------------------------------------
-- 5. INITIAL DATA LOAD (BACKFILL)
-- Populate metrics from existing events
-- For large tables, consider running this in batches or async job
-- -----------------------------------------------------------------------------

-- Option A: Simple INSERT (good for small-medium datasets < 1M events)
-- Excludes events where user_id matches property owner (lister_user_id)
INSERT INTO public.properties_metrics (
    property_id,
    views_count,
    clicks_count,
    contacts_count,
    shares_count,
    chat_messages_count,
    last_event_at,
    updated_at
)
SELECT 
    e.property_id,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS views_count,
    COUNT(*) FILTER (WHERE e.event_type = 'property_click') AS clicks_count,
    COUNT(*) FILTER (WHERE e.event_type = 'first_contact') AS contacts_count,
    COUNT(*) FILTER (WHERE e.event_type = 'share') AS shares_count,
    COUNT(*) FILTER (WHERE e.event_type = 'chat_message') AS chat_messages_count,
    MAX(e.occurred_at) AS last_event_at,
    now() AS updated_at
FROM public.events e
LEFT JOIN public.properties p ON p.id = e.property_id
WHERE e.property_id IS NOT NULL
  -- Exclude self-interactions: don't count when event user is the property owner
  AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
GROUP BY e.property_id
ON CONFLICT (property_id) DO NOTHING; -- Skip if already exists

-- Performance Note: For large datasets (>1M events), consider:
-- 1. Running backfill in batches with WHERE property_id IN (SELECT ... LIMIT 1000)
-- 2. Using pg_cron or background job to avoid blocking migration
-- 3. Creating the trigger AFTER backfill to avoid duplicate processing

-- -----------------------------------------------------------------------------
-- 6. ALTERNATIVE: MATERIALIZED VIEW FOR DAILY AGGREGATIONS (COMMENTED OUT)
-- Uncomment if you need pre-aggregated daily stats for reporting/dashboards
-- -----------------------------------------------------------------------------

/*
-- Daily aggregated view for analytics
-- Excludes self-interactions (owner viewing their own property)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.property_views_daily_mv AS
SELECT 
    e.property_id,
    DATE_TRUNC('day', e.occurred_at) AS event_date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS views_count,
    COUNT(*) FILTER (WHERE e.event_type = 'property_click') AS clicks_count,
    COUNT(*) FILTER (WHERE e.event_type = 'first_contact') AS contacts_count,
    COUNT(*) FILTER (WHERE e.event_type = 'share') AS shares_count,
    COUNT(*) FILTER (WHERE e.event_type = 'chat_message') AS chat_messages_count,
    COUNT(DISTINCT e.user_id) AS unique_users
FROM public.events e
LEFT JOIN public.properties p ON p.id = e.property_id
WHERE e.property_id IS NOT NULL
  -- Exclude self-interactions: don't count when event user is the property owner
  AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
GROUP BY e.property_id, DATE_TRUNC('day', e.occurred_at);

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_views_daily_mv_pk 
    ON public.property_views_daily_mv(property_id, event_date);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_property_views_daily_mv_date 
    ON public.property_views_daily_mv(event_date DESC);

-- Refresh command (run periodically via pg_cron or scheduled job):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.property_views_daily_mv;

COMMENT ON MATERIALIZED VIEW public.property_views_daily_mv IS 
'Daily aggregated property metrics. Refresh periodically with: REFRESH MATERIALIZED VIEW CONCURRENTLY public.property_views_daily_mv;';
*/

-- -----------------------------------------------------------------------------
-- 7. GRANTS & RLS POLICIES
-- Grant read access to appropriate roles
-- -----------------------------------------------------------------------------

-- Grant SELECT to authenticated users (adjust as per your security model)
GRANT SELECT ON public.properties_metrics TO authenticated;

-- Enable RLS on metrics table
ALTER TABLE public.properties_metrics ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Users can only see metrics for properties they own/manage
-- Adjust based on your properties table ownership model
CREATE POLICY properties_metrics_select_policy ON public.properties_metrics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = properties_metrics.property_id
            -- Adjust condition based on your ownership column (e.g., p.owner_id = auth.uid())
            -- Example: AND p.user_id = auth.uid()
        )
    );

COMMENT ON POLICY properties_metrics_select_policy ON public.properties_metrics IS 
'Users can view metrics for properties they have access to (adjust based on your properties ownership model)';

-- =============================================================================
-- VALIDATION QUERIES
-- Run these after migration to verify correctness
-- =============================================================================

-- Query 1: Top 10 most viewed properties
/*
SELECT 
    pm.property_id,
    p.title AS property_title,
    pm.views_count,
    pm.clicks_count,
    pm.contacts_count,
    pm.shares_count,
    pm.last_event_at
FROM public.properties_metrics pm
JOIN public.properties p ON p.id = pm.property_id
ORDER BY pm.views_count DESC
LIMIT 10;
*/

-- Query 2: Consistency check - compare events sum vs metrics sum
-- NOTE: Excludes self-interactions (owner events on their own property)
/*
WITH events_sum AS (
    SELECT 
        COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS total_views,
        COUNT(*) FILTER (WHERE e.event_type = 'property_click') AS total_clicks,
        COUNT(*) FILTER (WHERE e.event_type = 'first_contact') AS total_contacts,
        COUNT(*) FILTER (WHERE e.event_type = 'share') AS total_shares,
        COUNT(*) FILTER (WHERE e.event_type = 'chat_message') AS total_chat_messages
    FROM public.events e
    LEFT JOIN public.properties p ON p.id = e.property_id
    WHERE e.property_id IS NOT NULL
      -- Exclude self-interactions to match metrics logic
      AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
),
metrics_sum AS (
    SELECT 
        SUM(views_count) AS total_views,
        SUM(clicks_count) AS total_clicks,
        SUM(contacts_count) AS total_contacts,
        SUM(shares_count) AS total_shares,
        SUM(chat_messages_count) AS total_chat_messages
    FROM public.properties_metrics
)
SELECT 
    'events' AS source, e.* FROM events_sum e
UNION ALL
SELECT 
    'metrics' AS source, m.* FROM metrics_sum m;
-- Both rows should show identical numbers
*/

-- Query 3: Sample events vs metrics for a specific property
-- Excludes self-interactions to match metrics logic
/*
WITH sample_property AS (
    SELECT property_id 
    FROM public.properties_metrics 
    WHERE views_count > 0 
    LIMIT 1
)
SELECT 
    'events_count' AS source,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS views,
    COUNT(*) FILTER (WHERE e.event_type = 'property_click') AS clicks,
    MAX(e.occurred_at) AS last_event
FROM public.events e
LEFT JOIN public.properties p ON p.id = e.property_id
WHERE e.property_id = (SELECT property_id FROM sample_property)
  -- Exclude self-interactions
  AND (e.user_id IS NULL OR p.lister_user_id IS NULL OR e.user_id != p.lister_user_id)
UNION ALL
SELECT 
    'metrics_count' AS source,
    views_count AS views,
    clicks_count AS clicks,
    last_event_at AS last_event
FROM public.properties_metrics
WHERE property_id = (SELECT property_id FROM sample_property);
-- Both rows should match
*/

-- =============================================================================
-- PERFORMANCE RECOMMENDATIONS
-- =============================================================================

-- For high-traffic systems (>1000 events/sec):
-- 1. Consider batching: Use a queue + background worker to update metrics in batches
--    instead of per-event trigger (reduces contention on metrics table)
-- 2. Partition events table by time range (e.g., monthly) to improve query performance
-- 3. Use connection pooling (pgBouncer) to handle concurrent updates
-- 4. Monitor lock contention on properties_metrics rows (pg_stat_user_tables)
-- 5. Consider using Postgres 15+ MERGE statement for better upsert performance
-- 6. If event volume is extreme, explore streaming aggregations (e.g., pg_cron + CTEs)

-- For read-heavy analytics:
-- 1. Enable the materialized view (uncomment section 6) and refresh periodically
-- 2. Create additional indexes on metrics table for your specific query patterns
-- 3. Use read replicas for reporting queries to offload primary DB

-- =============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- Execute these in order to revert changes
-- =============================================================================

/*
-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS events_after_insert_sync_metrics ON public.events;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS public.sync_property_metrics_from_event() CASCADE;

-- Step 3: Drop indexes on properties_metrics
DROP INDEX IF EXISTS public.idx_properties_metrics_views;
DROP INDEX IF EXISTS public.idx_properties_metrics_last_event;

-- Step 4: Drop indexes on events
DROP INDEX IF EXISTS public.idx_events_property_type_occurred;

-- Step 5: Drop table (CASCADE removes FK constraints)
DROP TABLE IF EXISTS public.properties_metrics CASCADE;

-- Optional: If you enabled materialized view, drop it:
-- DROP MATERIALIZED VIEW IF EXISTS public.property_views_daily_mv CASCADE;
*/
