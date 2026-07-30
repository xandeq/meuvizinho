# TikTok Content Posting API — Meu Vizinho

Cliente mínimo para publicar vídeo e foto/carrossel no TikTok via **API oficial**
(zero automação de browser). Sem dependências externas.

## Pré-requisito (bootstrap manual — feito 1 vez)

O TikTok é **mais restritivo** que a Meta. Precisa (no [TikTok for Developers](https://developers.tiktok.com)):

1. Criar um app e pedir os produtos **Login Kit** + **Content Posting API**.
2. Scopes: `user.info.basic`, `video.publish`, `video.upload`.
3. **Verificar a propriedade do domínio** `meuvizinhoapp.com.br` (URL prefix) — obrigatório
   para usar `PULL_FROM_URL` (a API baixa o criativo da URL).
4. Fazer o fluxo OAuth (login da conta @meuvizinho no TikTok) → obter `access_token`.
5. **Audit do app** para poder publicar como **público**. Sem audit, todo post sai como
   `SELF_ONLY` (rascunho privado, só você vê) — bom pra testar, inútil pra alcance.

Ao final você tem: `TIKTOK_ACCESS_TOKEN`.

> Nota: o token OAuth do TikTok expira (~24h) e usa refresh_token. Para automação
> contínua, guarde o `refresh_token` e renove — a implementar quando houver o app.

## Configurar

`~/.claude/.secrets.env` (gitignored):
```
TIKTOK_ACCESS_TOKEN=...
# TIKTOK_REFRESH_TOKEN=...   # p/ renovacao automatica (futuro)
```
GitHub Secrets (automações em Actions): `gh secret set TIKTOK_ACCESS_TOKEN --repo xandeq/meuvizinho`.

## Uso

```bash
python scripts/tiktok/smoke.py     # valida token + le perfil (nao publica)
```

```python
import tiktok_client as tk
# video (reel) — dominio da URL precisa estar verificado
pid = tk.post_video("https://meuvizinhoapp.com.br/social/reel1.mp4",
                    "legenda #MeuVizinho", privacy="SELF_ONLY")
tk.wait_done(pid)
# foto/carrossel
pid = tk.post_photos(["https://meuvizinhoapp.com.br/social/post1-manifesto.png"],
                    "legenda", privacy="SELF_ONLY")
tk.wait_done(pid)
```

Troque `privacy="PUBLIC_TO_EVERYONE"` só **depois** do audit do app.

## Arquivos
- `tiktok_client.py` — user_info, post_video, post_photos, publish_status/wait_done.
- `smoke.py` — valida token, lê perfil; **não publica**.

## Relação com IG/FB
IG + FB usam `scripts/meta/` (Graph API). Um orchestrator que publica nas 3 redes de
uma vez entra quando `scripts/meta/` e `scripts/tiktok/` estiverem na mesma base (pós-merge
do #24). Cada rede tem formato próprio: TikTok = vídeo ou foto-carrossel; IG = imagem/carrossel/reel; FB = texto/foto/link.
