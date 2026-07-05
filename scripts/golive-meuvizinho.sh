#!/usr/bin/env bash
# Go-live meuvizinho.com.br — rodar APÓS registrar o domínio no Registro.br (2026-07-08)
# Uso: bash scripts/golive-meuvizinho.sh
# Requer: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, WHM_HOST, WHM_PORT, WHM_USER, WHM_API_TOKEN em ~/.claude/.secrets.env
set -euo pipefail

DOMAIN="meuvizinho.com.br"
HOSTGATOR_IP="108.167.132.104"                        # mesmo A record do bairronow.com.br
API_ORIGIN="partiurock-003-site16.mtempurl.com"       # SmarterASP origin (mesmo do api.bairronow)
CPANEL_USER="cleardesk"                               # conta cPanel que hospeda bairronow.com.br

getsecret() { grep -E "^$1=" ~/.claude/.secrets.env | head -1 | cut -d= -f2- | tr -d '"' ; }
CF_TOKEN=$(getsecret CLOUDFLARE_API_TOKEN)
CF_ACCOUNT=$(getsecret CLOUDFLARE_ACCOUNT_ID)
[ -z "$CF_ACCOUNT" ] && CF_ACCOUNT="51b264e86f293cf05b2c2de482404db6"

cf() { curl -s -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" "$@"; }

echo "== 1/4 Criando zona ${DOMAIN} no Cloudflare =="
ZONE_JSON=$(cf -X POST "https://api.cloudflare.com/client/v4/zones" \
  --data "{\"name\":\"${DOMAIN}\",\"account\":{\"id\":\"${CF_ACCOUNT}\"},\"type\":\"full\"}")
ZID=$(echo "$ZONE_JSON" | python -c "import sys,json;d=json.load(sys.stdin);print(d['result']['id'] if d.get('success') else '')")
if [ -z "$ZID" ]; then
  echo "Zona pode já existir — buscando..."
  ZID=$(cf "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" | python -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")
fi
echo "Zone ID: $ZID"

echo "== 2/4 Criando registros DNS (espelho do bairronow.com.br) =="
cf -X POST "https://api.cloudflare.com/client/v4/zones/${ZID}/dns_records" \
  --data "{\"type\":\"A\",\"name\":\"${DOMAIN}\",\"content\":\"${HOSTGATOR_IP}\",\"ttl\":1,\"proxied\":true}" >/dev/null || true
cf -X POST "https://api.cloudflare.com/client/v4/zones/${ZID}/dns_records" \
  --data "{\"type\":\"CNAME\",\"name\":\"www.${DOMAIN}\",\"content\":\"${DOMAIN}\",\"ttl\":1,\"proxied\":true}" >/dev/null || true
cf -X POST "https://api.cloudflare.com/client/v4/zones/${ZID}/dns_records" \
  --data "{\"type\":\"CNAME\",\"name\":\"api.${DOMAIN}\",\"content\":\"${API_ORIGIN}\",\"ttl\":1,\"proxied\":true}" >/dev/null || true
echo "OK"

echo "== 3/4 Nameservers para configurar no Registro.br =="
cf "https://api.cloudflare.com/client/v4/zones/${ZID}" | python -c "import sys,json;print('\n'.join(json.load(sys.stdin)['result']['name_servers']))"

echo "== 4/4 Criando addon domain no cPanel HostGator (vhost + FTP dir) =="
WHM_HOST=$(getsecret WHM_HOST); WHM_PORT=$(getsecret WHM_PORT); WHM_USER=$(getsecret WHM_USER); WHM_TOKEN=$(getsecret WHM_API_TOKEN)
curl -sk "https://${WHM_HOST}:${WHM_PORT}/json-api/cpanel?api.version=1&cpanel_jsonapi_user=${CPANEL_USER}&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=AddonDomain&cpanel_jsonapi_func=addaddondomain&newdomain=${DOMAIN}&subdomain=meuvizinho&dir=%2F${DOMAIN}" \
  -H "Authorization: whm ${WHM_USER}:${WHM_TOKEN}" | python -m json.tool | head -30

cat <<'EOF'

== PRÓXIMOS PASSOS MANUAIS ==
1. Registro.br: apontar nameservers do domínio para os NS acima (painel registro.br)
2. Aguardar propagação (zona sai de "pending" para "active" no Cloudflare)
3. SSL Cloudflare: modo Flexible (origem HostGator sem cert para o novo domínio)
4. Merge do branch golive/meuvizinho-frontendurl (flip FrontendUrl no backend)
5. Re-rodar workflow deploy-frontend (workflow_dispatch) — publica em /meuvizinho.com.br/
6. Atualizar GitHub secret NEXT_PUBLIC_SITE_URL -> https://meuvizinho.com.br (se ainda aponta pro antigo)
7. Smoke: curl https://meuvizinho.com.br/login/ + https://api.bairronow.com.br/health/ready
8. Redirect 301 bairronow.com.br -> meuvizinho.com.br (Cloudflare Redirect Rule na zona bairronow)
EOF
