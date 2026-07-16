# Go-live meuvizinho.com.br — Checklist (janela: 2026-07-08)

Contexto: rebrand BairroNow → Meu Vizinho já está 100% no código (PRs #18/#19/#20).
O PR #22 reverteu `FrontendUrl` para bairronow.com.br porque o domínio ainda não existe.
O workflow `deploy-frontend.yml` já publica em `/meuvizinho.com.br/` — **deploys de frontend
estão efetivamente bloqueados até o go-live** (o site atual serve o último build antigo).

## Dia 08/07 — sequência

1. **Registrar `meuvizinho.com.br` no Registro.br** (manual — login ALCQU12, código por email via Gmail MCP)
2. **Rodar** `bash scripts/golive-meuvizinho.sh` — cria zona Cloudflare + DNS (A @, CNAME www, CNAME api) + addon domain no cPanel HostGator (vhost/FTP `/meuvizinho.com.br/`)
3. **Registro.br**: apontar os nameservers exibidos pelo script
4. Aguardar zona Cloudflare ficar `active`; setar SSL **Flexible** na zona nova
5. **Merge** branch `golive/meuvizinho-frontendurl` (flip `FrontendUrl` → https://meuvizinho.com.br) — dispara deploy-backend
6. Conferir/atualizar GitHub secret `NEXT_PUBLIC_SITE_URL` = `https://meuvizinho.com.br`
7. **Re-rodar deploy-frontend** (workflow_dispatch) — agora o FTP `/meuvizinho.com.br/` existe
8. **Smoke**: `https://meuvizinho.com.br/login/` (200), `https://api.bairronow.com.br/health/ready` (200), testar email de reset de senha (link deve apontar pro domínio novo)
9. **Redirect 301** bairronow.com.br → meuvizinho.com.br (Redirect Rule na zona bairronow do Cloudflare)
10. Mobile: `mobile/app.json` já rebrandado (PR #20) — nada a fazer até o EAS build

## Decisões pendentes
- **API domain**: mantém `api.bairronow.com.br` por ora (JWT/CORS/workflows apontam pra ele).
  Migrar para `api.meuvizinho.com.br` é passo separado (CORS no backend + NEXT_PUBLIC_API_URL + workflows).
  O script já cria o CNAME `api.meuvizinho.com.br` para facilitar depois.
- **Redirect vs convivência**: recomendado 301 imediato para não dividir SEO.

## Rollback
- Reverter merge do passo 5 (volta FrontendUrl) — emails voltam a apontar pro bairronow.
- Frontend antigo continua servido em bairronow.com.br (não é tocado pelo deploy novo).
