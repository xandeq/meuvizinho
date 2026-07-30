#!/usr/bin/env python
"""Smoke test da TikTok Content Posting API — valida o token e le o perfil.
NAO publica nada.

Uso: TIKTOK_ACCESS_TOKEN=... python scripts/tiktok/smoke.py
Sai 0 = ok · 1 = erro de API · 2 = config faltando.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tiktok_client as tk


def main():
    try:
        u = tk.user_info()
        print(f"[ok] token valido — @{u.get('display_name')} "
              f"| seguidores={u.get('follower_count')} | videos={u.get('video_count')}")
        print("\nSMOKE OK — nada publicado.")
        return 0
    except tk.TikTokConfigError as e:
        print(f"[config] {e}")
        return 2
    except tk.TikTokApiError as e:
        print(f"[api] {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
