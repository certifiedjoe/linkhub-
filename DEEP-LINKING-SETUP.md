# Website smart routing

Kiungo's short links can route visitors to different web destinations based on their device.

## How routing works

Each short link has:
- **Main destination**: required default website URL.
- **Mobile destination**: optional URL used for mobile browser user agents.
- **Desktop destination**: optional URL used for desktop browser user agents.
- **Unknown-device fallback**: optional URL used when the visitor's user agent cannot be identified.

If a device-specific URL is not configured, Kiungo uses the main destination. If the user agent is missing or not recognized as a browser, Kiungo uses the fallback URL, or the main destination when no fallback is configured.

Routing is based on the browser's user-agent string. It is a best-effort device classification, not a guarantee of screen size or device identity. Visitors can change or mask user agents.

## Database migration

Before deploying this API version, apply:

`supabase/migrations/20261110170000_add_web_device_destinations.sql`

This adds nullable `mobile_url` and `desktop_url` columns to `public.short_links`. The migration is committed to the repository but has not been applied to the live Supabase database.

The previous native app store-fallback migration is not required for this website-only implementation.

## Important fallback limitation

A normal HTTP redirect cannot reliably determine whether a remote destination page later fails to load. Kiungo therefore does not claim to detect broken destination websites automatically. The configured fallback is used for unknown devices, while missing device-specific URLs fall back to the main destination. An availability monitor could be added separately, with safeguards against unsafe URL fetching.

## Testing

API tests cover:
- Mobile browser routing.
- Desktop browser routing.
- Unknown user-agent fallback.
- Main destination fallback when device-specific URLs are omitted.
- HTTP(S)-only validation for configured web destinations.

No mobile app, App Store, Play Store, Universal Link or Android App Link integration is needed for this website-only feature.
