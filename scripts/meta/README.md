# Meta Graph API — Meu Vizinho (Facebook Page + Instagram)

Cliente mínimo para publicar/ler na Page do Facebook e no Instagram `@meuvizinhoapp`
via **Graph API oficial** (zero automação de browser). Sem dependências externas.

## Pré-requisito (bootstrap manual — feito 1 vez)

O Graph API precisa de um token que só existe **depois** de criar os ativos na Meta.
Isso exige login humano (2FA + Arkose não são automatizáveis). Passos no chat do projeto
(Track 1). Ao final você tem 2 valores obrigatórios:

- `META_PAGE_ID` — ID da Page do Facebook
- `META_SYSTEM_TOKEN` — token do System User (não expira), escopos:
  `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`

`META_IG_USER_ID` é **opcional** — o cliente descobre sozinho a partir da Page.

## Configurar as credenciais

**Local** (`~/.claude/.secrets.env`, gitignored):
```
META_PAGE_ID=...
META_SYSTEM_TOKEN=...
# META_IG_USER_ID=...        # opcional (auto-descoberto)
# META_GRAPH_VERSION=v21.0   # opcional
```

**GitHub Secrets** (repo `xandeq/meuvizinho`, para automações futuras em Actions):
```
gh secret set META_PAGE_ID --repo xandeq/meuvizinho
gh secret set META_SYSTEM_TOKEN --repo xandeq/meuvizinho
```

Nunca commite valores. Só nomes de variável aparecem no código.

## Uso

Carregue as variáveis no ambiente (ex.: `source ~/.claude/.secrets.env`) e:

```bash
# 1) Validar tudo sem publicar (valida token, lê Page, descobre e lê o IG)
python scripts/meta/smoke.py

# 2) Publicar
python scripts/meta/publish.py page-text  "Chegamos! A rede do seu bairro..."
python scripts/meta/publish.py page-link  "Conheça o Meu Vizinho" https://meuvizinhoapp.com.br
python scripts/meta/publish.py ig-image   https://.../post1.jpg "legenda + #hashtags"
python scripts/meta/publish.py ig-carousel "https://.../a.jpg,https://.../b.jpg" "legenda"
```

**Instagram exige `image_url` público** (a Graph API baixa a imagem do servidor).
Hospede os criativos em URL acessível (ex.: `frontend/public/` no site em produção,
ou um bucket). Carrossel: 2 a 10 imagens.

## Arquivos
- `meta_client.py` — funções de identidade, leitura e publicação (Page + IG 2-step).
- `smoke.py` — valida token e lê perfis; **não publica**.
- `publish.py` — CLI de publicação.

## Notas
- IG publica em 2 passos (cria container → publica); o cliente aguarda `status_code=FINISHED`.
- Todos os ativos são do próprio Portfolio → escopos funcionam em **Standard Access**,
  sem App Review.
- Erros de API sobem como `MetaApiError` com o corpo da resposta (útil pra diagnosticar
  escopo/permissão faltando).
