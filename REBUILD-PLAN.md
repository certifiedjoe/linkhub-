# Linkhub Rebuild Architecture Plan

**Status:** Discovery / Phase 0  
**Target:** A free, all-in-one link management and landing-page platform for individuals, creators, businesses, teams, and developers.

## Product decisions
- Audience: everyone, from casual users to developers and organisations.
- Business model: free. Do not design paid-only gates into core features. Use transparent fair-use safeguards, abuse prevention, and capacity controls.
- Landing pages: both ready-made templates and a visual drag-and-drop editor.
- Delivery: implement the complete product vision in independently testable phases.

## Product experience
Primary navigation: Overview, Short links, Smart links, QR codes, Analytics, Landing pages, Developer tools, Workspace and settings.

Global create actions: Short link, Smart link, QR code, Landing page. A user must be able to shorten their first link without understanding attribution or advanced routing.

A campaign is an optional organising container connecting links, QR codes, landing pages, UTM parameters, and analytics. Every asset can also be created independently.

## Target architecture
Use a modular monolith initially, not premature microservices.

- Web application: Next.js App Router, React, TypeScript. Use real route segments for dashboard, auth, public profiles, published pages, and short-link destinations. Use server rendering where public metadata and SEO require it. Do not use static export for dynamic user pages or redirect routes.
- API: one canonical backend API with versioned endpoints and feature modules. Keep the existing Express API only if audit/testing confirms it is the most reliable migration path; otherwise consolidate deliberately into Next.js route handlers. Never keep two competing implementations of the same business logic.
- Identity: Supabase Auth. The server validates access tokens and derives ownership from verified claims; never trust user IDs supplied in request bodies or arbitrary visitor headers.
- Primary database: Supabase Postgres as the single source of truth. Use migrations checked into the repository, foreign keys, unique constraints, indexes, and Row Level Security where appropriate.
- File storage: Supabase Storage initially for avatars, page media, and uploaded assets. Store object paths/URLs and metadata in Postgres, not large base64 image strings.
- Analytics: record append-only click/view/scan events. Keep redirect handling fast; enqueue or batch analytics work where practical. Aggregate data for dashboards rather than calculating every report from raw events on every request.
- Caching and performance: cache public page/link lookups with explicit invalidation; add Redis/managed cache only when measured traffic justifies it.
- Observability: structured logs, request IDs, health checks, error reporting, and metrics. Never log secrets or raw sensitive visitor data.

## Core domain model
Use UUID primary keys and UTC timestamps. Suggested entities:
- users: Supabase identity mapping and account metadata.
- workspaces: personal or shared ownership boundary.
- workspace_members: roles and invitations (later phase).
- campaigns: name, slug, status, UTM defaults, workspace ownership.
- short_links: destination, unique short code, optional custom domain, title, status, expiry, password hash, redirect rules, creator.
- smart_link_rules: platform/device-specific destinations and safe web fallback rules associated with a short link.
- domains: verified custom domains and ownership/verification state.
- qr_codes: link or page target, style configuration, generated asset reference.
- pages: slug, title, description, theme, published state, SEO/social metadata, campaign association.
- page_sections / page_blocks: ordered, validated page-builder content and settings.
- analytics_events: event type, asset references, timestamp, coarse geography/device/referrer/UTM dimensions, privacy-safe deduplication key.
- api_keys and webhook_endpoints: hashed credentials, scopes, delivery status and rotation metadata (later phase).

All user-owned records must be scoped through workspace ownership and enforced server-side. Public assets expose only published/active data.

## Feature modules
### Links
Shorten long URLs, reserve system routes, generate collision-resistant codes, support custom aliases, edit destinations, pause/expire links, optional passwords, tags/folders, bulk import/export, and safe HTTP/HTTPS validation. Redirects must reject unsafe schemes and avoid open-redirect surprises.

### Analytics
Track link clicks, unique visitors using privacy-conscious deduplication, page views, QR scans, referrers, UTM values, device/browser families, and coarse country/region. Provide date filters, comparisons, campaign reports, CSV export, bot filtering, retention controls, and clear definitions for every metric. Do not promise exact person-level attribution.

### QR codes
Generate static and dynamic QR codes. Dynamic QR codes point to a Linkhub-managed destination so the target can change without reprinting. Offer colour/logo/shape options, contrast checks, SVG/PNG downloads, and scan analytics.

### Landing pages
Provide curated templates and a visual editor using a constrained block schema: profile/header, text, image, video embed, button/link, social icons, divider, and call-to-action. Include draft/preview/publish states, undo/redo, autosave, mobile preview, accessible controls, SEO/social metadata, and responsive published pages. Validate and sanitize all saved block data.

### Smart links
Support device/platform routing, app deep links, store links and web fallback destinations. Introduce advanced routing only after the core short-link redirect and event pipeline is trustworthy.

### Developer and administration
Versioned API, scoped API keys, webhooks, docs, abuse reports, domain verification, audit logs, platform health and admin moderation. Team workspaces and integrations are later phases.

## Repository findings from Phase 0
- Repository: certifiedjoe/linkhub-, default branch main.
- Frontend lives under linkhub/ and uses Next.js, React, TypeScript, Tailwind, and Supabase JS.
- A separate Express API lives under kiungo-api/ and uses Supabase.
- The frontend README describes an older SQLite backend at linkhub/server/api.js, but that path is absent from the current repository tree.
- linkhub/package.json does not define the api script described by the README.
- linkhub/next.config.mjs currently enables output: export, which is incompatible with the desired dynamic public pages/redirects and must be revisited as part of deployment planning.
- The frontend contains a single large hash-routed linkhub/app/page.tsx; it is not yet divided into feature route segments.
- The repository contains duplicate-looking Next.js API route files under linkhub/app/api/; their route naming and behaviour need validation before relying on them.
- kiungo-api/ currently contains node_modules in the repository tree; dependencies should be installed from lockfiles, not committed.
- Existing profile/link APIs and Supabase auth middleware are useful migration inputs, but their schema and production deployment must be verified before changing or migrating data.

## Phased delivery and exit criteria
### Phase 0 — Audit and safety
Confirm deployed frontend/API origins, hosting provider, Supabase project/schema, RLS policies, storage buckets, and production environment variables without exposing secrets. Inventory every screen, API endpoint, database table, and user workflow. Establish baseline build, auth/API tests, performance profile, and backup/rollback plan. Create a rebuild branch; never work directly on main.
Exit: documented current-state architecture, verified schema/deployment, test baseline, and approved migration plan.

### Phase 1 — Foundation and core links
Consolidate the backend source of truth. Add proper App Router routes and shared dashboard shell. Implement workspace-aware authorization, link CRUD, aliases, safe redirects, status/expiry, and migration of existing profile links. Add tests for ownership, redirect safety, collisions, inactive/expired links.
Exit: a user can sign in, create/manage a short link, and reliably redirect; existing public profiles still work.

### Phase 2 — Analytics
Introduce event schema, deduplication, bot filtering, aggregation, date filters, and export. Ensure analytics failures do not break redirects.
Exit: dashboard totals reconcile with raw event samples and tracking does not materially slow redirects.

### Phase 3 — QR codes
Dynamic QR generation, styling, downloads, and scan events.
Exit: QR destinations can be updated without changing the printed QR image.

### Phase 4 — Landing pages
Templates, validated block model, visual editor, preview, autosave, publishing, public URLs, and SEO/social metadata.
Exit: a non-technical user can publish a responsive page without code.

### Phase 5 — Smart links and growth tools
Device/platform routing, app deep links, app-store fallbacks, safe web fallbacks, bulk operations and A/B routing tests.
Exit: one smart link reliably opens the intended app or a suitable fallback and records the redirect event.

### Phase 6 — Developer ecosystem and scale
Public API, API keys, webhooks, integrations, team workspaces, admin operations, observability and load testing.
Exit: documented APIs, audited permissions, tested rate limits, and production readiness.

## Non-negotiable engineering standards
- Preserve existing user data and working profile functionality; migrations must be additive, reversible, backed up, and tested on a copy first.
- No service-role keys in browser bundles, logs, or public environment variables.
- Enforce authorization on the server and with database policies; never rely on hidden UI controls.
- Validate every input at API boundaries; sanitize page-builder content and prevent XSS.
- Rate-limit account, create, redirect-abuse, and analytics endpoints appropriately.
- Do not collect more visitor data than needed; document retention and privacy choices.
- Use accessible forms, keyboard navigation, reduced-motion support, clear empty/error/loading states, and responsive layouts.
- Add tests and run build/type checks for every implementation phase.
- Do not add infrastructure (microservices, queues, Redis) until its operational value is justified; design clean interfaces so it can be introduced later.

## Immediate next audit tasks
1. Inspect the full Express route/service implementation and the Next.js frontend components.
2. Verify the actual Supabase schema, indexes, triggers, RLS policies, and storage configuration through the project owner or safe schema exports.
3. Confirm the deployed hosting/runtime for both frontend and API.
4. Reconcile README, package scripts, route handlers, and deployment config.
5. Establish test/build baselines before modifying application behaviour.
