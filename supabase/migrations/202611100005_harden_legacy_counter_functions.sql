-- Harden remaining legacy counter functions and trigger search paths.
BEGIN;

ALTER FUNCTION public.increment_profile_views() SET search_path = '';
ALTER FUNCTION public.increment_link_clicks() SET search_path = '';

-- These legacy RPC overloads are no longer used by the application.
-- Aggregate counters are changed only by the analytics event triggers.
REVOKE ALL ON FUNCTION public.increment_profile_views(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_link_clicks(integer) FROM PUBLIC, anon, authenticated;

COMMIT;
