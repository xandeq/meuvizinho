#!/usr/bin/env python
"""Smoke test da Meta Graph API — valida o token e le os perfis. NAO publica nada.

Uso:
  META_SYSTEM_TOKEN=... META_PAGE_ID=... python scripts/meta/smoke.py

Sai 0 = tudo ok · 1 = erro de API · 2 = config faltando.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta_client as mc


def main():
    try:
        who = mc.me()
        print(f"[ok] token valido — dono: {who.get('name')} (id {who.get('id')})")

        pg = mc.page_info()
        print(f"[ok] Page: {pg.get('name')} | fans={pg.get('fan_count')} | {pg.get('link')}")

        iba = pg.get("instagram_business_account")
        if iba or os.environ.get("META_IG_USER_ID"):
            ig = mc.ig_info()
            print(f"[ok] Instagram: @{ig.get('username')} | seguidores={ig.get('followers_count')} "
                  f"| posts={ig.get('media_count')}")
            print(f"[info] META_IG_USER_ID = {mc.resolve_ig_user_id()}  "
                  f"(salve no .secrets.env p/ evitar 1 chamada extra)")
        else:
            print("[aviso] Page sem Instagram Business vinculado — refazer passo 4 do setup.")

        print("\nSMOKE OK — nada foi publicado.")
        return 0
    except mc.MetaConfigError as e:
        print(f"[config] {e}")
        return 2
    except mc.MetaApiError as e:
        print(f"[api] {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
