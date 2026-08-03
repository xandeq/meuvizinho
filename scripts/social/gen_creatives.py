# -*- coding: utf-8 -*-
"""Gera criativos de Instagram do Meu Vizinho: HTML -> PNG 1080x1350 (4:5), @2x.

Design system da marca (azul #2563EB, logo casa branca, Inter). Texto nitido e cor
exata — nao usa IA generativa. Requer: pip install patchright + navegador chrome.

Saida: frontend/public/social/*.png  (viram URL publica no deploy -> uso direto pela
Graph API em scripts/meta/publish.py ig-image).

Uso: python scripts/social/gen_creatives.py
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from patchright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "frontend", "public", "social")
os.makedirs(OUT, exist_ok=True)

BLUE = "#2563EB"; BLUE_D = "#1E3A8A"; BLUE_L = "#3B82F6"
FONT = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"
HOUSE = ('<svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">'
         '<path d="M50 12 L88 44 L88 88 L12 88 L12 44 Z" fill="white"/>'
         f'<rect x="41" y="60" width="18" height="28" rx="4" fill="{BLUE}"/></svg>')


def shell(inner):
    bg = f"linear-gradient(150deg,{BLUE_L} 0%,{BLUE} 42%,{BLUE_D} 100%)"
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="{FONT}" rel="stylesheet"></head><body style="margin:0">
<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:{bg};
 color:white;font-family:Inter,'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;
 box-sizing:border-box;padding:92px 96px">
 <div style="position:absolute;width:640px;height:640px;border-radius:50%;background:rgba(255,255,255,.08);top:-220px;right:-200px"></div>
 <div style="position:absolute;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.06);bottom:-120px;left:-90px"></div>
 {inner}
 <div style="margin-top:auto;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;color:rgba(255,255,255,.72);z-index:2">
   <span>@meuvizinhoapp</span><span style="opacity:.5">&bull;</span><span style="font-weight:600">meuvizinhoapp.com.br</span></div>
</div></body></html>"""


def logo_row():
    return (f'<div style="display:flex;align-items:center;gap:20px;z-index:2">'
            f'<div style="width:96px;height:96px;background:{BLUE};border-radius:24px;display:flex;'
            f'align-items:center;justify-content:center;box-shadow:0 12px 40px rgba(0,0,0,.28)">'
            f'<div style="width:60px;height:60px">{HOUSE}</div></div>'
            f'<span style="font-size:40px;font-weight:800;color:white">Meu Vizinho</span></div>')


def cover(title, sub, kicker=None):
    k = (f'<div style="font-size:30px;font-weight:700;letter-spacing:3px;text-transform:uppercase;'
         f'color:rgba(255,255,255,.8);margin-bottom:22px;z-index:2">{kicker}</div>') if kicker else ""
    return shell(f"""{logo_row()}
 <div style="flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2">{k}
  <div style="font-size:104px;font-weight:900;line-height:1.02;letter-spacing:-2px">{title}</div>
  <div style="font-size:46px;font-weight:500;line-height:1.32;margin-top:34px;color:rgba(255,255,255,.92);max-width:840px">{sub}</div></div>""")


def cover_step1(title, sub):
    return shell(f"""{logo_row()}
 <div style="flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2">
  <div style="font-size:96px;font-weight:900;line-height:1.03;letter-spacing:-2px">{title}</div>
  <div style="font-size:48px;font-weight:600;margin-top:30px;color:rgba(255,255,255,.92)">{sub}</div>
  <div style="font-size:80px;margin-top:44px">&darr;</div></div>""")


def step(num, total, title, desc):
    return shell(f"""{logo_row()}
 <div style="font-size:30px;font-weight:700;color:rgba(255,255,255,.72);margin-top:40px;z-index:2">Passo {num} de {total}</div>
 <div style="flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2">
  <div style="font-size:220px;font-weight:900;line-height:.9;color:rgba(255,255,255,.9);letter-spacing:-6px">{num}</div>
  <div style="font-size:72px;font-weight:800;line-height:1.05;margin-top:10px">{title}</div>
  <div style="font-size:42px;font-weight:500;line-height:1.34;margin-top:26px;color:rgba(255,255,255,.9);max-width:820px">{desc}</div></div>""")


def feature(badge, title, desc):
    return shell(f"""{logo_row()}
 <div style="flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2">
  <div style="display:inline-flex;align-self:flex-start;align-items:center;gap:12px;background:rgba(255,255,255,.16);
    border:2px solid rgba(255,255,255,.35);padding:14px 26px;border-radius:100px;font-size:32px;font-weight:700;margin-bottom:34px">{badge}</div>
  <div style="font-size:88px;font-weight:900;line-height:1.04;letter-spacing:-1.5px">{title}</div>
  <div style="font-size:44px;font-weight:500;line-height:1.34;margin-top:30px;color:rgba(255,255,255,.92);max-width:850px">{desc}</div></div>""")


def cta(title, sub, button):
    return shell(f"""{logo_row()}
 <div style="flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2">
  <div style="font-size:96px;font-weight:900;line-height:1.05;letter-spacing:-2px">{title}</div>
  <div style="font-size:46px;font-weight:500;line-height:1.3;margin-top:30px;color:rgba(255,255,255,.92)">{sub}</div>
  <div style="align-self:flex-start;margin-top:52px;background:white;color:{BLUE};font-size:44px;font-weight:800;
    padding:30px 56px;border-radius:20px;box-shadow:0 16px 44px rgba(0,0,0,.3)">{button}</div></div>""")


CREATIVES = [
 ("post1-manifesto", cover("Seu bairro<br>de verdade.", "Sem algoritmo. Sem venda de dados.<br>Tudo em ordem cronol&oacute;gica.", kicker="Chegou")),
 ("post3-carrossel-1", cover_step1("Como come&ccedil;ar no<br>Meu Vizinho?", "5 passos simples")),
 ("post3-carrossel-2", step(1, 5, "Baixa o app", "Android e iOS. Gr&aacute;tis, sempre.")),
 ("post3-carrossel-3", step(2, 5, "Verifica seu endere&ccedil;o", "Comprovante de resid&ecirc;ncia (luz, &aacute;gua, aluguel). Leva 2 minutos.")),
 ("post3-carrossel-4", step(3, 5, "Escolhe seu bairro", "V&ecirc; grupos verificados, marketplace e alertas j&aacute; acontecendo l&aacute;.")),
 ("post3-carrossel-5", step(4, 5, "Conecta com vizinhos", "Compra, vende, avisa, combina. Sem algoritmo por tr&aacute;s.")),
 ("post3-carrossel-6", step(5, 5, "Aproveita!", "Seu bairro ficou mais simples. Pronto.")),
 ("post4-grupos", feature("&check; Grupos verificados", "Acha seu grupo do bairro em segundos.", "Chega de link perdido e cinco grupos do mesmo pr&eacute;dio. No Meu Vizinho, o grupo certo &eacute; verificado e f&aacute;cil de achar.")),
 ("post5-privacidade", feature("&#128274; Privacidade", "Aqui voc&ecirc; &eacute; vizinho.<br>N&atilde;o &eacute; produto.", "A gente n&atilde;o vende seus dados e n&atilde;o usa algoritmo pra te prender. Seu bairro, do seu jeito, em ordem cronol&oacute;gica.")),
 ("post8-cta", cta("Voc&ecirc; vai esperar<br>quanto pra entrar?", "Seja um dos primeiros do seu bairro no Meu Vizinho.", "Baixar o app &rarr;")),
]


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
        for name, html in CREATIVES:
            pg.set_content(html, wait_until="networkidle")
            pg.wait_for_timeout(500)
            pg.screenshot(path=os.path.join(OUT, name + ".png"),
                          clip={"x": 0, "y": 0, "width": 1080, "height": 1350})
            print("gerado:", name)
        b.close()
    print(f"TOTAL: {len(CREATIVES)} -> {OUT}")


if __name__ == "__main__":
    main()
