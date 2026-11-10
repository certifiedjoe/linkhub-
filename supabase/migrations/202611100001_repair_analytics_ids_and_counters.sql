-- Linkhub analytics identifier and counter repair
-- Target branch: rebuild/architecture-foundation
-- REVIEW REQUIRED: apply only after a fresh backup and confirmation that the
-- live schema still matches the preconditions below. This migration is NOT
-- executed against Supabase by committing this file.
--
-- This migration intentionally fails closed if either analytics table has
-- rows. Do not remove the guards or force-cast populated UUID event IDs.
BEGIN;

DO $preflight$
DECLARE
  v_page_views bigint;
  v_link_clicks bigint;
  v_type text;
BEGIN
  SELECT count(*) INTO v_page_views FROM public.page_views;
  SELECT count(*) INTO v_link_clicks FROM public.link_clicks;

  IF v_page_views <> 0 OR v_link_clicks <> 0 THEN
    RAISE EXCEPTION
      'Refusing analytics ID migration: page_views has % rows and link_clicks has % rows. Stop and design a data-preserving mapping.',
      v_page_views, v_link_clicks;
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='id';
  IF v_type <> 'bigint' THEN
    RAISE EXCEPTION 'Expected profiles.id bigint, found %', v_type;
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='links' AND column_name='id';
  IF v_type <> 'bigint' THEN
    RAISE EXCEPTION 'Expected links.id bigint, found %', v_type;
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='links' AND column_name='clicks';
  IF v_type <> 'integer' THEN
    RAISE EXCEPTION 'Expected links.clicks integer, found %', v_type;
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='views';
  IF v_type <> 'integer' THEN
    RAISE EXCEPTION 'Expected profiles.views integer, found %', v_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='links' AND column_name='total_clicks'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='total_views'
  ) THEN
    RAISE EXCEPTION 'Unexpected total_clicks/total_views columns found; review schema drift before applying.';
  END IF;
END
$preflight$;

-- Analytics event identifiers must reference the same BIGINT primary keys
-- used by the profiles and links tables.
ALTER TABLE public.page_views
  ALTER COLUMN profile_id TYPE bigint USING profile_id::text::bigint;

ALTER TABLE public.link_clicks
  ALTER COLUMN profile_id TYPE bigint USING profile_id::text::bigint,
  ALTER COLUMN link_id TYPE bigint USING link_id::text::bigint;

-- Real relationships prevent orphaned analytics events.
ALTER TABLE public.page_views
  ADD CONSTRAINT page_views_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.link_clicks
  ADD CONSTRAINT link_clicks_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT link_clicks_link_id_fkey
  FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;

-- Trigger functions update the canonical aggregate counters. Each event
-- increments its counter once, in the same transaction as the event insert.
CREATE OR REPLACE FUNCTION public.increment_link_clicks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.links
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = NEW.link_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot record click: link % does not exist', NEW.link_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_profile_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET views = COALESCE(views, 0) + 1
  WHERE id = NEW.profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot record page view: profile % does not exist', NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

-- Post-migration verification:
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema='public'
--   AND (table_name, column_name) IN
--       (('page_views','profile_id'),('link_clicks','profile_id'),('link_clicks','link_id'));
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conname IN ('page_views_profile_id_fkey',
--                   'link_clicks_profile_id_fkey',
--                   'link_clicks_link_id_fkey');
-- Then insert one controlled test event per table and verify exactly one
-- increment; remove test events only if the resulting counters are reconciled.
