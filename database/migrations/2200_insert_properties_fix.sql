-- 1) Create BEFORE trigger function that computes completeness using NEW to avoid recursive updates
CREATE OR REPLACE FUNCTION public.tg_properties_compute_completeness_before()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  v_score int := 0;
  v_desc_len int := coalesce(length(NEW.description),0);
  v_photos int := 0;
  v_amen_cnt int := coalesce(cardinality(NEW.amenities),0);
  v_rpp_doc boolean := false;
  v_rpp_verified boolean := (NEW.rpp_verified = 'verified');
begin
  -- Count photos related to the property
  SELECT count(*) INTO v_photos FROM public.media_assets m WHERE m.property_id = NEW.id AND m.media_type = 'image';

  -- Check documents
  SELECT exists(SELECT 1 FROM public.documents d WHERE d.related_type='property' AND d.related_id = NEW.id AND d.doc_type='rpp_certificate') INTO v_rpp_doc;

  IF (NEW.title IS NOT NULL AND length(NEW.title) >= 6) THEN v_score := v_score + 10; END IF;
  IF v_desc_len >= 300 THEN v_score := v_score + 10;
  ELSIF v_desc_len >= 120 THEN v_score := v_score + 6;
  ELSIF v_desc_len > 0 THEN v_score := v_score + 3;
  END IF;
  IF (NEW.price IS NOT NULL AND NEW.price > 0) THEN v_score := v_score + 10; END IF;
  IF (NEW.location IS NOT NULL) THEN v_score := v_score + 10; END IF;
  IF (NEW.bedrooms IS NOT NULL) THEN v_score := v_score + 5; END IF;
  IF (NEW.bathrooms IS NOT NULL) THEN v_score := v_score + 5; END IF;
  IF (coalesce(NEW.construction_m2,0) > 0 OR coalesce(NEW.land_m2,0) > 0) THEN v_score := v_score + 5; END IF;

  IF v_photos >= 8 THEN v_score := v_score + 20;
  ELSIF v_photos >= 4 THEN v_score := v_score + 12;
  ELSIF v_photos >= 1 THEN v_score := v_score + 6;
  END IF;

  IF v_amen_cnt >= 6 THEN v_score := v_score + 5;
  ELSIF v_amen_cnt >= 1 THEN v_score := v_score + 2;
  END IF;

  IF v_rpp_doc THEN v_score := v_score + 8; END IF;
  IF v_rpp_verified THEN v_score := v_score + 10; END IF;

  IF v_score > 100 THEN v_score := 100; END IF;

  NEW.completeness_score := v_score;
  NEW.updated_at := now();
  RETURN NEW;
END$function$;

-- 2) Drop the old AFTER trigger (z_properties_recompute_completeness) if it exists, then create the new BEFORE trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'z_properties_recompute_completeness' AND tgrelid = 'public.properties'::regclass) THEN
    EXECUTE 'DROP TRIGGER z_properties_recompute_completeness ON public.properties';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop old trigger: %', SQLERRM;
END$$;

-- Create the new BEFORE trigger
DROP TRIGGER IF EXISTS z_properties_compute_completeness_before ON public.properties;
CREATE TRIGGER z_properties_compute_completeness_before
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.tg_properties_compute_completeness_before();

-- 3) Backfill existing rows: temporarily disable the new trigger to avoid double firing (we'll use existing property_completeness to compute), then update all rows, then re-enable trigger
-- Since we replaced the trigger, to safely backfill we'll drop it temporarily, run backfill, then recreate.

-- Drop the BEFORE trigger temporarily
DROP TRIGGER IF EXISTS z_properties_compute_completeness_before ON public.properties;

-- Backfill completeness_score for existing rows
UPDATE public.properties
SET completeness_score = public.property_completeness(id),
    updated_at = now();

-- Recreate the BEFORE trigger
CREATE TRIGGER z_properties_compute_completeness_before
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.tg_properties_compute_completeness_before();