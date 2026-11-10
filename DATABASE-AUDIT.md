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
- The supplied analytics tables were empty at the time of the count query: zero `page_views` rows and zero `link_clicks` rows.

## Confirmed triggers and indexes

Two AFTER INSERT triggers are installed:

- `link_clicks.on_link_click_increment` calls `public.increment_link_clicks()`.
- `page_views.on_page_view_increment` calls `public.increment_profile_views()`.

The trigger functions are SECURITY DEFINER and set `search_path` to `public`. Their current bodies attempt to update `links.total_clicks` using `links.id = NEW.link_id`, and `profiles.total_views` using `profiles.id = NEW.profile_id`.

This conflicts with the supplied schema in two independent ways:

1. The supplied `links` and `profiles` column exports contain `clicks` and `views`, not `total_clicks` and `total_views`.
2. `links.id` and `profiles.id` are bigint, while `NEW.link_id` and `NEW.profile_id` are UUID.

Unless the live deployed schema differs from the supplied export, these trigger functions cannot correctly update the intended rows and may cause the analytics INSERT transaction to fail when invoked.

Two additional overloaded functions exist:
- `increment_link_clicks(p_link_id integer)` increments `links.clicks`.
- `increment_profile_views(p_username text)` increments `profiles.views`.

These parameter-based functions target the supplied counter column names, whereas the trigger overloads target the alternate `total_clicks` / `total_views` names. The overloads create ambiguous counter ownership and must be rationalized after checking all RPC callers.

Existing indexes include:
- `profiles(owner)`, `profiles(views DESC)`, and the unique username index.
- `links(profile_id)`.
- `link_clicks(created_at)`, `link_clicks(link_id)`, `link_clicks(profile_id)`, and `link_clicks(profile_id, created_at)`.
- `page_views(created_at)`, `page_views(profile_id)`, and `page_views(profile_id, created_at)`.

Preserve useful existing indexes; do not add duplicates without query-plan evidence.

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

The policy `auth.uid() = profile_id` is not automatically invalid merely because `profiles.id` is bigint: the analytics UUID column could have been intended to store the owner's auth UUID. However, the inspected Next.js page-view handler writes the profile bigint into that UUID column. Confirm all write paths before changing the policy or column types.

## Safe next steps

1. Back up the database and export current schema, policies, triggers, functions, indexes, and row counts.
2. Inspect all production write paths and RPC callers, including both overloaded counter functions.
3. Decide whether analytics events should reference `profiles.id` (bigint) or `auth.users.id` (UUID); use explicit, consistently named columns and real foreign keys where appropriate.
4. Confirm the deployed table columns match the supplied exports before drafting a migration. The trigger functions suggest possible schema drift.
5. Implement additive, reversible migrations only after the data mapping is confirmed. Do not execute a UUID-to-bigint conversion solely on the basis of the earlier zero-row count.
6. Repair the Next.js route-handler layout or consolidate analytics ingestion into the canonical Express API.
7. Make counter updates atomic and link updates preserve stable IDs and historical analytics.
8. Restrict direct analytics writes and add server-side validation, abuse controls, and privacy-aware retention.

No schema, data, or production policies were modified during this audit.

## Implementation changes committed on the rebuild branch

The following application changes are now present on `rebuild/architecture-foundation`:

- The Express profile service now calls database-side atomic increment functions for profile views and link clicks. This removes the previous read-then-write race that could lose concurrent increments.
- Link edits now call `linkhub_reconcile_links`. Existing link IDs are updated in place, click counts are not accepted from the browser, newly added links receive database-generated IDs, and omitted links are removed. The SQL function performs the reconciliation transactionally and rejects IDs that do not belong to the profile.
- Link ID validation preserves decimal IDs as strings to avoid JavaScript number precision loss and rejects malformed or duplicate IDs.
- Dashboard and showcase hydration now fetches links for all returned profiles in one query instead of issuing one links query per profile.
- Browser Supabase startup diagnostics were removed.
- A Node built-in test suite was added for link ID preservation, duplicate/malformed ID rejection, client click-count tampering, and URL validation.

A new migration, `supabase/migrations/202611100002_atomic_counters_and_safe_link_updates.sql`, defines the required RPC functions and grants execution only to `service_role`. It has been committed but has NOT been executed against Supabase.

## Remaining blockers and unverified work

- These changes depend on applying migration `202611100002` before deploying the updated Express API. Until then, its RPC calls will fail because the functions will not exist.
- Migration `202611100001_repair_analytics_ids_and_counters.sql` remains a separate, unapproved draft. Do not run it. Analytics event columns and their intended UUID-versus-BIGINT meaning still need a data-model decision.
- The current Express tracking endpoints update aggregate counters only. They do not yet create `page_views` or `link_clicks` event rows. Event-level analytics, attribution, and reporting therefore remain incomplete.
- The profile record update and link reconciliation are separate API/database transactions. Link reconciliation itself is atomic, but the entire profile-plus-links edit is not one transaction.
- The backend validation test suite has now passed in GitHub Actions on Node.js 22 (`npm ci` and `npm test`, run 1: success). This is a focused backend unit-test pass, not a frontend build, full integration test, or live Supabase verification.
- Full Next.js routing/deployment architecture, tracked dependency cleanup, security/RLS hardening, and end-to-end performance profiling remain to be completed.
- No production database changes, deployment, or merge to `main` have been made.
