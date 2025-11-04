-- ============================================================================
-- Migration: Track Property Event RPC Function
-- Description: Creates RPC function to track property events with automatic session management
-- Author: Generated for Novalia Telemetry System
-- Date: 2025-10-29
-- 
-- IMPORTANT BEHAVIOR:
-- * Automatically creates or reuses sessions based on fingerprint
-- * Handles anonymous and authenticated users
-- * Creates fingerprint if doesn't exist
-- * Updates session last_seen_at
-- * Inserts event with proper session_id
-- * Returns the created event
-- ============================================================================

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE FUNCTION: track_property_event
-- RPC function to track property events with automatic session management
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.track_property_event(text, uuid, uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.track_property_event(
    p_fingerprint_hash text,
    p_property_id uuid,
    p_user_id uuid DEFAULT NULL,
    p_event_type text DEFAULT 'page_view',
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypass de RLS para insertar eventos
SET search_path = public
AS $$
DECLARE
    v_fingerprint_id uuid;
    v_session_id uuid;
    v_event_id uuid;
    v_org_id uuid;
    v_user_agent text;
    v_occurred_at timestamptz;
BEGIN
    -- Validar que el event_type sea válido
    IF p_event_type NOT IN ('page_view', 'property_click', 'share', 'open_outbound', 'chat_open', 'first_contact', 'chat_message') THEN
        RAISE EXCEPTION 'Invalid event_type: %. Must be one of: page_view, property_click, share, open_outbound, chat_open, first_contact, chat_message', p_event_type;
    END IF;

    -- Extraer user_agent del metadata si está disponible
    v_user_agent := p_metadata->>'userAgent';

    -- Generar timestamp
    v_occurred_at := now();

    -- 1. Obtener o crear fingerprint
    INSERT INTO public.fingerprints (fp_hash, user_agent, created_at)
    VALUES (p_fingerprint_hash, v_user_agent, v_occurred_at)
    ON CONFLICT (fp_hash) DO UPDATE
    SET user_agent = COALESCE(EXCLUDED.user_agent, fingerprints.user_agent)
    RETURNING id INTO v_fingerprint_id;

    -- 2. Obtener o crear sesión activa (considera sesión activa si last_seen < 30 minutos)
    SELECT id INTO v_session_id
    FROM public.sessions
    WHERE fingerprint_id = v_fingerprint_id
      AND last_seen_at > (v_occurred_at - interval '30 minutes')
      AND (
        (p_user_id IS NULL AND user_id IS NULL) OR
        (p_user_id IS NOT NULL AND user_id = p_user_id)
      )
    ORDER BY last_seen_at DESC
    LIMIT 1;

    -- Si no hay sesión activa, crear una nueva
    IF v_session_id IS NULL THEN
        -- Extraer UTM params del metadata si están disponibles
        INSERT INTO public.sessions (
            fingerprint_id,
            user_id,
            utm,
            started_at,
            last_seen_at
        )
        VALUES (
            v_fingerprint_id,
            p_user_id,
            CASE 
                WHEN p_metadata ? 'utm' THEN p_metadata->'utm'
                ELSE NULL
            END,
            v_occurred_at,
            v_occurred_at
        )
        RETURNING id INTO v_session_id;
    ELSE
        -- Actualizar last_seen_at de la sesión existente
        UPDATE public.sessions
        SET last_seen_at = v_occurred_at,
            user_id = COALESCE(p_user_id, user_id) -- Actualizar user_id si el usuario se autentica
        WHERE id = v_session_id;
    END IF;

    -- 3. Obtener org_id de la propiedad (si existe)
    IF p_property_id IS NOT NULL THEN
        SELECT org_id INTO v_org_id
        FROM public.properties
        WHERE id = p_property_id;
    END IF;

    -- 4. Insertar evento
    INSERT INTO public.events (
        session_id,
        user_id,
        org_id,
        property_id,
        event_type,
        payload,
        occurred_at
    )
    VALUES (
        v_session_id,
        p_user_id,
        v_org_id,
        p_property_id,
        p_event_type::event_type_enum,
        p_metadata,
        v_occurred_at
    )
    RETURNING id INTO v_event_id;

    -- 5. Retornar el evento creado como JSON
    RETURN jsonb_build_object(
        'id', v_event_id,
        'session_id', v_session_id,
        'fingerprint_id', v_fingerprint_id,
        'event_type', p_event_type,
        'property_id', p_property_id,
        'occurred_at', v_occurred_at
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar (telemetry no debe romper la app)
        RAISE WARNING 'Error tracking event: % - %', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.track_property_event IS 
'Tracks property events with automatic session and fingerprint management. 
Parameters:
  - p_fingerprint_hash: Browser fingerprint hash (required)
  - p_property_id: Property UUID (optional, can be NULL)
  - p_user_id: User UUID (optional, NULL for anonymous)
  - p_event_type: Event type enum (default: page_view)
  - p_metadata: JSONB with additional data (userAgent, utm, source, etc.)
Returns: JSONB with event details or error';

-- -----------------------------------------------------------------------------
-- 2. GRANT PERMISSIONS
-- Allow anonymous and authenticated users to track events
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.track_property_event TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. CREATE HELPER FUNCTION: get_or_create_browser_fingerprint
-- Client-side helper to generate consistent fingerprint
-- -----------------------------------------------------------------------------

-- Esta función genera un hash simple basado en user agent y resolución
-- En producción, considera usar una librería como FingerprintJS
CREATE OR REPLACE FUNCTION public.generate_simple_fingerprint(
    p_user_agent text DEFAULT NULL,
    p_screen_width int DEFAULT NULL,
    p_screen_height int DEFAULT NULL,
    p_timezone text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Genera un hash MD5 simple de los parámetros
    -- En producción usar algo más robusto
    RETURN md5(
        COALESCE(p_user_agent, '') || 
        COALESCE(p_screen_width::text, '') || 
        COALESCE(p_screen_height::text, '') ||
        COALESCE(p_timezone, '')
    );
END;
$$;

COMMENT ON FUNCTION public.generate_simple_fingerprint IS 
'Generates a simple browser fingerprint hash. Use FingerprintJS in production.';

GRANT EXECUTE ON FUNCTION public.generate_simple_fingerprint TO anon, authenticated;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Example 1: Track anonymous page view
SELECT public.track_property_event(
    p_fingerprint_hash := 'abc123def456',
    p_property_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    p_user_id := NULL,
    p_event_type := 'page_view',
    p_metadata := '{"source": "home", "userAgent": "Mozilla/5.0..."}'::jsonb
);

-- Example 2: Track authenticated property click
SELECT public.track_property_event(
    p_fingerprint_hash := 'abc123def456',
    p_property_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    p_user_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    p_event_type := 'property_click',
    p_metadata := '{"source": "search", "position": 3}'::jsonb
);

-- Example 3: Track first contact
SELECT public.track_property_event(
    p_fingerprint_hash := 'abc123def456',
    p_property_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    p_user_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    p_event_type := 'first_contact',
    p_metadata := '{"contactMethod": "whatsapp"}'::jsonb
);
*/

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Test the function (uncomment to test)
/*
DO $$
DECLARE
    v_result jsonb;
BEGIN
    -- Test with a sample fingerprint and property
    v_result := public.track_property_event(
        p_fingerprint_hash := 'test_fingerprint_' || gen_random_uuid()::text,
        p_property_id := (SELECT id FROM public.properties LIMIT 1),
        p_user_id := NULL,
        p_event_type := 'page_view',
        p_metadata := '{"source": "test", "test": true}'::jsonb
    );
    
    RAISE NOTICE 'Test result: %', v_result;
    
    -- Verify event was created
    IF v_result ? 'id' THEN
        RAISE NOTICE 'SUCCESS: Event created with id: %', v_result->>'id';
    ELSE
        RAISE WARNING 'FAILED: %', v_result;
    END IF;
END $$;
*/

-- =============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- =============================================================================

/*
DROP FUNCTION IF EXISTS public.track_property_event(text, uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.generate_simple_fingerprint(text, int, int, text);
*/
