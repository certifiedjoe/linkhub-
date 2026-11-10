-- Optional native store destinations used when a custom app URL scheme cannot open.
-- Apply this migration to the Kiungo Supabase project before deploying the API.
alter table public.short_links
  add column if not exists ios_store_url text,
  add column if not exists android_store_url text;

alter table public.short_links
  drop constraint if exists short_links_ios_store_url_http_check,
  add constraint short_links_ios_store_url_http_check
    check (ios_store_url is null or ios_store_url ~* '^https?://'),
  drop constraint if exists short_links_android_store_url_http_check,
  add constraint short_links_android_store_url_http_check
    check (android_store_url is null or android_store_url ~* '^https?://');
