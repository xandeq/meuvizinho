# ADR-002: Static Export (Next.js) vs SSR/ISR

**Status:** Accepted  
**Date:** 2026-05-16  
**Deciders:** Alexandre Queiroz  
**Context:** Phase 2 risk audit — Fase 2 Item 5

---

## Context

The frontend is built with Next.js 15 and deployed as a **static export** (`next build` with `output: 'export'`) via FTP to HostGator cPanel (shared hosting). This was an explicit constraint from the start of the project (no Docker, no Node.js runtime on HostGator cPanel).

This decision has SEO and UX implications that need to be formally documented so future contributors don't try to introduce SSR/ISR features that will silently break the build.

---

## Decision

**Maintain static export indefinitely for the HostGator frontend.**

---

## Rationale

### Why static export is the only viable option here

1. **HostGator cPanel shared hosting does not support Node.js runtime.** There is no way to run `next start` or any Node.js process on a cPanel shared account. Static export (HTML + JS + CSS files) deployed via FTP is the only supported model.

2. **Alternatives require changing hosting:**
   - SSR (Next.js `next start`): needs Node.js runtime → requires VPS or PaaS (Vercel, Render, Railway)
   - ISR: same requirement as SSR
   - Edge runtime: needs Cloudflare Workers or Vercel Edge

3. **Changing hosting is out of scope for the current budget constraint.** The backend already uses SmarterASP (Windows IIS) and the frontend uses HostGator's existing reseller account with zero extra cost.

### Known limitations and mitigations

| Limitation | Impact | Mitigation |
|------------|--------|-----------|
| CSR-only for authenticated routes | Google/Bing won't index feed, marketplace, groups | Public preview routes (`/p/[postId]`, `/m/[listingId]`) are generated as static HTML at build time — share links are crawlable |
| No dynamic OG tags per post/listing | Social shares use generic OG metadata | `/p/[id]` and `/m/[id]` routes have static OG placeholders; dynamic data shown client-side after hydration |
| `next/image` optimization disabled | Images served as-is, no automatic WebP | Cloudflare's Polish (image optimization) and Resize features can partially compensate at the CDN layer |
| No server-side redirects | Redirects managed via `.htaccess` (Apache) | `.htaccess` with `mod_rewrite` handles SPA routing — already implemented |
| No API routes (`/api/*`) in Next.js | All backend logic must be on .NET API | By design — .NET API is the backend; Next.js is frontend-only |

### When to re-evaluate

This decision should be revisited if:

1. **SEO becomes a hard requirement** for neighbor-scoped content discovery (e.g., "bairros de Vila Velha" search intent). At that point, migrating the frontend to Vercel (free tier for Next.js) would be the lowest-friction path to SSR.

2. **Monthly active users exceed 1,000** — at that scale, the Vercel free tier limits become relevant and a paid SSR hosting decision needs budget approval.

3. **HostGator reseller account is upgraded** to a VPS plan that supports Node.js process management.

### Trigger conditions (from ADR-001)

This ADR is independent of ADR-001 (backend stack). Either can change without forcing the other to change.

---

## Consequences

- **All Next.js page routes must be pre-renderable at build time** or use client-side data fetching. Dynamic routes that need `generateStaticParams` must enumerate all possible params at build time (currently not applicable — we don't have public-facing user profile pages indexed by ID).

- **CI must never add `output: 'standalone'` to `next.config.ts`** — that would break the FTP deploy silently.

- **`next/image` `unoptimized` is required** (already set in `next.config.ts`) — removing it would cause build failure on static export.

- Public share routes (`/p/[postId]`, `/m/[listingId]`) are the SEO surface and should be kept static-friendly.

---

## Alternatives Considered

| Option | Why Not |
|--------|---------|
| Vercel (free) | Requires changing DNS/hosting flow; adds external dependency; free tier has bandwidth limits for Brazilian traffic; adds complexity during MVP stabilization |
| Cloudflare Pages | Would work for SSR via Cloudflare Workers; overkill for current scale; requires migrating away from HostGator cPanel |
| Railway / Render | Paid (or limited free tier); introduces ops complexity; backend already on SmarterASP — two separate hosting providers for frontend already exists |
| Keep HostGator + add Node.js via cPanel | HostGator cPanel reseller (alexa084_Basico plan) does not support Node.js app hosting |

---

*Last updated: 2026-05-16*
