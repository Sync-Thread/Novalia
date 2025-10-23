-- Migration: Disable automatic completeness_score calculation on properties table
-- Reason: completeness_score is now computed in application layer (UpdateProperty use case)
--         with access to proper business logic and domain policies.
-- This prevents the trigger from overwriting the value sent from the application.

-- Drop the BEFORE trigger that was overwriting completeness_score
DROP TRIGGER IF EXISTS z_properties_compute_completeness_before ON public.properties;

-- Drop the AFTER trigger as well (was from older migration)
DROP TRIGGER IF EXISTS z_properties_recompute_completeness ON public.properties;

-- Keep the media_assets and documents triggers for reference, but disable them too
-- since the application layer will handle recalculation when needed
DROP TRIGGER IF EXISTS properties_recompute_on_media ON public.media_assets;
DROP TRIGGER IF EXISTS properties_recompute_on_docs ON public.documents;

-- Optional: Keep the functions for manual recalculation if needed via direct SQL
-- public.property_completeness(property_id) - can still be called manually
-- public.update_property_completeness(property_id) - can still be called manually

-- Note: The application now handles completeness calculation in:
-- 1. CreateProperty use case (on property creation)
-- 2. UpdateProperty use case (on property update - fetches current media/docs count)
-- This ensures the score reflects the actual business logic and prevents inconsistencies.
