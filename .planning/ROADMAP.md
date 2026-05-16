# Roadmap: BairroNow

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-04-12)
- ✅ **v1.0 Honest** — Phase 7 stabilization (completed 2026-04-16)
- ✅ **v1.1 Powerful** — Phase 8 operational excellence (completed 2026-04-16)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-04-12</summary>

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1. Foundation + Auth | 4/4 | ✓ Complete | 2026-04-07 |
| 2. Verification + Neighborhoods | 3/3 | ✓ Complete | 2026-04-12 |
| 3. Feed + Posts | 3/3 | ✓ Complete | 2026-04-12 |
| 4. Marketplace + Chat | 3/3 | ✓ Complete | 2026-04-12 |
| 5. Map + Groups | 3/3 | ✓ Complete | 2026-04-12 |
| 6. Polish + Deploy | 4/4 | ✓ Complete | 2026-04-12 |

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.0 Honest (Phase 7) — COMPLETED 2026-04-16</summary>

Post-ship stabilization pass addressing deploy blockers, concurrency bugs,
data integrity gaps, and frontend dark mode inconsistencies found during
honest architecture review.

| Task | Category | Status |
|------|----------|--------|
| 07-00 git-hygiene | Housekeeping | ✓ Complete |
| 07-01 migrations-hygiene | Deploy blocker | ✓ Complete |
| 07-02 concurrency-critical | Security | ✓ Complete |
| 07-03 idempotency-critical | Data integrity | ✓ Complete |
| 07-04 consistency-enforcement | LGPD compliance | ✓ Complete |
| 07-05 frontend-critical | UI / dark mode | ✓ Complete |

Key fixes:
- FULLTEXT CATALOG migration `suppressTransaction: true` (deploy blocker)
- Atomic UPDATE for magic link + verification approval (race conditions)
- Idempotency middleware + axios interceptor (duplicate prevention)
- Global query filters on User/Message for LGPD soft-delete consistency
- Dark mode codemod: 65+ hardcoded colors → design tokens across 19 files
- Global error.tsx + not-found.tsx error boundaries

</details>

<details>
<summary>✅ v1.1 Powerful (Phase 8) — COMPLETED 2026-04-16</summary>

Operational excellence pass: security hardening, observability, resilience,
and performance — upgrades that make the app production-grade without
changing user-facing behavior.

| Task | Category | Status |
|------|----------|--------|
| 08-01 security-headers | Security | ✓ Complete |
| 08-02 response-compression | Performance | ✓ Complete |
| 08-03 health-checks | Ops / observability | ✓ Complete |
| 08-04 correlation-logging | Observability | ✓ Complete |
| 08-05 polly-resilience | Resilience | ✓ Complete |
| 08-06 ef-hot-path-tracking | Performance | ✓ Complete |
| 08-07 frontend-metadata-preconnect | Performance / SEO | ✓ Complete |

Key upgrades:
- `SecurityHeadersMiddleware` — CSP, HSTS (HTTPS-aware via X-Forwarded-Proto),
  X-Frame-Options DENY, Permissions-Policy, Referrer-Policy
- Brotli + Gzip response compression for JSON/JS/CSS/SVG
- Split `/health/live` (liveness, no deps) vs `/health/ready` (DB probe)
  with structured per-check JSON responses
- `CorrelationIdMiddleware` + Serilog `FromLogContext` + `UseSerilogRequestLogging`
  — every log line carries a correlation ID, error responses include it so
  users can quote it to support
- Polly v8 standard resilience pipeline (retry + timeout + circuit breaker)
  on ViaCEP/BrasilAPI and Resend email HTTP clients
- `AsNoTracking()` on genuinely read-only entity loads in ChatService /
  ListingService hot paths
- Frontend `<link rel="preconnect">` to API origin + full OpenGraph /
  Twitter / themeColor metadata

</details>

## Next Milestone

### 🔵 v1.2 "Comunidade Completa" — In Planning (2026-05-16)

Focus: close the feature gap between web and mobile, complete the Groups/Map UX,
add PWA basics for retention, and seed the monetization layer.

| Wave | Theme | Key Features |
|------|-------|-------------|
| A | Mobile Parity | Marketplace browse+post, Chat, Groups, Push notifications |
| B | Map + Groups UX | Marker clustering, event RSVP, member roster, invite links |
| C | PWA + SEO | manifest.json, service worker, Lighthouse ≥ 90, OG meta workaround |
| D | Monetização seed | Business account type, Business Spotlight in feed |

Full plan: `.planning/milestones/v1.2-ROADMAP.md`

### Pending PRs before v1.2 work begins

All 6 PRs below target `master` and must be merged first:

| PR | Branch | Content |
|----|--------|---------|
| #1 | chore/sync-pending-2026-05-16 | .gitignore + STATUS_REPORT |
| #2 | fix/swagger-dev-only | Swagger dev-only + stdoutLogEnabled=false |
| #3 | docs/adr-ssr-ssg-decision | ADR-002 static export |
| #4 | feat/marketplace-sort-selector | FilterChips sort + 5 tests |
| #5 | feat/fulltext-search | FULLTEXT search + LIKE fallback |
| #6 | feat/ui-design-system-v1 | Design system v1, 4 pilot screens |

---
*Last updated: 2026-05-16 — v1.2 milestone defined, 6 PRs pending merge*
