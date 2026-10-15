#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seed de dados realistas para o ambiente LOCAL do Meu Vizinho (BairroNow).

Alvo: SOMENTE http://localhost:5000 (API local, Development, LocalDB
MeuVizinho_Local). Nunca aponta para producao (api.bairronow.com.br).

Idempotente-ish: antes de criar cada bloco de conteudo, verifica se ja existe
o suficiente (via GET) e pula a criacao se sim.

Usa somente biblioteca padrao (urllib, json, zlib/struct para gerar um PNG
minimo valido para os uploads de marketplace).

Rode com: PYTHONIOENCODING=utf-8 python -u scripts/seed-local.py
"""
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "http://localhost:5000"
BAIRRO_ID = 1
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.test.local")

SUMMARY = {
    "posts_created": 0,
    "comments_created": 0,
    "likes_created": 0,
    "listings_created": [],
    "security_alert_id": None,
    "security_alert_confirmed": False,
    "condominium_id": None,
    "announcements_created": 0,
    "common_areas_created": 0,
    "incidents_created": [],
    "whatsapp_groups_created": [],
    "errors": [],
}


# ─── Infra HTTP ──────────────────────────────────────────────────────────────

def load_env(path):
    values = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            values[k.strip()] = v.strip()
    return values


def build_multipart(fields, files):
    """fields: dict str->str. files: list of (field_name, filename, content_type, bytes)."""
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f"--{boundary}".encode())
        parts.append(f'Content-Disposition: form-data; name="{k}"'.encode())
        parts.append(b"")
        parts.append(str(v).encode("utf-8"))
    for field_name, filename, content_type, data in files:
        parts.append(f"--{boundary}".encode())
        parts.append(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"'.encode()
        )
        parts.append(f"Content-Type: {content_type}".encode())
        parts.append(b"")
        parts.append(data)
    parts.append(f"--{boundary}--".encode())
    parts.append(b"")
    body = b"\r\n".join(parts)
    return body, f"multipart/form-data; boundary={boundary}"


def _do_request(method, path, token=None, json_body=None, form_fields=None, multipart=None, params=None):
    url = BASE + path
    if params:
        clean = {k: v for k, v in params.items() if v is not None}
        url += "?" + urllib.parse.urlencode(clean)

    headers = {"Accept": "application/json"}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif multipart is not None:
        fields, files = multipart
        data, content_type = build_multipart(fields, files)
        headers["Content-Type"] = content_type
    elif form_fields is not None:
        data = urllib.parse.urlencode(form_fields).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read()
        status = e.code
    except urllib.error.URLError as e:
        return 0, {"error": str(e)}

    if not raw:
        return status, None
    try:
        return status, json.loads(raw)
    except Exception:
        return status, raw.decode("utf-8", errors="replace")


class Api:
    """Wrapper com login/relogin automatico e backoff simples em 429."""

    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.token = None
        self.user = None
        self.login()

    def login(self):
        status, body = _do_request("POST", "/api/v1/auth/login", json_body={
            "email": self.email, "password": self.password,
        })
        if status != 200 or not isinstance(body, dict) or "accessToken" not in body:
            raise RuntimeError(f"Login falhou para {self.email}: {status} {body}")
        self.token = body["accessToken"]
        self.user = body["user"]

    def call(self, method, path, **kwargs):
        attempts = 0
        while True:
            status, body = _do_request(method, path, token=self.token, **kwargs)
            if status == 401:
                self.login()
                status, body = _do_request(method, path, token=self.token, **kwargs)
            if status == 429 and attempts < 2:
                attempts += 1
                time.sleep(6)
                continue
            return status, body


def ok(status):
    return 200 <= status < 300


# ─── PNG minimo (sem dependencias) para satisfazer upload de fotos ─────────

def make_png(width=48, height=48, rgb=(214, 214, 214)):
    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(
            ">I", zlib.crc32(tag + payload) & 0xFFFFFFFF
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = bytes(rgb) * width
    raw = (b"\x00" + row) * height
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


PLACEHOLDER_PNG = make_png()


# ─── Secao: Feed (posts, comentarios, likes) ────────────────────────────────

def seed_feed(ana: Api, carlos: Api):
    status, body = ana.call("GET", "/api/v1/posts", params={"bairroId": BAIRRO_ID, "take": 50})
    if not ok(status):
        SUMMARY["errors"].append(f"GET /posts falhou: {status} {body}")
        return
    existing = (body or {}).get("items", [])
    if len(existing) >= 6:
        print(f"[feed] ja existem {len(existing)} posts no bairro {BAIRRO_ID}, pulando criacao.")
        return seed_feed_interactions(ana, carlos, existing)

    posts_plan = [
        (ana, "Dica", "Pessoal, descobri que a coleta de reciclaveis aqui na Praia da Costa passa"
                       " terca e sexta de manha. Separei vidro e papel num saco diferente e funcionou"
                       " bem melhor do que misturar tudo. Vale a dica pra quem ainda nao faz."),
        (carlos, "Alerta", "Aviso rapido: a prefeitura vai fazer manutencao na rede de agua na nossa"
                            " rua na quinta-feira pela manha. Pode faltar agua por algumas horas, melhor"
                            " deixar um balde cheio de reserva."),
        (ana, "Pergunta", "Alguem tem o contato de um encanador de confianca aqui perto? Minha"
                           " torneira da cozinha ta pingando sem parar e ja tentei trocar o vedante"
                           " mas nao resolveu."),
        (carlos, "Evento", "Confirmado! Vamos fazer a reuniao de moradores do Edificio Mar Azul no"
                            " sabado as 10h no salao de festas. Vai ter cafe da manha simples e a"
                            " pauta principal e a pintura da fachada. Apareçam!"),
        (ana, "Geral", "So pra deixar registrado que adorei a nova iluminacao da praca. Ficou muito"
                        " mais segura pra passear com o cachorro de noite."),
        (carlos, "Dica", "Lembrando que a coleta de residuos organicos passa todos os dias, mas o"
                          " entulho de obra precisa ser agendado direto com a empresa, nao pode"
                          " deixar na calcada sem aviso."),
    ]

    created_ids = []
    for author, category, body_text in posts_plan:
        fields = {"category": category, "body": body_text}
        status, resp = author.call("POST", "/api/v1/posts", multipart=(fields, []))
        if ok(status):
            created_ids.append(resp["id"])
            SUMMARY["posts_created"] += 1
            print(f"[feed] post criado por {author.email} ({category}) id={resp['id']}")
        else:
            SUMMARY["errors"].append(f"POST /posts ({category}) por {author.email} falhou: {status} {resp}")
        time.sleep(0.3)

    seed_feed_interactions(ana, carlos, [{"id": pid} for pid in created_ids] or existing)


def seed_feed_interactions(ana: Api, carlos: Api, posts):
    if not posts:
        return
    ids = [p["id"] for p in posts]

    total_comments = 0
    for pid in ids:
        status, comments_existing = ana.call("GET", f"/api/v1/comments/by-post/{pid}")
        if ok(status) and isinstance(comments_existing, list):
            total_comments += len(comments_existing)
    if total_comments >= 3:
        print(f"[feed] ja existem {total_comments} comentarios nesses posts, pulando novos comentarios/likes.")
        return

    comment_plan = [
        (carlos, ids[0] if len(ids) > 0 else None, "Boa dica! Vou separar certinho a partir de"
                                                     " agora, obrigado por avisar."),
        (ana, ids[3] if len(ids) > 3 else (ids[0] if ids else None), "Vou participar com certeza,"
                                                                      " levo um bolo pra reuniao."),
        (carlos, ids[2] if len(ids) > 2 else (ids[0] if ids else None), "Tenho o contato de um"
                                                                         " encanador que atendeu aqui no predio, te mando no privado."),
    ]
    for author, post_id, text in comment_plan:
        if post_id is None:
            continue
        status, resp = author.call("POST", "/api/v1/comments", json_body={
            "postId": post_id, "parentCommentId": None, "body": text,
        })
        if ok(status):
            SUMMARY["comments_created"] += 1
            print(f"[feed] comentario de {author.email} no post {post_id}")
        else:
            SUMMARY["errors"].append(f"POST /comments por {author.email} falhou: {status} {resp}")
        time.sleep(0.3)

    like_plan = [(ana, pid) for pid in ids[:3]] + [(carlos, pid) for pid in ids[3:6]]
    for author, post_id in like_plan:
        status, resp = author.call("POST", f"/api/v1/posts/{post_id}/like")
        if ok(status):
            SUMMARY["likes_created"] += 1
        else:
            SUMMARY["errors"].append(f"POST /posts/{post_id}/like por {author.email} falhou: {status} {resp}")
        time.sleep(0.3)


# ─── Secao: Marketplace ─────────────────────────────────────────────────────

def seed_marketplace(ana: Api, carlos: Api):
    status, body = ana.call("GET", "/api/v1/listings", params={
        "bairroId": BAIRRO_ID, "verifiedOnly": "false", "take": 50,
    })
    if not ok(status):
        SUMMARY["errors"].append(f"GET /listings falhou: {status} {body}")
        return
    existing = (body or {}).get("items", [])
    if len(existing) >= 4:
        print(f"[marketplace] ja existem {len(existing)} listings no bairro, pulando criacao.")
        return

    plan = [
        (ana, {
            "title": "Bicicleta aro 26 usada",
            "description": "Bicicleta aro 26, seis marchas, usei por dois anos e troquei de modelo."
                            " Pneus novos, freios revisados no mes passado. So retirar aqui no bairro.",
            "price": 380.00,
            "categoryCode": "esportes",
            "subcategoryCode": "bicicleta",
        }),
        (carlos, {
            "title": "Mesa de escritorio com duas gavetas",
            "description": "Mesa de madeira MDF, tampo de 120x60cm, duas gavetas com chave. Usei no"
                            " home office e agora voltei pro escritorio, ta sobrando aqui em casa.",
            "price": 250.00,
            "categoryCode": "moveis",
            "subcategoryCode": "sala",
        }),
        (ana, {
            "title": "Aulas particulares de violao",
            "description": "Dou aulas de violao popular para iniciantes, aqui no bairro ou na sua casa."
                            " Valor por aula de uma hora, material didatico incluso.",
            "price": 80.00,
            "categoryCode": "servicos",
            "subcategoryCode": "aulas",
        }),
        (carlos, {
            "title": "Doacao de roupas infantis (2 a 6 anos)",
            "description": "Minha filha cresceu e sobraram varias pecas em bom estado, camisetas,"
                            " shorts e alguns casacos de frio. E doacao, nao e venda, o valor abaixo e"
                            " so simbolico porque o anuncio exige um preco maior que zero.",
            "price": 1.00,
            "categoryCode": "infantil",
            "subcategoryCode": "roupa",
        }),
    ]

    for author, payload in plan:
        files = [("photos", "foto1.png", "image/png", PLACEHOLDER_PNG)]
        status, resp = author.call("POST", "/api/v1/listings", multipart=({"data": json.dumps(payload)}, files))
        if ok(status):
            SUMMARY["listings_created"].append({"id": resp["id"], "title": payload["title"]})
            print(f"[marketplace] listing criado por {author.email}: {payload['title']} (id={resp['id']})")
        else:
            SUMMARY["errors"].append(f"POST /listings ({payload['title']}) falhou: {status} {resp}")
        time.sleep(0.4)


# ─── Secao: Alerta de seguranca ──────────────────────────────────────────────

def seed_security_alert(ana: Api, carlos: Api):
    status, body = ana.call("GET", "/api/v1/security-alerts", params={"bairroId": BAIRRO_ID})
    if not ok(status):
        SUMMARY["errors"].append(f"GET /security-alerts falhou: {status} {body}")
        return
    if isinstance(body, list) and len(body) >= 1:
        print("[seguranca] ja existe alerta no bairro, pulando criacao.")
        SUMMARY["security_alert_id"] = body[0]["id"]
        return

    status, resp = ana.call("POST", "/api/v1/security-alerts", json_body={
        "bairroId": BAIRRO_ID,
        "kind": "Suspeito",
        "description": "Um homem ficou rodando de bicicleta em volta do Edificio Mar Azul por uns"
                        " vinte minutos esta noite, olhando pra dentro das garagens. Foi embora quando"
                        " o porteiro saiu pra conversar com ele.",
        "locationDescription": "Em frente ao Edificio Mar Azul",
        "latitude": None,
        "longitude": None,
    })
    if not ok(status):
        SUMMARY["errors"].append(f"POST /security-alerts falhou: {status} {resp}")
        return
    alert_id = resp["id"]
    SUMMARY["security_alert_id"] = alert_id
    print(f"[seguranca] alerta criado por ana, id={alert_id}")

    status, resp = carlos.call("POST", f"/api/v1/security-alerts/{alert_id}/upvote")
    if ok(status):
        SUMMARY["security_alert_confirmed"] = True
        print(f"[seguranca] carlos confirmou (upvote) o alerta {alert_id}")
    else:
        SUMMARY["errors"].append(f"POST /security-alerts/{alert_id}/upvote falhou: {status} {resp}")


# ─── Secao: Condominio ───────────────────────────────────────────────────────

def seed_condominium(ana: Api, carlos: Api):
    status, body = carlos.call("GET", "/api/v1/condominiums", params={
        "bairroId": BAIRRO_ID, "search": "Edificio Mar Azul",
    })
    condo_id = None
    if ok(status) and isinstance(body, list) and len(body) > 0:
        condo_id = body[0]["id"]
        print(f"[condominio] 'Edificio Mar Azul' ja existe, id={condo_id}. Reaproveitando.")
    else:
        status, resp = carlos.call("POST", "/api/v1/condominiums", json_body={
            "bairroId": BAIRRO_ID,
            "name": "Edificio Mar Azul",
            "description": "Predio residencial com 302 apartamentos... na verdade 30, erro de digitacao"
                            " comum, mas aqui vai a descricao real: predio de oito andares na Praia da"
                            " Costa, com portaria 24 horas e salao de festas.",
            "addressLine": "Rua das Gaivotas, 120",
            "cep": "29101-000",
            "coverImageUrl": None,
            "unitsCount": 32,
        })
        if not ok(status):
            SUMMARY["errors"].append(f"POST /condominiums falhou: {status} {resp}")
            return
        condo_id = resp["id"]
        print(f"[condominio] criado 'Edificio Mar Azul', id={condo_id}")

    SUMMARY["condominium_id"] = condo_id

    # Carlos reivindica e, como e admin, aprova a propria reivindicacao.
    status, detail = carlos.call("GET", f"/api/v1/condominiums/{condo_id}")
    is_carlos_sindico = ok(status) and detail.get("sindicoUserId") == carlos.user["id"]
    if not is_carlos_sindico:
        status, resp = carlos.call("POST", f"/api/v1/condominiums/{condo_id}/claims", json_body={
            "requestedRole": None,
            "justification": "Sou o sindico eleito pelos moradores em assembleia, responsavel pela"
                              " administracao predial e financeira do Edificio Mar Azul.",
            "evidenceUrl": None,
        })
        if ok(status):
            claim_id = resp["id"]
            status2, resp2 = carlos.call("POST", f"/api/v1/condominiums/claims/{claim_id}/approve")
            if ok(status2):
                print(f"[condominio] claim {claim_id} aprovado, carlos agora e sindico.")
            else:
                SUMMARY["errors"].append(f"approve claim falhou: {status2} {resp2}")
        elif status == 409:
            print("[condominio] claim ja existia (409), seguindo.")
        else:
            SUMMARY["errors"].append(f"POST claims falhou: {status} {resp}")

    # Ana solicita vinculo de moradora e Carlos aprova.
    status, my_res = ana.call("GET", f"/api/v1/condominiums/{condo_id}/residents/me")
    ana_status = (my_res or {}).get("Status") or (my_res or {}).get("status")
    if ok(status) and ana_status == "Approved":
        print("[condominio] ana ja e moradora aprovada.")
    else:
        status, resp = ana.call("POST", f"/api/v1/condominiums/{condo_id}/residents", json_body={
            "unit": "Apto 302",
        })
        resident_id = None
        if ok(status):
            resident_id = resp["id"]
        elif status == 409:
            # Ja tem vinculo pendente/ativo: buscar o id via /residents/me
            status_me, me = ana.call("GET", f"/api/v1/condominiums/{condo_id}/residents/me")
            resident_id = (me or {}).get("Id") or (me or {}).get("id")
        else:
            SUMMARY["errors"].append(f"POST residents falhou: {status} {resp}")

        if resident_id:
            status2, resp2 = carlos.call("POST", f"/api/v1/condominiums/{condo_id}/residents/{resident_id}/approve")
            if ok(status2):
                print(f"[condominio] ana aprovada como moradora (Apto 302), resident_id={resident_id}")
            elif status2 == 400:
                print("[condominio] vinculo da ana ja estava processado.")
            else:
                SUMMARY["errors"].append(f"approve resident falhou: {status2} {resp2}")

    seed_announcements(carlos, condo_id)
    seed_common_area(carlos, condo_id)
    seed_incidents(ana, carlos, condo_id)


def seed_announcements(carlos: Api, condo_id):
    status, body = carlos.call("GET", f"/api/v1/condominiums/{condo_id}/announcements/manage")
    if ok(status) and isinstance(body, list) and len(body) >= 2:
        print("[condominio] ja existem comunicados, pulando criacao.")
        return

    plan = [
        {
            "title": "Reuniao de condominio no sabado",
            "body": "Confirmando a reuniao de moradores neste sabado as 10h no salao de festas."
                    " Vamos discutir a pintura da fachada e o reajuste da taxa condominial. A presenca"
                    " de pelo menos um representante por apartamento e importante.",
            "isImportant": True,
            "isPinned": True,
        },
        {
            "title": "Dedetizacao agendada para a proxima semana",
            "body": "A empresa de dedetizacao vai atender as areas comuns na terca-feira pela manha."
                    " Pedimos que os moradores evitem deixar portas das garagens abertas nesse periodo.",
            "isImportant": False,
            "isPinned": False,
        },
    ]
    for item in plan:
        status, resp = carlos.call("POST", f"/api/v1/condominiums/{condo_id}/announcements", json_body=item)
        if ok(status):
            SUMMARY["announcements_created"] += 1
            print(f"[condominio] comunicado criado: {item['title']}")
        else:
            SUMMARY["errors"].append(f"POST announcements ({item['title']}) falhou: {status} {resp}")
        time.sleep(0.3)


def seed_common_area(carlos: Api, condo_id):
    status, body = carlos.call("GET", f"/api/v1/condominiums/{condo_id}/common-areas")
    if ok(status) and isinstance(body, list) and len(body) >= 1:
        print("[condominio] ja existe area comum, pulando criacao.")
        return

    status, resp = carlos.call("POST", f"/api/v1/condominiums/{condo_id}/common-areas", json_body={
        "name": "Salao de festas",
        "description": "Salao com capacidade para 50 pessoas, conta com cozinha equipada e banheiro.",
        "rules": "Reservar com pelo menos 48 horas de antecedencia e devolver o espaco limpo.",
        "capacity": 50,
        "coverImageUrl": None,
        "requiresApproval": True,
        "openTime": "08:00:00",
        "closeTime": "22:00:00",
        "minAdvanceHours": 48,
        "maxAdvanceDays": 90,
        "maxDurationMinutes": 360,
    })
    if ok(status):
        SUMMARY["common_areas_created"] += 1
        print(f"[condominio] area comum criada: Salao de festas (id={resp.get('id')})")
    else:
        SUMMARY["errors"].append(f"POST common-areas falhou: {status} {resp}")


def seed_incidents(ana: Api, carlos: Api, condo_id):
    status, body = ana.call("GET", f"/api/v1/condominiums/{condo_id}/incidents/mine")
    if ok(status) and isinstance(body, list) and len(body) >= 2:
        print("[condominio] ana ja tem ocorrencias registradas, pulando criacao.")
        SUMMARY["incidents_created"] = [{"id": i["id"], "title": i["title"]} for i in body[:2]]
        return

    plan = [
        {
            "category": "Manutencao",
            "title": "Lampada queimada no hall de entrada",
            "description": "A lampada do hall de entrada do predio esta queimada desde domingo, o"
                            " corredor fica bem escuro de noite. Pode trocar quando possivel?",
            "location": "Hall de entrada, terreo",
        },
        {
            "category": "Barulho",
            "title": "Barulho apos 22h no apartamento de cima",
            "description": "Nos ultimos dias o apartamento de cima tem feito muito barulho depois"
                            " das 22h, parece movimento de moveis e musica alta. Ja perdi o sono"
                            " algumas vezes essa semana.",
            "location": "Apto 302",
        },
    ]

    created = []
    for item in plan:
        status, resp = ana.call("POST", f"/api/v1/condominiums/{condo_id}/incidents", json_body=item)
        if ok(status):
            created.append(resp)
            print(f"[condominio] ocorrencia aberta: {item['title']} (id={resp['id']})")
        else:
            SUMMARY["errors"].append(f"POST incidents ({item['title']}) falhou: {status} {resp}")
        time.sleep(0.3)

    SUMMARY["incidents_created"] = [{"id": i["id"], "title": i["title"]} for i in created]

    if created:
        first = created[0]
        status, resp = carlos.call(
            "POST", f"/api/v1/condominiums/{condo_id}/incidents/{first['id']}/status",
            json_body={
                "status": "EmAndamento",
                "responseNote": "Obrigado pelo aviso, ja chamei o eletricista e a troca deve"
                                 " acontecer ainda essa semana.",
            },
        )
        if ok(status):
            print(f"[condominio] ocorrencia {first['id']} movida para Em Andamento por carlos.")
        else:
            SUMMARY["errors"].append(f"POST incidents/status falhou: {status} {resp}")


# ─── Secao: Diretorio de grupos de WhatsApp (opcional) ──────────────────────

def seed_whatsapp_groups(ana: Api, carlos: Api):
    status, body = ana.call("GET", "/api/v1/whatsapp-groups", params={"bairroId": BAIRRO_ID})
    if ok(status) and isinstance(body, list) and len(body) >= 1:
        print("[whatsapp] ja existe grupo verificado no bairro, pulando criacao.")
        return

    condo_id = SUMMARY.get("condominium_id")
    plan = [
        (ana, carlos, {
            "bairroId": BAIRRO_ID,
            "name": "Grupo do Bairro Praia da Costa",
            "inviteUrl": "https://chat.whatsapp.com/K9mQx27pLrT4sNa1Bz8Wc3",
            "kind": "Bairro",
            "description": "Grupo geral dos moradores da Praia da Costa para avisos e trocas rapidas.",
            "coverImageUrl": None,
            "memberCountApprox": 180,
            "condominiumId": None,
        }),
        (carlos, carlos, {
            "bairroId": BAIRRO_ID,
            "name": "Grupo Edificio Mar Azul",
            "inviteUrl": "https://chat.whatsapp.com/H3dRv18wQaZ9ePm2Lk7Xy5",
            "kind": "Condominio",
            "description": "Grupo oficial dos moradores do Edificio Mar Azul.",
            "coverImageUrl": None,
            "memberCountApprox": 28,
            "condominiumId": condo_id,
        }),
    ]

    for submitter, verifier, payload in plan:
        status, resp = submitter.call("POST", "/api/v1/whatsapp-groups", json_body=payload)
        if not ok(status):
            SUMMARY["errors"].append(f"POST whatsapp-groups ({payload['name']}) falhou: {status} {resp}")
            continue
        group_id = resp["id"]
        print(f"[whatsapp] grupo submetido: {payload['name']} (id={group_id})")

        status2, resp2 = verifier.call("POST", f"/api/v1/whatsapp-groups/{group_id}/verify", json_body={
            "isManagedByPlatform": False,
        })
        if ok(status2):
            SUMMARY["whatsapp_groups_created"].append({"id": group_id, "name": payload["name"]})
            print(f"[whatsapp] grupo {group_id} verificado por admin.")
        else:
            SUMMARY["errors"].append(f"POST whatsapp-groups/verify ({payload['name']}) falhou: {status2} {resp2}")
        time.sleep(0.3)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    env = load_env(ENV_FILE)
    moradora_email = env["TEST_MORADOR_EMAIL"]
    sindico_email = env["TEST_SINDICO_EMAIL"]
    password = env["TEST_PASSWORD"]

    print(f"Base: {BASE}  (bairro {BAIRRO_ID})")
    print("Autenticando moradora e sindico...")
    ana = Api(moradora_email, password)
    carlos = Api(sindico_email, password)
    print(f"  moradora: {ana.user['displayName']} (id={ana.user['id']}, verified={ana.user['isVerified']})")
    print(f"  sindico:  {carlos.user['displayName']} (id={carlos.user['id']}, admin={carlos.user['isAdmin']})")

    seed_feed(ana, carlos)
    seed_marketplace(ana, carlos)
    seed_security_alert(ana, carlos)
    seed_condominium(ana, carlos)
    seed_whatsapp_groups(ana, carlos)

    print("\n===== RESUMO =====")
    print(f"Posts criados:           {SUMMARY['posts_created']}")
    print(f"Comentarios criados:     {SUMMARY['comments_created']}")
    print(f"Likes criados:           {SUMMARY['likes_created']}")
    print(f"Listings criados:        {len(SUMMARY['listings_created'])}")
    for l in SUMMARY["listings_created"]:
        print(f"   - id={l['id']}: {l['title']}")
    print(f"Alerta de seguranca id:  {SUMMARY['security_alert_id']} (confirmado={SUMMARY['security_alert_confirmed']})")
    print(f"Condominio id:           {SUMMARY['condominium_id']}")
    print(f"Comunicados criados:     {SUMMARY['announcements_created']}")
    print(f"Areas comuns criadas:    {SUMMARY['common_areas_created']}")
    print(f"Ocorrencias:             {len(SUMMARY['incidents_created'])}")
    for i in SUMMARY["incidents_created"]:
        print(f"   - id={i['id']}: {i['title']}")
    print(f"Grupos WhatsApp criados: {len(SUMMARY['whatsapp_groups_created'])}")
    for g in SUMMARY["whatsapp_groups_created"]:
        print(f"   - id={g['id']}: {g['name']}")

    if SUMMARY["errors"]:
        print(f"\n===== ERROS ({len(SUMMARY['errors'])}) =====")
        for e in SUMMARY["errors"]:
            print(f"   - {e}")
    else:
        print("\nSem erros.")


if __name__ == "__main__":
    main()
