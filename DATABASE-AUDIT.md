# Linkhub Database and Backend Audit

Updated: 2026-11-10  
Project: `tjazbkkisjxcdyjmhzat` (PostgreSQL 17, EU West)  
Application branch: `rebuild/architecture-foundation`

## Confirmed core schema

- `profiles.id` is BIGINT identity; `profiles.owner` is the Supabase Auth UUID.
- `links.id` and `links.profile_id` are BIGINT; links belong to profiles.
- `page_views.id` and `link_clicks.id` are UUID event IDs.
- Analytics `profile_id` remains the Auth UUID used by owner-scoped RLS.
- The legacy `link_clicks.link_id` UUID column is retained for compatibility and is nullable. New events use `link_record_id` BIGINT.
- New page-view events use `profile_record_id` BIGINT to identify the specific profile when an owner has multiple pages.
- RLS is enabled on the relevant tables.

## Applied migrations

All four migrations below were applied to the connected Linkhub Supabase project and appear in its migration history:

1. `202611100002_atomic_counters_and_safe_link_updates.sql`
   - Atomic profile and link counter functions.
   - Transactional, ID-preserving link reconciliation.
   - Execution limited to the backend `service_role`.

2. `202611100003_repair_analytics_event_tracking.sql`
   - Adds explicit BIGINT references for profile and link analytics events.
   - Adds foreign keys and event lookup indexes.
   - Repairs the page-view and link-click trigger functions.
   - Removes public analytics INSERT policies; writes are handled by the backend.
   - Limits analytics SELECT access to authenticated owners.

3. `202611100004_fix_auth_signup_profile_trigger.sql`
   - Fixes new-user profile creation.
   - Uses the BIGINT identity for `profiles.id` and stores `auth.users.id` in `profiles.owner`.
   - Generates a unique username and a bounded display name.
   - Removes direct RPC execution from trigger-only functions.

4. `202611100005_harden_legacy_counter_functions.sql`
   - Pins trigger function search paths.
   - Revokes access to unused legacy counter RPC overloads.

## Database verification

- The migration history confirms all four migrations are applied.
- Function permissions were inspected: trigger-only functions and retired legacy counter RPCs are not executable by `anon` or `authenticated`.
- A rollback-only test inserted a temporary Auth user and verified that the signup trigger created a BIGINT profile with the correct owner UUID.
- The same rollback-only test inserted a page-view event and a link-click event and verified that the corresponding aggregate counters reached 1.
- The test transaction was rolled back; no test rows were retained.
- The analytics event tables were empty before the event-reference migration.
- No separate database backup was created or verified through the available Supabase connection.

## Application changes

- Express tracking endpoints now insert analytics events; database triggers update aggregate counters in the same transaction.
- Existing link IDs and click counts are preserved during link edits.
- Client-supplied click counts are ignored.
- BIGINT link IDs are validated and preserved as decimal strings.
- Dashboard/showcase hydration batches link queries.
- API authentication verifies Supabase JWTs; profile mutations require the authenticated owner.
- Tracking and mutation endpoints are rate-limited.
- Production API origin is explicitly configured rather than silently falling back to localhost.
- Browser-side Supabase diagnostics and tracked dependency artifacts were removed.
- Dependency lockfiles were updated with non-forced compatible fixes; CI audits passed.

## Deployment architecture

- Frontend: Next.js static export in `linkhub/out`.
- API: Express on Node.js 22, intended to run as a systemd service bound behind Nginx.
- Database and Auth: Supabase.
- Contabo instructions: `DEPLOY-CONTABO.md`.
- Nginx and systemd examples: `deploy/contabo/`.

## Remaining production gates

- Contabo has not been accessed or deployed. The VPS OS, public IP, DNS records, actual domain, and secure server access must be confirmed.
- The runbook currently uses `kiungo.link` as the example domain because it appears in the frontend UI; confirm that this is the registered domain before configuring DNS and TLS.
- A separate database backup/restore point must be verified before production traffic.
- Supabase security advisors still report some unrelated configuration warnings, including leaked-password protection being disabled and the `citext` extension in `public`. The trigger-only SECURITY DEFINER exposure warnings were addressed.
- Profile metadata update and link reconciliation are separate database operations; link reconciliation itself is transactional.
- Production smoke tests (signup, login, profile create/edit, public profile view, click tracking, and owner isolation) must be run after VPS deployment.

## CI

Latest code CI run: https://github.com/certifiedjoe/linkhub-/actions/runs/42806991360

Both jobs passed:
- API clean install, dependency audit, and test suite.
- Frontend clean install, dependency audit, and production build.
