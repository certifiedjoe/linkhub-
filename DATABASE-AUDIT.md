# Database and Backend Audit

Branch: `rebuild/architecture-foundation`
Status: inspection only; no production database changes.

## Confirmed database structure

- `profiles.id` is bigint; `profiles.owner` references `auth.users.id`.
- `links.id` and `links.profile_id` are bigint; `links.profile_id` references `profiles.id`.
- `link_clicks.id` is UUID; `link_clicks.link_id` and `link_clicks.profile_id` are UUID. No foreign keys were reported for either analytics table.
- `page_views.id` and `page_views.profile_id` are UUID. No foreign key was reported for `page_views.profile_id`.
- RLS is enabled on all four tables.
- Public SELECT policies exist for profiles and links. Profile write policies check `owner = auth.uid()`. Link writes check ownership through the related profile.
- Analytics INSERT policies allow all roles in `public`; analytics SELECT policies compare `auth.uid()` directly with the analytics `profile_id`.

## Confirmed application/database incompatibility

The Next.js page-view handler at `linkhub/app/api/links/[id]/click/clicks.ts` (and the similar file under `linkhub/app/api/profiles/[username]/view/views`) selects `profiles.id` and inserts it as `page_views.profile_id`. The former is bigint and the latter is UUID. This insert is incompatible with the declared schema and is expected to fail unless the deployed schema differs from the supplied export.

The Next.js route files are not named `route.ts`, which is the required App Router route-handler filename. The handler under `[id]` also types its route parameter as `username`, despite the folder being `[id]`.

## Additional backend risks

- The Express backend uses a Supabase service-role client, which bypasses RLS. Authorization therefore depends on the API's own checks and validation.
- `incrementView` and `incrementClick` read a counter and write the incremented value in separate operations. Concurrent requests can lose increments. Prefer a database-side atomic increment/RPC or event-based aggregation.
- `writeLinks` deletes every link for a profile and recreates the submitted list on update. This changes link IDs and can discard per-link click counters and break references. Replace with an ID-aware transactional upsert/reconciliation strategy.
- The Express API currently increments aggregate counters but does not insert rows into `page_views` or `link_clicks` in the inspected service code.
- Rate limiting exists in Express, but the public analytics insert policies can be called directly through Supabase unless access is narrowed or writes are moved behind a controlled ingestion path.
- `next.config.mjs` uses `output: 'export'`, which conflicts with the intended dynamic Next.js route handlers and server-side redirect/runtime features.

## Policy interpretation requiring data confirmation

The policy `auth.uid() = profile_id` is not automatically invalid merely because `profiles.id` is bigint: the analytics UUID column could have been intended to store the owner's auth UUID. However, the inspected Next.js page-view handler writes the profile bigint into that UUID column. Confirm existing row values and all write paths before changing the policy or column types.

## Safe next steps

1. Back up the database and export current schema, policies, triggers, functions, indexes, and row counts.
2. Inspect existing analytics row values and all production write paths.
3. Decide whether analytics events should reference `profiles.id` (bigint) or `auth.users.id` (UUID); use explicit, consistently named columns and real foreign keys where appropriate.
4. Implement additive, reversible migrations only after the data mapping is confirmed.
5. Repair the Next.js route-handler layout or consolidate analytics ingestion into the canonical Express API.
6. Make counter updates atomic and link updates preserve stable IDs and historical analytics.
7. Restrict direct analytics writes and add server-side validation, abuse controls, and privacy-aware retention.

No schema, data, or production policies were modified during this audit.
