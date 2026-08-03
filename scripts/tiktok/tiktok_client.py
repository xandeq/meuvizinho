"""Cliente minimo da TikTok Content Posting API para o Meu Vizinho.

Le credenciais SOMENTE do ambiente (nunca hardcode):
  TIKTOK_ACCESS_TOKEN   token OAuth (scopes: user.info.basic, video.publish,
                        video.upload) — obrigatorio

Sem dependencias externas (urllib puro). Nao publica ao importar.

IMPORTANTE (limites da plataforma):
- App NAO auditado so publica com privacy_level=SELF_ONLY (rascunho privado). Publico
  (PUBLIC_TO_EVERYONE) exige audit do app no TikTok for Developers.
- PULL_FROM_URL exige que o dominio da URL esteja verificado no painel do app
  (URL prefix ownership). meuvizinhoapp.com.br precisa ser verificado la.
"""
import os
import json
import time
import urllib.request
import urllib.error

BASE = "https://open.tiktokapis.com/v2"


class TikTokConfigError(RuntimeError):
    """Credencial obrigatoria ausente."""


class TikTokApiError(RuntimeError):
    """A API retornou erro."""


def _token():
    t = os.environ.get("TIKTOK_ACCESS_TOKEN")
    if not t:
        raise TikTokConfigError("TIKTOK_ACCESS_TOKEN ausente no ambiente")
    return t


def _request(method, path, body=None):
    url = f"{BASE}/{path.lstrip('/')}"
    headers = {"Authorization": f"Bearer {_token()}",
               "Content-Type": "application/json; charset=UTF-8"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="ignore")
        raise TikTokApiError(f"HTTP {e.code} em {method} {path}: {detail}") from None
    err = (payload.get("error") or {})
    if err and err.get("code") not in (None, "ok"):
        raise TikTokApiError(f"{err.get('code')}: {err.get('message')} ({path})")
    return payload


# ---------- identidade / smoke ----------

def user_info():
    fields = "open_id,display_name,avatar_url,follower_count,likes_count,video_count"
    return _request("GET", f"user/info/?fields={fields}").get("data", {}).get("user", {})


# ---------- publicar video (PULL_FROM_URL) ----------

def post_video(video_url, caption, privacy="SELF_ONLY", disable_comment=False):
    body = {
        "post_info": {
            "title": caption,
            "privacy_level": privacy,
            "disable_comment": disable_comment,
            "disable_duet": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "video_url": video_url,
        },
    }
    r = _request("POST", "post/publish/video/init/", body)
    return r.get("data", {}).get("publish_id")


# ---------- publicar foto / carrossel ----------

def post_photos(image_urls, caption, title=None, privacy="SELF_ONLY", cover_index=0):
    body = {
        "post_info": {
            "title": title or caption[:90],
            "description": caption,
            "privacy_level": privacy,
            "disable_comment": False,
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "photo_cover_index": cover_index,
            "photo_images": list(image_urls),
        },
        "post_mode": "DIRECT_POST",
        "media_type": "PHOTO",
    }
    r = _request("POST", "post/publish/content/init/", body)
    return r.get("data", {}).get("publish_id")


# ---------- status ----------

def publish_status(publish_id):
    r = _request("POST", "post/publish/status/fetch/", {"publish_id": publish_id})
    return r.get("data", {})


def wait_done(publish_id, tries=20, wait=5):
    for _ in range(tries):
        st = publish_status(publish_id)
        status = st.get("status")
        if status in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            return st
        if status in ("FAILED", "PUBLISH_FAILED"):
            raise TikTokApiError(f"publish {publish_id} falhou: {st}")
        time.sleep(wait)
    return {"status": "TIMEOUT", "publish_id": publish_id}
