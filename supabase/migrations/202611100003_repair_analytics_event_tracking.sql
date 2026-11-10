-- Repair Linkhub analytics event IDs and aggregate counter triggers.
-- Analytics profile_id stays the Supabase Auth UUID for ownership/RLS.
-- New *_record_id columns point to the BIGINT application records.
BEGIN;

ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS profile_record_id bigint;

ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS link_record_id bigint;

-- The old UUID link_id has no matching UUID column in public.links.
-- Keep it for legacy compatibility, but allow new events to use link_record_id.
ALTER TABLE public.link_clicks
  ALTER COLUMN link_id DROP NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'page_views_profile_record_id_fkey'
      AND conrelid = 'public.page_views'::regclass
  ) THEN
    ALTER TABLE public.page_views
      ADD CONSTRAINT page_views_profile_record_id_fkey
      FOREIGN KEY (profile_record_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'page_views_profile_id_auth_users_fkey'
      AND conrelid = 'public.page_views'::regclass
  ) THEN
    ALTER TABLE public.page_views
      ADD CONSTRAINT page_views_profile_id_auth_users_fkey
      FOREIGN KEY (profile_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'link_clicks_link_record_id_fkey'
      AND conrelid = 'public.link_clicks'::regclass
  ) THEN
    ALTER TABLE public.link_clicks
      ADD CONSTRAINT link_clicks_link_record_id_fkey
      FOREIGN KEY (link_record_id)
      REFERENCES public.links(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'link_clicks_profile_id_auth_users_fkey'
      AND conrelid = 'public.link_clicks'::regclass
  ) THEN
    ALTER TABLE public.link_clicks
      ADD CONSTRAINT link_clicks_profile_id_auth_users_fkey
      FOREIGN KEY (profile_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END;
$constraints$;

CREATE INDEX IF NOT EXISTS page_views_profile_record_created_idx
  ON public.page_views (profile_record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS link_clicks_link_record_created_idx
  ON public.link_clicks (link_record_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.increment_profile_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.profile_record_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET views = COALESCE(views, 0) + 1
  WHERE id = NEW.profile_record_id
    AND owner = NEW.profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analytics profile does not match its owner'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_link_clicks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.link_record_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.links AS l
  SET clicks = COALESCE(l.clicks, 0) + 1
  FROM public.profiles AS p
  WHERE l.id = NEW.link_record_id
    AND p.id = l.profile_id
    AND p.owner = NEW.profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analytics link does not belong to its owner'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$function$;

-- Analytics writes must go through the rate-limited Express API (service_role).
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.link_clicks;

DROP POLICY IF EXISTS "Users can view their own page views" ON public.page_views;
CREATE POLICY "Users can view their own page views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can view their own link clicks" ON public.link_clicks;
CREATE POLICY "Users can view their own link clicks"
  ON public.link_clicks
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

REVOKE ALL ON FUNCTION public.increment_profile_views() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_link_clicks() FROM PUBLIC, anon, authenticated;

COMMIT;
