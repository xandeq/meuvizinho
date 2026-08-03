#!/usr/bin/env python
"""Configura a infra de email do lancamento no Brevo (idempotente).

Cria: folder 'Meu Vizinho', lista 'Meu Vizinho - Lancamento' e os atributos de
contato de segmentacao (BAIRRO, CIDADE, TIPO_USUARIO, VIP_BETA, ORIGEM).

Le BREVO_API_KEY do ambiente. Nao envia email, nao importa contato. Seguro rodar
mais de uma vez (pula o que ja existe).

Uso: BREVO_API_KEY=... python scripts/social/brevo_setup.py
"""
import os
import re
import json
import socket
import urllib.request
import urllib.error

socket.setdefaulttimeout(20)
BASE = "https://api.brevo.com/v3"


def _key():
    k = os.environ.get("BREVO_API_KEY")
    if not k:
        # fallback: le do .secrets.env central se existir
        p = os.path.expanduser("~/.claude/.secrets.env")
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                m = re.match(r"^BREVO_API_KEY=(.*)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    if not k:
        raise SystemExit("BREVO_API_KEY ausente no ambiente")
    return k


KEY = _key()


def api(method, path, body=None):
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"api-key": KEY, "accept": "application/json",
                 "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def main():
    # folder
    st, folders = api("GET", "/contacts/folders?limit=50")
    mv = [f for f in folders.get("folders", []) if "vizinho" in f.get("name", "").lower()] \
        if isinstance(folders, dict) else []
    if mv:
        fid = mv[0]["id"]; print(f"folder ja existe: {fid}")
    else:
        st, r = api("POST", "/contacts/folders", {"name": "Meu Vizinho"})
        fid = r.get("id"); print(f"folder criado: {fid}")

    # lista
    st, lists = api("GET", "/contacts/lists?limit=50")
    ex = [l for l in lists.get("lists", []) if l.get("name") == "Meu Vizinho - Lancamento"] \
        if isinstance(lists, dict) else []
    if ex:
        lid = ex[0]["id"]; print(f"lista ja existe: {lid}")
    else:
        st, r = api("POST", "/contacts/lists",
                    {"name": "Meu Vizinho - Lancamento", "folderId": fid})
        lid = r.get("id"); print(f"lista criada: {lid}")

    # atributos
    for name, typ in {"BAIRRO": "text", "CIDADE": "text", "TIPO_USUARIO": "text",
                      "VIP_BETA": "boolean", "ORIGEM": "text"}.items():
        st, r = api("POST", f"/contacts/attributes/normal/{name}", {"type": typ})
        ok = st in (200, 201, 204)
        print(f"attr {name}: {'ok' if ok else str(st) + ' ' + str(r.get('message', ''))[:50]}")

    print(f"\nOK. folder={fid} lista={lid}. "
          f"Agora monte a automacao no painel Brevo (trigger: contato entra na lista).")


if __name__ == "__main__":
    main()
