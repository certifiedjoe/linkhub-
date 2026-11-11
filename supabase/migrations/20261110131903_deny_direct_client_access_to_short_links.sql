-- These tables are accessed only by the server-side service role.
-- Explicit deny policies keep browser roles blocked even if grants change later.
create policy short_links_no_direct_client_access
on public.short_links
for all
to anon, authenticated
using (false)
with check (false);

create policy short_link_clicks_no_direct_client_access
on public.short_link_clicks
for all
to anon, authenticated
using (false)
with check (false);
