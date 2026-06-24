# Meu Vizinho — Planejamento Estratégico
> Projeto atual: BairroNow → renomear para **Meu Vizinho** após registro do domínio
> Documento interno — não publicar

---

## Datas Críticas

| Data | Evento |
|------|--------|
| **06/07/2026** | Registro.br divulga lista de domínios liberados para leilão |
| **08/07/2026** | Abertura do leilão — tentar registrar `meuvizinho.com.br` |
| Após domínio | Protocolar marca no INPI (classes 38 + 42) |
| Após INPI | Lançamento público do app |

---

## Nome & Domínio

**Nome escolhido:** Meu Vizinho  
**Domínio alvo:** `meuvizinho.com.br`  
**Fallback handle:** `@meuvizinhoapp` (confirmado disponível no X/Twitter em 23/06/2026)

### Por que "Meu Vizinho"
- Tradução emocional correta de Nextdoor ("vizinho da porta ao lado" → "meu vizinho")
- Singular e pessoal — "meu" cria pertencimento
- Fácil de lembrar, fácil de digitar
- Candidatos descartados: Nosso Vizinho, Meus Vizinhos, Nossos Vizinhos

---

## Posicionamento

**Conceito:** O Nextdoor brasileiro — mas com foco em condomínios, prédios e grupos de WhatsApp

**Diferencial vs. concorrentes:**

| App | Fraqueza |
|-----|----------|
| Nextdoor | Americano, não entende Brasil, sem WhatsApp |
| WeUp | Mesma proposta, sem foco em condomínio/prédio |
| **Meu Vizinho** | Onde os grupos do seu bairro vivem |

**Tagline:** *"Tudo do seu bairro, em um lugar só."*

---

## Estratégia WhatsApp — Diferencial Principal

### O insight
No Brasil, a comunidade de bairro/prédio JÁ EXISTE — está fragmentada no WhatsApp.
O Meu Vizinho não cria comportamento novo, só organiza o que já acontece.

### Modelo de grupos
```
Grupo: "Condomínio Edifício Solar - Meu Vizinho"
├── Admin 1: @meuvizinho (WhatsApp Business — PERMANENTE, nunca sai)
├── Admin 2: Síndico / Administrador (transferido quando identificado)
└── Admin 3: Sub-admin opcional
```

### Fluxo de controle
1. App cria grupo padronizado por CEP/endereço
2. @meuvizinho é admin inicial
3. Moradores entram → engajam
4. Síndico/liderança aparece → recebe admin
5. @meuvizinho permanece como super-admin silencioso
6. Nome do grupo sempre carrega a marca

### Por que é imbatível
- 1.000 grupos ativos = 50k–200k pessoas vendo a marca todo dia no WhatsApp
- Custo de aquisição: R$0
- Nenhum concorrente reconstrói esse ativo

---

## Funcionalidades — Sprint até 08/07/2026

### Semana 1 (23–30 jun)
- [ ] Feed de bairro com posts por CEP
- [ ] Cadastro com verificação de endereço (ViaCEP)
- [ ] Marketplace local (compra/venda/doação)
- [ ] Perfil de morador

### Semana 2 (30 jun–07 jul)
- [ ] Módulo de comunidades (grupos por CEP + sistema admin/transferência)
- [ ] Diretório de grupos WhatsApp verificados
- [ ] Perfil de condomínio (síndico reivindica)
- [ ] Alertas de segurança geolocalizados
- [ ] Push notifications
- [ ] Onboarding flow

### Dia 08/07
- [ ] Registrar domínio meuvizinho.com.br
- [ ] Soft launch

---

## Custos

### One-time (para lançar)

| Item | Custo |
|------|-------|
| Domínio meuvizinho.com.br (leilão) | R$40–2.000 (imprevisível) |
| INPI classes 38 + 42 | ~R$710 |
| Apple Developer | ~R$500/ano |
| Google Play | ~R$125 (único) |
| Número chip WhatsApp Business | ~R$30 |
| **Total one-time** | **~R$1.400 + leilão** |

### Operacional mensal (fase MVP — tudo free tier)

| Serviço | Free tier | Limite |
|---------|-----------|--------|
| SmarterASP .NET | R$0 | Já incluso |
| HostGator cPanel | R$0 | Já incluso |
| Cloudflare DNS + proxy | R$0 | Ilimitado |
| Firebase Auth + Push (FCM) | R$0 | 10k auth/mês, push ilimitado |
| Brevo email | R$0 | 300 emails/dia |
| Cloudflare R2 storage | R$0 | 10GB/mês |
| WhatsApp Business App | R$0 | Manual |
| Expo EAS builds | R$0 | 30 builds/mês |
| Sentry (erros) | R$0 | 5k erros/mês |
| **Total mensal MVP** | **R$0/mês** | — |

### Quando sair do free tier (10k MAU)

| Tier | Custo/mês | Gatilho |
|------|-----------|---------|
| Mínimo pago | ~R$285 | Free tier esgotado |
| Operacional real | ~R$830 | 10k usuários ativos |
| Escala grande | ~R$2.600 | 100k+ usuários |

### Break-even com monetização de síndicos (R$49/mês por condomínio)

| Cenário | Condomínios pagantes necessários |
|---------|--------------------------------|
| Mínimo (R$285) | 6 |
| Médio (R$830) | 17 |
| Máximo (R$2.600) | 53 |

---

## Brand Assets (criados em 23/06/2026 via Canva)

### Logo
| # | Preview | Editar |
|---|---------|--------|
| Opção 1 | https://design.canva.ai/qMcRx3i7icVz7ha | https://www.canva.com/d/g0mlCcyr65a30t- |
| Opção 2 | https://design.canva.ai/46bIIwpyC6AP-2J | https://www.canva.com/d/FND9lLopje0yUrC |
| Opção 3 | https://design.canva.ai/87mWrtKUoMuTkpM | https://www.canva.com/d/STI7jDh39N_9vh2 |
| Opção 4 | https://design.canva.ai/4z-fMCToC-cenrA | https://www.canva.com/d/wUywn-i6mg_RbMA |

### Facebook Cover
| # | Editar |
|---|--------|
| Opção 1 | https://www.canva.com/d/gur5jNMuThLHCCt |
| Opção 2 | https://www.canva.com/d/Lr9muYIcdcD9dUV |
| Opção 3 | https://www.canva.com/d/l9LrmM8Lab0j2yT |
| Opção 4 | https://www.canva.com/d/3FlILSID88TBbBs |

### YouTube Banner
| # | Editar |
|---|--------|
| Opção 1 | https://www.canva.com/d/OwTdx1moafLguNC |
| Opção 2 | https://www.canva.com/d/jvEAufynnkifjZe |
| Opção 3 | https://www.canva.com/d/VzdYVj3M8W1HpMX |
| Opção 4 | https://www.canva.com/d/aIhXOVtkxaDUz1j |

### Instagram Post
| # | Editar |
|---|--------|
| Opção 1 | https://www.canva.com/d/WMSrxNt35-PuNoG |
| Opção 2 | https://www.canva.com/d/xSsGfDo3GjjmMAA |
| Opção 3 | https://www.canva.com/d/WiTAfFpXxWFtxvi |
| Opção 4 | https://www.canva.com/d/\_fX9EMLn0sJAy7G |

### Twitter/X Post
| # | Editar |
|---|--------|
| Opção 1 | https://www.canva.com/d/N1jwvARzZSpFGxD |
| Opção 2 | https://www.canva.com/d/idGnOLAbrwwnYRm |
| Opção 3 | https://www.canva.com/d/BBol3qAV3Co7QWO |
| Opção 4 | https://www.canva.com/d/dGGuM65qTnqBsrP |

### Instagram Story
| # | Editar |
|---|--------|
| Opção 1 | https://www.canva.com/d/x-mbrsPmhUl2oyF |
| Opção 2 | https://www.canva.com/d/mGP\_ZqxO-1NyuK7 |
| Opção 3 | https://www.canva.com/d/nKvlD1DK3BOOQDP |
| Opção 4 | https://www.canva.com/d/jUKEeyr5YzODYr- |

### Assets anteriores (sessão 22/06/2026)
| Asset | Canva ID | Editar |
|-------|----------|--------|
| Logo anterior | DAHNYW5DTuI | https://www.canva.com/d/bMrjpBlsIzTPnG8 |
| YouTube Banner anterior | DAHNYT0PV58 | https://www.canva.com/d/ioA1BuD-a_AYjHv |
| Facebook Cover anterior | DAHNYSAttZI | https://www.canva.com/d/G_jxWInSo-_RrHu |
| Instagram Post anterior | DAHNYWMmWHU | https://www.canva.com/d/vY7s5v9deyxQWR1 |

---

## Automação Social (estado em 23/06/2026)

Scripts prontos em `reports/social-automation/playwright/`:
- `facebook-page-setup.ts` — configura FB Page após login manual
- `youtube-channel-setup.ts` — configura canal YT após login manual
- `twitter-profile-setup.ts` — configura @meuvizinhoapp após criar conta
- `integrate-content-engine.ps1` — integra todas as contas ao pipeline de conteúdo

**Handles:**
- Twitter/X: `@meuvizinhoapp` — DISPONÍVEL (confirmado 23/06/2026)
- Demais plataformas: requerem criação manual (~30 min)

---

## Concorrentes a Monitorar

| App | Status | Observação |
|-----|--------|------------|
| Nextdoor | Ativo (EUA) | Não localizado para BR |
| WeUp | Lançado recentemente | Mesma proposta, sem foco WhatsApp/condomínio |

---

## AUDITORIA DE LANÇAMENTO (23/06/2026)

### Verdito: o core já está construído. NÃO partir do zero.

O backend tem **27 controllers + 38 entidades**. A paridade com Nextdoor/WeUp **já existe**:
feed, marketplace, grupos (com enquetes/eventos/RSVP), eventos, negócios locais, mapa
(com fuzzing de coordenadas), chat (SignalR), verificação de endereço (CEP/OCR/vouches),
moderação, denúncias, notificações+push, LGPD (anonimização/retenção).

### Estado verificado

| Item | Resultado |
|------|-----------|
| Backend live | ✅ `Healthy`, DB ok, HTTP 200 em 0,24s |
| Frontend live | ✅ HTTP 200 (bairronow.com.br) |
| Build estático frontend | ✅ Exit 0, exporta todas as rotas (Static+SSG) |
| Stubs/TODO no backend | ✅ Zero |
| Stack | Next.js 16.2.2, React 19.2.4, Tailwind 4, zod 4, .NET 8 |
| Testes backend | 1 projeto (Marketplace, Verification, Map, Validators, Services, Auth) |
| Migrations | 18 (schema maduro) |
| Testes frontend / mobile | 11 / 4 + e2e Playwright + Postman smoke |
| CI/CD | GitHub Actions (pr-checks, deploy-backend, deploy-frontend, e2e, smoke) |

> ⚠️ Next 16 é além do conhecimento do modelo — `frontend/AGENTS.md` exige ler
> `node_modules/next/dist/docs/` antes de editar código do frontend.

### Higiene pendente
- **38 arquivos não-commitados no `master`** — polish de UI coerente e acabado (animações,
  `.card-interactive`); build passa. Precisa commitar antes do deploy.
- Untracked: `PLANEJAMENTO.md`, `reports/`, `hostinger-fw.js`.

### Rebrand BairroNow → Meu Vizinho (escopo REAL é pequeno)
196 ocorrências no total, mas quase tudo é infra (.planning, .github, tests, namespaces .NET).
**User-facing concentrado em poucos arquivos:**
- `frontend/src/app/layout.tsx` — metadata central (title, OG, twitter, applicationName)
- `frontend/src/app/page.tsx` — landing (header, footer, copy)
- `frontend/src/app/privacy-policy/page.tsx`
- Páginas share/preview: `p/[postId]`, `m/[listingId]` (titles/SEO)
- `frontend/src/components/WhatsAppShareButton.tsx` — texto default
- Asset: `/brand/logo-icon.png` (trocar pelo logo novo)
> Comentários `// src/BairroNow.Api/...` são referência de código (namespace), NÃO marca —
> renomear namespace .NET NÃO é necessário pro lançamento (churn grande, pular).

### Domínio → meuvizinho.com.br (touchpoints pro launch web)
1. Backend `appsettings.json`: `FrontendUrl` = https://meuvizinho.com.br
   (1 config dirige TODOS os emails: magic-link, confirmar email, reset senha, boas-vindas)
2. Backend CORS `AllowedOrigins`: adicionar meuvizinho.com.br
3. `.github/workflows/deploy-frontend.yml`: novo docroot HostGator + domínio
4. DNS: meuvizinho.com.br → Cloudflare → HostGator + SSL (Cloudflare Full)
5. **Decisão recomendada:** manter API em `api.bairronow.com.br` no dia 1 (só o domínio do
   front muda → launch trivial); migrar API depois.
6. Mobile (depois): `mobile/src/lib/signalr.ts`, `mobile/src/features/share/utils/share.ts`

### Punch-list priorizado — Web-first 09/07

**P0 (bloqueia launch web):**
- [ ] Commitar o polish de UI (34 arquivos, build passa)
- [ ] Rebrand user-facing (layout.tsx, page.tsx, share/preview, privacy, WhatsAppShareButton) + logo
- [ ] Backend: FrontendUrl + CORS → meuvizinho.com.br (deploy backend)
- [ ] deploy-frontend.yml: docroot + domínio novo
- [ ] DNS/SSL meuvizinho.com.br (manual, dia 08 após registrar)

**P1 (antes/no launch):**
- [ ] `dotnet test` verde + e2e smoke
- [ ] Testar fluxo de email no domínio novo (auth ponta a ponta)
- [ ] Confirmar decisão de domínio da API

**P2 (pós-launch / trilha mobile):**
- [ ] Mobile: URLs hardcoded → meuvizinho
- [ ] Mobile: item "Em breve" em settings
- [ ] Pré-submeter apps (~5 dias antes) iOS/Android
- [ ] (opcional, adiar) rename namespace .NET

---

## WAVE P — Diferencial WhatsApp + Condomínio (IMPLEMENTADO 23/06/2026)

Branch `feat/whatsapp-condo-directory` (3 commits: e9abaa9, 2b28b2b, e304eba).
NÃO deployado (sem push — aguardando domínio/decisão).

**Entregue (build limpo + 176/176 testes verdes):**
- Backend: entidades `WhatsAppGroup`/`Condominium`/`CondominiumClaim` + 2 controllers
  (`api/v1/whatsapp-groups`, `api/v1/condominiums`) com CRUD, moderação e fluxo de
  claim/transferência de síndico (WhatsApp segue com a plataforma via `IsManagedByPlatform`)
- Migration `20260623000001` + snapshot (escritos à mão — EF design-time bloqueado por
  Windows Application Control nesta máquina; idêntico em CI/Linux)
- 22 testes novos (validação de link, moderação, claim)
- Frontend: `/whatsapp` (diretório), `/whatsapp/new` (submissão), `/condominios` (lista),
  `/condominios/[id]` (detalhe + reivindicação), `/admin/community` (moderação), nav
- Revisão adversarial aplicada: re-fila de moderação pós-edição, contador atômico,
  índices únicos filtrados (backstop TOCTOU), PII no claim, loading travado

**Pendente para ativar em produção (pós-domínio):**
- [ ] Push da branch + PR + merge
- [ ] Deploy aplica a migration no startup (SmarterASP)
- [ ] Seed inicial: criar grupos manualmente no WhatsApp Business App (@meuvizinho admin)
      e cadastrá-los/verificá-los no diretório
- [ ] (trilha mobile) portar o diferencial para o app Expo

---

*Última atualização: 23/06/2026 — diferencial Wave P implementado, revisado e testado*
