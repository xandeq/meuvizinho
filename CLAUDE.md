<!-- GSD:project-start source:PROJECT.md -->
## Project

**BairroNow**

A neighborhood operating system for Brazil — a "Nextdoor brasileiro" where verified residents, building sindicos, local businesses, and public agencies connect on a centralized, geo-scoped platform. Residents share news, buy/sell/donate in a trusted marketplace, organize events, and form community groups. Sindicos manage building communities. Local businesses (gardening, food, retail, real estate, personal care, medical, salons) maintain profiles with deals and reviews. Public agencies send geo-targeted alerts and emergency messages. Everything is scoped to your bairro or building, and trust is built through address verification.

**Core Value:** Verified neighbor discovery — users must be able to find and trust that the people on the platform actually live in their neighborhood. Without this trust layer, nothing else works.

### Constraints

- **Hosting (Frontend)**: HostGator cPanel (alexa084 reseller) — shared hosting limitations, no Docker
- **Hosting (Backend)**: SmarterASP — .NET Core 8, SQL Server, no Redis (use in-memory cache)
- **Budget**: Free-tier infrastructure only — no Redis, no separate CDN beyond Cloudflare
- **Timeline**: MVP in 1 week
- **Domain**: Must register bairronow.com.br via Registro.br (Brazilian registry)
- **Security**: OWASP top 10, parametrized queries, XSS sanitization, CORS, HTTPS/TLS
- **Credentials**: All secrets in ~/.claude/.secrets.env — never hardcoded
- **Automation**: All provisioning via API/CLI — no manual portal logins
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework (Already Decided)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Frontend SPA/SSR | User decision, deployed to HostGator as static export |
| .NET Core | 8.0 | Web API backend | User decision, SmarterASP hosting |
| SQL Server | (SmarterASP) | Primary database | User decision, included with hosting |
| SignalR | (built-in) | Real-time updates | Native .NET Core, no extra infra |
| Cloudflare | — | DNS + CDN proxy | User decision |
### Backend Libraries (.NET)
| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Entity Framework Core | 8.0.x | ORM | Built-in .NET 8 ORM with excellent SQL Server support. Use `AsNoTracking()` for reads, split queries for includes. No reason to use Dapper for an MVP. | HIGH |
| FluentValidation | 12.1.x | Request validation | Strongly-typed validation rules, fluent API. v12 targets .NET 8+ natively. Use `FluentValidation.AspNetCore` for auto-registration. | HIGH |
| SixLabors.ImageSharp | 3.1.x | Image processing | Cross-platform, no native deps (critical for shared hosting). Resize/compress uploaded images. Replaces System.Drawing which is unsafe on non-Windows. | HIGH |
| Microsoft.AspNetCore.RateLimiting | (built-in) | Rate limiting | Built into .NET 8 middleware. Use `SlidingWindowLimiter` with 100 req/min per user. No third-party needed. In-memory counters are fine for single-instance SmarterASP. | HIGH |
| Microsoft.AspNetCore.Authentication.JwtBearer | (built-in) | JWT auth | Built-in. Use with `System.IdentityModel.Tokens.Jwt` for token generation. No IdentityServer needed for MVP. | HIGH |
| Serilog | 4.x | Structured logging | `Serilog.AspNetCore` + `Serilog.Sinks.MSSqlServer` for audit logs to SQL Server. Industry standard for .NET structured logging. | HIGH |
| MediatR | 12.x | CQRS/Mediator | Clean separation of commands/queries. Keeps controllers thin. Optional but strongly recommended for maintainability. | MEDIUM |
| AutoMapper | 13.x | Object mapping | DTO-to-entity mapping. Use `AutoMapper.Extensions.Microsoft.DependencyInjection`. | MEDIUM |
| Microsoft.Extensions.Caching.Memory | (built-in) | In-memory cache | No Redis available. Use `IMemoryCache` for CEP lookups, user sessions, hot data. Built-in, zero config. | HIGH |
| xUnit | 2.9.x | Unit testing | .NET standard. With `Moq` 4.20.x for mocking and `FluentAssertions` 7.x for readable assertions. | HIGH |
| Bogus | 35.x | Test data generation | Fake data for tests. Supports pt_BR locale for Brazilian names/addresses. | MEDIUM |
### Frontend Libraries (Next.js)
| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| @microsoft/signalr | 8.x | SignalR client | Official Microsoft client for SignalR hubs. Required for real-time features. | HIGH |
| react-hook-form | 7.x | Form handling | Lightweight, uncontrolled components, minimal re-renders. Pairs with zod for validation. | HIGH |
| zod | 3.x | Schema validation | TypeScript-first validation. Use for both form validation and API response parsing. | HIGH |
| axios | 1.7.x | HTTP client | Interceptors for JWT refresh token flow, request/response transforms. Better than raw fetch for auth token management. | HIGH |
| react-dropzone | 14.x | File upload UI | Drag-and-drop file uploads for proof-of-residence documents and post images. | HIGH |
| browser-image-compression | 2.x | Client-side image compression | Compress images before upload to save bandwidth on shared hosting. | MEDIUM |
| date-fns | 3.x | Date formatting | Tree-shakeable, pt-BR locale. Lighter than moment.js. | HIGH |
| zustand | 5.x | State management | Minimal, no boilerplate. For auth state, notification counts, feed cache. Simpler than Redux for this scale. | HIGH |
| tailwindcss | 3.4.x | CSS framework | Utility-first, great DX, small bundle with purge. Already standard for Next.js projects. | HIGH |
| next-intl or none | — | i18n | NOT needed for MVP (Portuguese only). Add later if expanding. | HIGH |
| Jest + React Testing Library | 29.x / 16.x | Testing | Standard Next.js testing stack. | HIGH |
### CEP/Geolocation (Brazil-Specific)
| Service | Type | Purpose | Why | Confidence |
|---------|------|---------|-----|------------|
| ViaCEP | Free REST API | CEP lookup | `viacep.com.br/ws/{cep}/json/` - returns bairro, localidade, uf. Most reliable, longest-running Brazilian CEP API. No auth needed. | HIGH |
| BrasilAPI | Free REST API | CEP fallback + enrichment | `brasilapi.com.br/api/cep/v2/{cep}` - v2 includes lat/lng from OpenStreetMap. Use as fallback when ViaCEP is down. | HIGH |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | EF Core 8 | Dapper | Dapper is faster for raw SQL but EF Core provides migrations, change tracking, LINQ — worth it for MVP velocity |
| Validation | FluentValidation | DataAnnotations | DataAnnotations are limited, no complex conditional rules, harder to test |
| Image Processing | ImageSharp | SkiaSharp | SkiaSharp has native deps (libSkiaSharp), problematic on shared hosting |
| State Management | Zustand | Redux Toolkit | Redux is overkill for this app's state complexity |
| HTTP Client | Axios | Fetch API | Axios interceptors make JWT refresh token rotation trivial |
| Rate Limiting | Built-in middleware | AspNetCoreRateLimit (NuGet) | Built-in since .NET 7, no third-party needed |
| Logging | Serilog | NLog | Serilog's structured logging + SQL Server sink is better for audit trails |
| Testing | xUnit | NUnit | xUnit is more modern, better parallelism, .NET team's choice |
| CEP API | ViaCEP + BrasilAPI | Correios API | Correios API requires registration, is slow, and has downtime. ViaCEP wraps it better. |
## What NOT to Use
| Technology | Why Not |
|------------|---------|
| Identity Server / Duende | Overkill for MVP. Simple JWT + refresh token with custom middleware is sufficient. |
| Redis | Not available on SmarterASP free tier. IMemoryCache is fine for single instance. |
| Docker | Not available on either HostGator or SmarterASP. |
| GraphQL | REST is simpler, team knows it, no complex nested query needs. |
| MongoDB | SQL Server is already provisioned. Relational model fits neighborhood/user/post data. |
| System.Drawing | Not cross-platform safe, deprecated for new projects. Use ImageSharp. |
| Moment.js | Deprecated. Use date-fns. |
| NextAuth.js | Auth is on the .NET backend. Frontend just stores/refreshes JWT tokens. |
## Installation
# Frontend (Next.js)
# Backend (.NET) - via dotnet CLI
# Test project
## Sources
- [EF Core 8 What's New - Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-8.0/whatsnew)
- [ASP.NET Core Rate Limiting Middleware - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-8.0)
- [SignalR JWT Auth - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-8.0)
- [SixLabors ImageSharp - NuGet](https://www.nuget.org/packages/sixlabors.imagesharp/)
- [FluentValidation 12 - NuGet](https://www.nuget.org/packages/fluentvalidation/)
- [ViaCEP](https://viacep.com.br/)
- [BrasilAPI](https://brasilapi.com.br/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- Commits: conventional commits (`feat()`, `fix()`, `ci()`, `docs()`, `chore()`)
- Tailwind v4: tokens em `@theme` no `globals.css` — sem `tailwind.config.ts`
- Flat design: `* { box-shadow: none !important }` global — nunca usar `shadow-*` no frontend web
- Backend secrets: GitHub Actions Secrets (`SMARTERASP_*`, `HOSTGATOR_*`, `BAIRRONOW_*`)
- pnpm: symlinks não resolvem no Git Bash Windows — só rodar tsc/jest via CI (Ubuntu)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

**Monorepo pnpm:** `frontend/` (Next.js 15 static export) + `mobile/` (Expo 54 + expo-router) + `src/` (.NET 8 API) + `packages/` (shared types/validators/api-client)

**Deploys:**
- Frontend web: GitHub Actions → FTP `dangerous-clean-slate` → HostGator `/bairronow.com.br/` (cPanel `cleardesk`)
- Backend: GitHub Actions → FTP → SmarterASP `/bairronow-api/` (IIS, `app_offline.htm` trick)
- Mobile: EAS build (workflow_dispatch apenas) → não deployado ainda

**Estado atual (2026-06-24):**
- `origin/master` = `9892665` — tudo até Wave O (polls, DMs, push notifications)
- git tag `v1.1` em `a7585e9`
- Backend healthy: `api.bairronow.com.br/health/ready` → Healthy
- **Wave P (feat/whatsapp-condo-directory, 5 commits, PR aberto, NÃO mergeado):**
  Diferencial "Meu Vizinho": diretório de grupos WhatsApp por bairro + condomínios com
  síndico reivindicável + UI de moderação admin. Entidades: `WhatsAppGroup`, `Condominium`,
  `CondominiumClaim`. Controllers: `api/v1/whatsapp-groups`, `api/v1/condominiums`.
  Migration `20260623000001` **escrita à mão** — EF design-time bloqueado por Windows
  Application Control (WDAC/Smart App Control `0x800711C7`) nesta máquina Windows.
  Em CI/Linux o EF funciona normalmente. O drift check definitivo é
  `dotnet ef migrations has-pending-model-changes` no job `backend-integration`
  (`.github/workflows/pr-checks-community.yml`).

**Aguardando para deploy:**
- Domínio `meuvizinho.com.br` — leilão abre 08/07/2026
- SSL Full Strict no Cloudflare (atualmente Flexible)
- Rotação de JWT_KEY e CONN_STRING antes do go-live

**CI:**
- `deploy-backend.yml`: push → dotnet build/test/publish → FTP SmarterASP → smoke `/health/ready`
- `deploy-frontend.yml`: push → pnpm build → FTP HostGator (`dangerous-clean-slate: true`)
- `pr-checks.yml`: frontend build + mobile tsc + mobile jest + backend dotnet test
- `mobile-build.yml`: EAS build (workflow_dispatch apenas)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
