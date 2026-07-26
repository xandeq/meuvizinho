"""Cliente minimo da Meta Graph API para o Meu Vizinho (Facebook Page + Instagram).

Le credenciais SOMENTE do ambiente (nunca hardcode):
  META_SYSTEM_TOKEN   token do System User (nao expira) — obrigatorio
  META_PAGE_ID        id da Page do Facebook — obrigatorio p/ publicar/ler Page
  META_IG_USER_ID     id da conta IG Business — OPCIONAL (auto-descoberto pela Page)
  META_GRAPH_VERSION  versao da Graph API — opcional (default v21.0)

Sem dependencias externas (urllib puro). Nao publica nada ao importar.
"""
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error

GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v21.0")
BASE = f"https://graph.facebook.com/{GRAPH_VERSION}"


class MetaConfigError(RuntimeError):
    """Variavel de ambiente obrigatoria ausente ou vinculo faltando."""


class MetaApiError(RuntimeError):
    """A Graph API retornou erro HTTP."""


def _token():
    t = os.environ.get("META_SYSTEM_TOKEN")
    if not t:
        raise MetaConfigError("META_SYSTEM_TOKEN ausente no ambiente")
    return t


def _require(env_name, human_hint):
    v = os.environ.get(env_name)
    if not v:
        raise MetaConfigError(f"{env_name} ausente no ambiente ({human_hint})")
    return v


def _request(method, path, params=None, data=None):
    params = dict(params or {})
    params["access_token"] = _token()
    url = f"{BASE}/{path.lstrip('/')}"
    if method == "GET":
        url = url + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, method="GET")
    else:
        body = urllib.parse.urlencode({**params, **(data or {})}).encode()
        req = urllib.request.Request(url, data=body, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="ignore")
        # nunca vaza o token: ele vai no corpo/query, nao no texto do erro da Graph
        raise MetaApiError(f"HTTP {e.code} em {method} {path}: {detail}") from None


# ---------- identidade / descoberta ----------

def me():
    """Valida o token: retorna id/name do dono do token."""
    return _request("GET", "me", {"fields": "id,name"})


def page_id():
    return _require("META_PAGE_ID", "id da Page — passo 1 do setup")


def page_info():
    return _request("GET", page_id(),
                    {"fields": "name,fan_count,link,instagram_business_account"})


def resolve_ig_user_id():
    """Retorna o IG User ID. Usa META_IG_USER_ID se setado; senao descobre pela Page."""
    env = os.environ.get("META_IG_USER_ID")
    if env:
        return env
    info = page_info()
    iba = info.get("instagram_business_account")
    if not iba or "id" not in iba:
        raise MetaConfigError(
            "Page sem instagram_business_account vinculado — refazer passo 4 "
            "(IG Profissional/Empresa + vincular a Page)")
    return iba["id"]


def ig_info():
    return _request("GET", resolve_ig_user_id(),
                    {"fields": "username,followers_count,media_count"})


# ---------- publicar: Facebook Page ----------

def post_page_text(message):
    return _request("POST", f"{page_id()}/feed", data={"message": message})


def post_page_link(message, link):
    return _request("POST", f"{page_id()}/feed", data={"message": message, "link": link})


def post_page_photo(image_url, caption=""):
    return _request("POST", f"{page_id()}/photos",
                    data={"url": image_url, "caption": caption})


# ---------- publicar: Instagram (fluxo de 2 passos) ----------

def _ig_wait_ready(creation_id, tries=10, wait=3):
    """Aguarda o container de midia ficar FINISHED antes de publicar."""
    ig = resolve_ig_user_id()
    for _ in range(tries):
        st = _request("GET", creation_id, {"fields": "status_code"})
        code = st.get("status_code")
        if code == "FINISHED":
            return True
        if code == "ERROR":
            raise MetaApiError(f"container {creation_id} falhou (status ERROR)")
        time.sleep(wait)
    return False


def post_ig_image(image_url, caption=""):
    ig = resolve_ig_user_id()
    creation = _request("POST", f"{ig}/media",
                        data={"image_url": image_url, "caption": caption})
    cid = creation["id"]
    _ig_wait_ready(cid)
    return _request("POST", f"{ig}/media_publish", data={"creation_id": cid})


def post_ig_carousel(image_urls, caption=""):
    ig = resolve_ig_user_id()
    children = []
    for u in image_urls:
        c = _request("POST", f"{ig}/media",
                     data={"image_url": u, "is_carousel_item": "true"})
        children.append(c["id"])
    for cid in children:
        _ig_wait_ready(cid)
    container = _request("POST", f"{ig}/media",
                         data={"media_type": "CAROUSEL",
                               "children": ",".join(children),
                               "caption": caption})
    _ig_wait_ready(container["id"])
    return _request("POST", f"{ig}/media_publish",
                    data={"creation_id": container["id"]})
