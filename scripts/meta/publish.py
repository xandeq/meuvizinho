#!/usr/bin/env python
"""Publica na Page do Facebook e/ou no Instagram do Meu Vizinho.

Uso:
  python scripts/meta/publish.py page-text   "mensagem"
  python scripts/meta/publish.py page-link    "mensagem" https://meuvizinhoapp.com.br
  python scripts/meta/publish.py page-photo    <image_url> "legenda"
  python scripts/meta/publish.py ig-image      <image_url> "legenda"
  python scripts/meta/publish.py ig-carousel   "url1,url2,url3" "legenda"

Instagram exige image_url PUBLICO e acessivel (a Graph API baixa a imagem).
Le credenciais do ambiente (ver README.md). Nao imprime o token.
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta_client as mc


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    cmd = argv[1]
    try:
        if cmd == "page-text":
            r = mc.post_page_text(argv[2])
        elif cmd == "page-link":
            r = mc.post_page_link(argv[2], argv[3])
        elif cmd == "page-photo":
            r = mc.post_page_photo(argv[2], argv[3] if len(argv) > 3 else "")
        elif cmd == "ig-image":
            r = mc.post_ig_image(argv[2], argv[3] if len(argv) > 3 else "")
        elif cmd == "ig-carousel":
            urls = [u.strip() for u in argv[2].split(",") if u.strip()]
            r = mc.post_ig_carousel(urls, argv[3] if len(argv) > 3 else "")
        else:
            print(__doc__)
            return 2
        print(json.dumps(r, ensure_ascii=False))
        return 0
    except (mc.MetaConfigError, mc.MetaApiError) as e:
        print(f"ERRO: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
