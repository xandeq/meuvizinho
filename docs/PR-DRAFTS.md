# PRs prontos para abrir (após autorização de push)

Comandos exatos quando autorizado:

```bash
cd /d/claude-code/bairronow
git push origin master feat/kiwify-webhook feat/group-invite-links golive/meuvizinho-frontendurl
gh pr create --head feat/kiwify-webhook --title "feat(subscription): webhook Kiwify + página /premium" --body-file docs/pr-kiwify.md
gh pr create --head feat/group-invite-links --title "feat(groups): invite links de grupo" --body-file docs/pr-invites.md
# golive/* NÃO abre PR até 08/07
```

---

## PR 1 — feat/kiwify-webhook

**feat(subscription): webhook Kiwify + página /premium**

Completa o funil de monetização iniciado no #21 (trial 14 dias).

### Backend
- `POST /api/v1/webhooks/kiwify` — assinatura HMAC-SHA1 do body cru (`?signature=`), fail-closed sem `Kiwify:WebhookToken` (503)
- `order_approved`/`subscription_renewed`/`paid` → +33 dias Premium (estende do vencimento vigente)
- `order_refunded`/`chargeback` → revoga imediato; `canceled`/`late` → deixa expirar
- Comprador sem conta → log para reconciliação via admin grant
- Sem migration

### Frontend
- Página `/premium`: status do plano (free/trial/premium + dias restantes), benefícios, botão de trial funcional, CTA de checkout controlado por `NEXT_PUBLIC_KIWIFY_CHECKOUT_URL` (oculto até existir)
- Link ⭐ Premium no perfil

### Testes
- 25 unit backend (assinatura, classificação, expiry, parse) — suíte 225/225
- 6 jest da página /premium — suíte frontend 49/49
- `e2e/tests/subscription.spec.ts` (rodar pós-deploy)

### Pós-merge (manual)
1. Criar produto assinatura no painel Kiwify → copiar webhook token
2. Setar `Kiwify:WebhookToken` no SmarterASP
3. Setar secret `NEXT_PUBLIC_KIWIFY_CHECKOUT_URL` no GitHub + rebuild frontend
4. Registrar webhook no painel Kiwify → `https://api.bairronow.com.br/api/v1/webhooks/kiwify`
5. Smoke e2e: `npx playwright test subscription.spec.ts`

---

## PR 2 — feat/group-invite-links

**feat(groups): invite links — último gap do roadmap v1.2**

- Token HMAC-SHA256 stateless assinado com `Jwt:Key` — **sem migration**, validade 7 dias, sem revogação individual (expira sozinho)
- `POST /api/v1/groups/{id}/invite` (owner/admin) → `{ token, expiresAt, groupName }`
- `POST /api/v1/groups/join/invite` → entra **Active mesmo em grupo fechado** (convite = aprovação); banido continua 403
- Botão "Convidar" no header do grupo (copia `/groups/join/?token=…`)
- Página `/groups/join` — entra e redireciona pro grupo

### Testes
- 11 unit do token (roundtrip, expiry, tamper, url-safe, fail-closed) — suíte 225/225
- 4 jest da página /groups/join — suíte frontend 53/53
- `e2e/tests/group_invites.spec.ts` (rodar pós-deploy)
