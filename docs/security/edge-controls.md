# Edge security controls

Medicaid Audit Intelligence publishes public audit evidence but should not expose deployment details, credentials, internal paths, or unpublished records. These controls complement the application safeguards; `robots.txt` is crawler guidance, not access control.

## Required production controls

- Keep the origin behind Cloudflare and restrict direct origin traffic where the hosting platform permits it.
- Enable managed WAF rules for common injection, traversal, protocol, and bot-abuse patterns.
- Apply rate limiting at the edge to `/api/*`, with a stricter rule for repeated 4xx responses and admin paths. The in-process limiter is a bounded fallback, not a distributed control.
- Preserve HTTPS redirects and HSTS. Do not cache authenticated or error responses.
- Keep Cloudflare managed `robots.txt` disabled because the application owns `/robots.txt`.
- Alert on sustained requests for credential files, source maps, WordPress paths, traversal patterns, and uncommon methods. Return a uniform 404; do not reveal whether a sensitive path exists.

## Content Security Policy rollout

Do not add a permissive policy merely to claim CSP coverage. The current SSR and Vite paths include inline JSON-LD and development scripts, so deploy CSP in two measured steps:

1. Send `Content-Security-Policy-Report-Only` at the edge in production and review violations for at least one normal release cycle.
2. Move legitimate inline scripts to nonce- or hash-authorized execution, then enforce a policy based on observed dependencies.

A starting report-only policy for production testing is:

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; upgrade-insecure-requests; report-to csp-endpoint
```

Do not enforce that draft until JSON-LD, analytics, image, and production asset behavior have been verified. Replace `'unsafe-inline'` styles if the rendered application can do so without regressions.

## Release checks

- Confirm `X-Powered-By` is absent.
- Confirm HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` are present.
- Request `/sitemap_index.xml` and confirm a permanent redirect to `/sitemap.xml`.
- Probe representative sensitive paths and confirm uniform 404 responses without stack traces or filesystem details.
- Confirm `/llms-full.txt` contains only canonical public links or explicitly labeled library records.
- Run `npm run research:validate`, `npm run llms:validate`, `npm run seo:integrity:test`, `npm run check`, and `npm run build`.
