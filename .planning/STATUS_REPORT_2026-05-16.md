# STATUS_REPORT — BairroNow / NossoVizinho
**Data:** 2026-05-16  
**Executado por:** Claude Code (diagnóstico read-only)  
**Commit de referência:** `ae41d1b`

---

## 0.1 Git & Branches

### Estado dos repos

| Repo | Branch | Commit | Origin | Status |
|------|--------|--------|--------|--------|
| `bairronow/` (monorepo) | `master` | `ae41d1b` | `origin/master` = `ae41d1b` | ✅ 100% em sync |

### Branches locais vs remotas
```
* master
  remotes/origin/HEAD -> origin/master
  remotes/origin/master
```
Sem branches de feature pendentes. Apenas `master`.

### Untracked (não commitar)
```
.claude/agents/
.claude/commands/
.claude/plugins/
.claude/settings.json
.claude/workflows/
```
São configs do Claude Code — pertencem ao `.gitignore`, não ao repo do produto.

### Stashes
Nenhum stash pendente.

### Tags / Releases
| Tag | Status |
|-----|--------|
| `v1.0` | ✅ existe local + remote |
| `v1.1` | ❌ NÃO existe — milestone Powerful completado em ROADMAP.md mas nunca tagueado no git |

**Gap:** v1.1 não tem tag git. Histórico existe, milestone está no ROADMAP, mas `git tag -l` retorna só `v1.0`.

### 20 commits mais recentes (resumo)
```
ae41d1b fix: FeedHeader bairro name + deploy server-dir + UserInfo.bairroName
0a64252 fix: .htaccess RewriteCond per-rule, feed redirect to /cep-lookup/
5ff108d fix(auth): guard AddGoogle behind credential check
0d09aa6 debug: enable stdout logging + Development mode
...
7803fd2 feat(ui): flat design system v1 — tokens, primitives, landing page
...
8f5b5b8 feat(security): SecurityHeadersMiddleware
```

---

## 0.2 Estado das Fases

### Phases 1–3 (em produção)
Baseado em PROJECT.md e código:

| Feature | Status |
|---------|--------|
| JWT + refresh token | ✅ Auth, refresh, logout |
| Google OAuth (web) | ⚠️ Código existe mas **desabilitado** — sem `BAIRRONOW_GOOGLE_CLIENT_ID` no GitHub Secrets. Retorna 500 sem credenciais → guard adicionado (`5ff108d`) |
| Magic link auth | ✅ Funcionando |
| TOTP (admin) | ✅ Setup + verify |
| CEP lookup + ViaCEP/BrasilAPI | ✅ |
| Proof-of-residence upload | ✅ |
| Admin verification queue | ✅ |
| Feed (posts + comments + likes + search) | ✅ |
| Feed moderation | ✅ |

### Phase 4 — Marketplace + Chat: % por feature

| Feature do Spec | Status | Evidência |
|-----------------|--------|-----------|
| **Categoria picker 2-step** | ✅ Completo | `CategoryPicker.tsx` — chips chip-grid 2 níveis (categoria → subcategoria). Comentário `D-03: 2-step chip grid picker` |
| **Publish-direct flow** | ✅ Completo | `ListingService.cs:74` → `Status = ListingStatus.Active` direto no create, sem review queue |
| **Grid 2-col recency** | ✅ Completo | `marketplace/page.tsx:140` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. Store default `sort: "recent"` |
| **Full-text search** | ⚠️ Parcial | `ListingService.SearchAsync:264-308` usa **LIKE** (não FULLTEXT SQL Server). Comentário interno: "CONTAINS é otimização futura, deferred". Backend search existe e funciona, mas escala mal com volume. |
| **Filtro "verified seller" default ON** | ✅ Completo | `marketplace-store.ts:30` → `verifiedOnly: true` hard-default. Warning UI quando desligado. |
| **SignalR 1:1 chat** | ✅ Completo | `useSignalRChat.ts` + `ChatRoom.tsx` com hub singleton `getHubConnection()` |
| **Chat + persistência** | ✅ Completo | Mensagens persistidas no SQL Server via `ChatService`/`ConversationController`. Hub reenvia ao reconectar. |
| **Chat + imagens** | ✅ Completo | `ChatRoom.tsx:138-139` → `sendMessage(conversationId, text, image)` — suporte a attachment |
| **Rating buyer→seller** | ✅ Completo | `SellerRatingsController` + `RatingForm.tsx` + `getSellerRatings(sellerId)` no ListingDetailClient |
| **Moderation queue compartilhada** | ✅ Completo | `admin/moderation/page.tsx:10` → "unified moderation queue — posts + comments + listings" |
| **Taxonomia 10 categorias PT-BR** | ✅ Completo | `lib/categories.ts` + `Constants/Categories.cs` — 10 categorias hardcoded em sync manual |

### Gaps explícitos Phase 4

1. **FULLTEXT SQL Server não ativado em produção** — search usa LIKE. Funcional mas `LIKE '%q%'` ignora stemming, relevância e tem performance ruim com volume. `CONTAINS()` está deferred sem issue aberto.

2. **Sort selector não exposto na UI** — o sort `"recent"` é o padrão e está no store, mas `FilterChips` não tem controle de sort visível. Usuário não pode mudar para preço ou outro critério.

3. **Tag v1.1 não criada no git** — housekeeping, mas rastreabilidade.

4. **Google OAuth desabilitado** — feature existe no código mas sem as credenciais provisionadas ela está inerte. Não há fallback UI que explique isso ao usuário (botão Google aparece mas falha silenciosamente?).

---

## 0.3 Riscos Técnicos Ativos

### 1. Cloudflare SSL — Flexible (não Full Strict) 🔴
**Status:** Confirmado via `.planning/STATE.md:78,104` → SSL mode = Flexible.  
**O que significa:** Tráfego Cloudflare → SmarterASP (origem) vai em HTTP claro. JWTs no `Authorization` header trafegam descriptografados neste hop se houver interceptação na rede da datacenter.  
**Bloqueador para Full Strict:** SmarterASP requer cert configurado no IIS da origem (não só no Cloudflare). SmarterASP free/low tier pode usar certificado auto-assinado ou o cert da plataforma.  
**Risco real:** Médio — o vetor de ataque exige posição de rede dentro da rede da SmarterASP. Não é exploração trivial, mas é uma violação de boas práticas para JWT.  
**Fix:** Instalar certificado na origem ou usar SmarterASP's shared cert + Cloudflare "Full" (não Strict) como mínimo.

### 2. `GET /auth/me` — Naming divergente ⚠️
**Status:** O endpoint `/auth/me` não existe.  
**Realidade:** Funcionalidade equivalente existe em `GET /api/v1/profile/me` (`ProfileController.cs:42`).  
**Frontend:** usa corretamente `/api/v1/profile/me` em `auth/callback/page.tsx` e `settings-store.ts`.  
**Conclusão:** Não é um bug funcional — é discrepância de naming entre spec original e implementação. Não precisa de mudança no código.

### 3. Swagger em produção — aberto sem auth 🟡
**Status:** `Program.cs:392-393` → `app.UseSwagger()` sem `if(app.Environment.IsDevelopment())`.  
**Impacto:** `https://api.bairronow.com.br/swagger` está acessível publicamente e expõe schema completo de todos os endpoints, DTOs, e security definitions.  
**Fix rápido:** Envolver em `if (app.Environment.IsDevelopment())` ou adicionar basic auth na rota `/swagger`.

### 4. Credenciais expostas — OK ✅
Nenhuma credencial hardcoded encontrada. `Program.cs:279-280` usa `builder.Configuration["RESEND_API_KEY"]` (lido de appsettings ou env). Secrets injetados via GitHub Secrets no CI.

### 5. Static export do Next.js — limitação arquitetural 🟡
**Status:** Confirmado. GitHub Actions gera `frontend/out/` e faz FTP para HostGator.  
**Impacto:** 
- SSR/ISR impossível neste hosting — páginas dinâmicas são CSR puro
- SEO limitado (crawlers vêem HTML vazio nas rotas autenticadas)
- `next/image` não funciona otimizado (sem image server)
**Decisão arquitetural:** HostGator cPanel não suporta Node.js runtime. Static export é a única opção viável sem trocar de hosting. Manter documentado como limitação conhecida.

---

## 0.4 Saúde de Código

### Testes

**Backend (xUnit):**
```
tests/BairroNow.Api.Tests/
  Account/, Auth/, Chat/, Groups/, Map/, Marketplace/,
  Moderation/, Notifications/, Ratings/, Services/,
  Smoke/, Validators/, Verification/
```
Última contagem confirmada em memória: ~107 testes passando (v1.0-Honest). Não reexecutado nesta sessão.

**Frontend (Jest + RTL):**
```
frontend/__tests__/:
  CommentThread.test.tsx, FilterChips.test.tsx,
  ListingCard.test.tsx, ListingForm.test.tsx,
  PostCard.test.tsx, PostComposer.test.tsx,
  chat-store.test.ts, validators-listing.test.ts,
  validators-rating.test.ts
```

**E2E (Playwright):**
```
e2e/ (pasta existe no root)
```
Workflow `e2e.yml` existe no CI.

### CI/CD — Workflows

| Workflow | Trigger | Propósito |
|----------|---------|-----------|
| `deploy-frontend.yml` | push master, paths: frontend/** | Build estático + FTP para HostGator |
| `deploy-backend.yml` | push master, paths: src/** | dotnet publish + FTP para SmarterASP |
| `smoke.yml` | após deploy | curl para health endpoints |
| `e2e.yml` | PR | Playwright end-to-end |
| `pr-checks.yml` | PR | build + testes |
| `mobile-build.yml` | push master | Expo build check |

### TODOs / FIXMEs no código
Nenhum TODO, FIXME, HACK ou XXX encontrado no código-fonte (grep retornou vazio em `src/` e `frontend/src/`).

### Deps vulneráveis
`npm audit` não executado nesta sessão (read-only). Nenhum alerta crítico visível em package.json. `.NET` — nenhum `--vulnerable` checado.

---

## 0.5 UI/UX — Heurística Rápida

### Design System (pós-flat v1, commit `7803fd2`)
O flat design system v1 foi aplicado em 2026-05-01. Tokens CSS existem em `globals.css` com variáveis de `--bg`, `--fg`, `--primary`, `--border`.

### Por tela

| Tela | Observações |
|------|-------------|
| **Landing page** | Redesenhada com flat design v1. Sem issues de spacing aparentes. |
| **Login / Register** | Formulários simples. Google OAuth button presente mas inativo (sem credenciais). Não há indicação na UI de que Google está desabilitado — UX gap. |
| **Feed** | FeedHeader exibe nome do bairro corretamente (fix `ae41d1b`). Layout de cards parece OK. Dark mode codemoded em v1.1-Honest (65+ tokens). |
| **Marketplace** | Grid 2→3→4 colunas funciona. `FilterChips` não tem sort selector visível — usuário não sabe que pode ordenar por preço. ⚠️ UX gap. |
| **Chat** | `ChatRoom` com SignalR. Suporte a imagem no envio. Sem preview de imagem em bolha? (não verificado). |
| **Perfil** | `GET /api/v1/profile/me` funcional. Sem observações visuais críticas. |
| **Admin** | 4 seções: categories, groups, moderation, verifications. Moderation queue unificada. |
| **Onboarding** | 3 steps: cep-lookup → proof-upload → pending. Fluxo claro. |
| **Groups** | Fix do RewriteCond `.htaccess` aplicado (`0a64252`). Deve funcionar em prod. |
| **Map** | Fuzzing ±0.001° implementado. Sem observações críticas. |

### Inconsistências e gaps de UX

1. **Google OAuth desabilitado sem sinalização** — botão aparece na tela de login, mas sem as credenciais no prod vai falhar. Usuário confusos.

2. **FilterChips sem sort UI** — sort `"recent"` é hard-default não exposto. Usuários que querem filtrar por preço não têm como.

3. **Swagger público** — não é UX issue, mas quem navegar para `/swagger` vê toda a API exposta.

4. **Mobile (Expo)** — `mobile/src/` existe com `components/`, `features/`, `lib/`, `navigation/`, `theme/`. Grau de paridade com web não auditado nesta sessão. `mobile-build.yml` sugere que Expo build CI está ativo.

5. **Static export + SEO** — rotas públicas (`/p/[postId]`, `/m/[listingId]`) existem para compartilhamento, mas em static export o conteúdo é CSR. OG tags estão no `layout.tsx` mas são estáticas, não dinâmicas por post.

---

## Resumo Executivo

| Área | Status |
|------|--------|
| Git hygiene | ✅ Limpo — master em sync, sem stash, sem branches penduradas |
| Tag v1.1 | ❌ Faltando — milestone completo, tag não criada |
| Phase 4 features | ✅ ~90% completo. Gap principal: FULLTEXT search + sort UI |
| Cloudflare SSL | 🔴 Flexible — não Full Strict. JWT em HTTP claro no hop CF→SmarterASP |
| Swagger em prod | 🟡 Aberto sem auth — baixo risco, má prática |
| Google OAuth | ⚠️ Inativo sem credenciais — UX gap no login |
| Static export | 🟡 Limitação arquitetural conhecida — HostGator não suporta Node runtime |
| Credenciais | ✅ Nenhuma hardcoded encontrada |
| Testes | ✅ Suite robusta em backend e frontend |
| TODOs no código | ✅ Nenhum |

---

*Relatório gerado por diagnóstico read-only em 2026-05-16. Nenhum arquivo modificado.*
