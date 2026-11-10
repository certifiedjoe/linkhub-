-- Linkhub: atomic counters and ID-preserving link reconciliation.
-- Apply only after reviewing the schema and taking a database backup.
-- This migration does not alter analytics event tables or their UUID identifiers.
BEGIN;

CREATE OR REPLACE FUNCTION public.linkhub_increment_profile_views(p_profile_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_views integer;
BEGIN
  UPDATE public.profiles
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_profile_id
  RETURNING views INTO v_views;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile % does not exist', p_profile_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_views;
END;
$function$;

CREATE OR REPLACE FUNCTION public.linkhub_increment_link_clicks(p_link_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_clicks integer;
BEGIN
  UPDATE public.links
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = p_link_id
  RETURNING clicks INTO v_clicks;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link % does not exist', p_link_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_clicks;
END;
$function$;

-- Reconcile one profile's submitted links in a single transaction.
-- Existing IDs are updated in place (preserving click counts); new links get
-- database-generated IDs and omitted existing links are removed.
CREATE OR REPLACE FUNCTION public.linkhub_reconcile_links(
  p_profile_id bigint,
  p_links jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item jsonb;
  v_id_text text;
  v_link_id bigint;
  v_kept_ids bigint[] := ARRAY[]::bigint[];
BEGIN
  IF jsonb_typeof(p_links) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_links must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Profile % does not exist', p_profile_id USING ERRCODE = 'P0002';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_links)
  LOOP
    v_id_text := NULLIF(v_item->>'id', '');

    IF v_id_text IS NULL THEN
      INSERT INTO public.links (profile_id, label, url, icon, position)
      VALUES (
        p_profile_id,
        LEFT(COALESCE(v_item->>'label', ''), 60),
        v_item->>'url',
        LEFT(COALESCE(v_item->>'icon', 'link'), 24),
        COALESCE((v_item->>'position')::integer, 0)
      )
      RETURNING id INTO v_link_id;
    ELSE
      IF v_id_text !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Invalid link id: %', v_id_text USING ERRCODE = '22023';
      END IF;
      v_link_id := v_id_text::bigint;

      UPDATE public.links
      SET label = LEFT(COALESCE(v_item->>'label', ''), 60),
          url = v_item->>'url',
          icon = LEFT(COALESCE(v_item->>'icon', 'link'), 24),
          position = COALESCE((v_item->>'position')::integer, 0)
      WHERE id = v_link_id AND profile_id = p_profile_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Link % does not belong to profile %', v_link_id, p_profile_id
          USING ERRCODE = '42501';
      END IF;
    END IF;

    v_kept_ids := array_append(v_kept_ids, v_link_id);
  END LOOP;

  DELETE FROM public.links
  WHERE profile_id = p_profile_id
    AND NOT (id = ANY(v_kept_ids));
END;
$function$;

REVOKE ALL ON FUNCTION public.linkhub_increment_profile_views(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.linkhub_increment_link_clicks(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.linkhub_reconcile_links(bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.linkhub_increment_profile_views(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.linkhub_increment_link_clicks(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.linkhub_reconcile_links(bigint, jsonb) TO service_role;

COMMIT;
