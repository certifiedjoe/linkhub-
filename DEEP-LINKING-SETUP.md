# Native deep-link setup

Kiungo now supports the web/API side of native smart links:

- Per-link iOS and Android app destinations.
- Custom URL-scheme handoff with App Store / Google Play fallback.
- HTTPS Universal Link / Android App Link handoff (a top-level HTTP redirect is used so the OS can perform domain verification).
- Root-level association endpoints at `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`.

## Required database migration

Apply `supabase/migrations/20261110150000_add_smart_link_store_fallbacks.sql` to the Kiungo Supabase project before deploying this API version. The API selects the two new columns, so deploying the API before the migration will cause short-link reads to fail. This repository change does not apply the migration to the live database.

## Configure the association files

Set these server-side environment variables on the API host:

- `IOS_APP_ID`: Apple Team ID followed by the app bundle ID, e.g. `ABCDE12345.com.example.kiungo`.
- `ANDROID_PACKAGE_NAME`: exact Android application ID, e.g. `com.example.kiungo`.
- `ANDROID_SHA256_CERT_FINGERPRINTS`: comma-separated SHA-256 fingerprints for the signing certificate(s) used by the Play release (and any other supported release channel).

The API returns HTTP 503 for an association file until its required values are configured. Once configured, verify both files over public HTTPS on the exact domain used by the links. Keep the files publicly accessible without authentication or redirects.

## Native app configuration still required

The iOS app must enable Associated Domains and add `applinks:<API_LINK_HOST>`; the Android app must declare an HTTPS App Link intent filter for the same host and verify it. The iOS app must handle the incoming `/api/r/<code>` URL, and Android must route that URI to the correct screen. The app's signing identities and identifiers must match the server association documents exactly.

In the Short links workspace, configure each link's iOS/Android destination as either:
- a custom app scheme such as `kiungo://product/123` (the server tries it and then uses the relevant store URL, or the web fallback); or
- an HTTPS Universal/App Link on a domain that is associated with the installed app. HTTPS links are redirected directly to the OS so verified app-link handling is not broken by an intermediate HTML page.

Set the optional iOS App Store and Google Play URLs for custom-scheme fallback. Always provide a useful web fallback.

## Deferred deep linking limitation

Deferred deep linking means carrying a click's intended destination through an app installation and recovering it on first launch. It cannot be completed by this web repository alone: it requires native first-launch handling and a matching attribution/install-referrer strategy (iOS has no general-purpose install-referrer equivalent). The current implementation does not claim to provide deferred deep linking. Once the native apps exist, add a short-lived, signed click token and native redemption flow, with explicit consent and retention controls.

## Production verification

1. Apply the migration, deploy the API, and configure the three environment variables.
2. Confirm both `/.well-known/` documents return valid JSON with HTTP 200 and no redirect.
3. Install signed iOS and Android builds on physical devices and test links with the apps installed and absent.
4. Test custom scheme fallbacks to each store, web fallback, expired links, paused links, and desktop behavior.
5. Do not call app-link verification complete until the OS reports the domain as verified on real devices.
