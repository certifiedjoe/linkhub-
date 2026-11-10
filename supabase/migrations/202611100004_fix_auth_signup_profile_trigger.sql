-- Repair Supabase Auth signup profile creation.
-- profiles.id is BIGINT identity; auth.users.id belongs in profiles.owner.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  base_username text;
  final_username text;
  display_name_value text;
  counter integer := 0;
BEGIN
  base_username := lower(
    regexp_replace(
      split_part(coalesce(NEW.email, ''), '@', 1),
      '[^a-z0-9]',
      '',
      'g'
    )
  );

  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  ELSIF length(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;

  base_username := left(base_username, 20);

  display_name_value := left(
    coalesce(
      nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(NEW.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
      'New user'
    ),
    60
  );

  LOOP
    IF counter = 0 THEN
      final_username := base_username;
    ELSE
      final_username :=
        left(base_username, greatest(1, 20 - length(counter::text)))
        || counter::text;
    END IF;

    BEGIN
      INSERT INTO public.profiles (username, display_name, owner)
      VALUES (final_username, display_name_value, NEW.id);
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        counter := counter + 1;
        IF counter > 999999 THEN
          RAISE EXCEPTION 'Could not allocate a unique username for new account';
        END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- These routines are invoked by database triggers/hooks, not exposed as RPCs.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Pin helper functions to the system catalog for built-ins; all application
-- table references in SECURITY DEFINER code are schema-qualified.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
ALTER FUNCTION public.check_disposable_email(jsonb) SET search_path = pg_catalog;
ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog;

COMMIT;
