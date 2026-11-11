-- Optional device-specific web destinations for website-only smart routing.
alter table public.short_links
  add column if not exists mobile_url text,
  add column if not exists desktop_url text;

alter table public.short_links
  drop constraint if exists short_links_mobile_url_http_check,
  add constraint short_links_mobile_url_http_check
    check (mobile_url is null or mobile_url ~* '^https?://'),
  drop constraint if exists short_links_desktop_url_http_check,
  add constraint short_links_desktop_url_http_check
    check (desktop_url is null or desktop_url ~* '^https?://');
