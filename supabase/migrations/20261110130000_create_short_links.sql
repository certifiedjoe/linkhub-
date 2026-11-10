-- Short links are separate from profile button links.
create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  code text not null,
  title text not null default '',
  destination_url text not null,
  ios_url text,
  android_url text,
  fallback_url text,
  status text not null default 'active' check (status in ('active', 'paused')),
  expires_at timestamptz,
  clicks bigint not null default 0 check (clicks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint short_links_code_format check (code ~ '^[a-z0-9_-]{3,32}$'),
  constraint short_links_destination_protocol check (destination_url ~* '^https?://')
);

create unique index if not exists short_links_code_unique on public.short_links (code);
create index if not exists short_links_owner_created_idx on public.short_links (owner, created_at desc);

create table if not exists public.short_link_clicks (
  id uuid primary key default gen_random_uuid(),
  short_link_id uuid not null references public.short_links(id) on delete cascade,
  referrer text,
  device text,
  created_at timestamptz not null default now()
);

create index if not exists short_link_clicks_link_created_idx
  on public.short_link_clicks (short_link_id, created_at desc);

alter table public.short_links enable row level security;
alter table public.short_link_clicks enable row level security;

-- The Express API uses the server-only service role. No browser role gets direct access.
revoke all on table public.short_links from anon, authenticated;
revoke all on table public.short_link_clicks from anon, authenticated;
grant select, insert, update, delete on table public.short_links to service_role;
grant select, insert, update, delete on table public.short_link_clicks to service_role;

create or replace function public.increment_short_link_clicks()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.short_links
  set clicks = clicks + 1,
      updated_at = now()
  where id = new.short_link_id;
  return new;
end;
$$;

revoke all on function public.increment_short_link_clicks() from public, anon, authenticated;

drop trigger if exists short_link_clicks_increment on public.short_link_clicks;
create trigger short_link_clicks_increment
after insert on public.short_link_clicks
for each row execute function public.increment_short_link_clicks();
