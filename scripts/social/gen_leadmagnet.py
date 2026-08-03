# -*- coding: utf-8 -*-
"""Gera o PDF do lead magnet 'Como Organizar Seu Bairro em 3 Passos' (identidade Meu Vizinho).
HTML -> PDF A4 via Playwright. Saida: frontend/public/lead-magnet/guia-organizar-bairro.pdf
(vira URL publica no deploy -> linkavel no email do Brevo).

Uso: python scripts/social/gen_leadmagnet.py
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from patchright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.path.join(REPO, "frontend", "public", "lead-magnet")
os.makedirs(OUTDIR, exist_ok=True)
OUT = os.path.join(OUTDIR, "guia-organizar-bairro.pdf")

BLUE = "#2563EB"; BLUE_D = "#1E3A8A"; BLUE_L = "#3B82F6"; INK = "#0F172A"; MUT = "#475569"
FONT = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
HOUSE = ('<svg viewBox="0 0 100 100" width="100" height="100">'
         '<path d="M50 12 L88 44 L88 88 L12 88 L12 44 Z" fill="white"/>'
         f'<rect x="41" y="60" width="18" height="28" rx="4" fill="{BLUE}"/></svg>')


def step_page(num, title, problem, action):
    return f"""
<section class="page">
  <div class="stepnum">{num}</div>
  <div class="steplabel">Passo {num} de 3</div>
  <h2>{title}</h2>
  <div class="block"><div class="btag tag-red">O problema</div><p>{problem}</p></div>
  <div class="block"><div class="btag tag-blue">O que fazer</div><p>{action}</p></div>
  <div class="foot">Meu Vizinho &bull; meuvizinhoapp.com.br</div>
</section>"""


HTML = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="{FONT}" rel="stylesheet">
<style>
  @page {{ size: A4; margin: 0; }}
  * {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  body {{ margin:0; font-family:Inter,'Segoe UI',Arial,sans-serif; color:{INK}; }}
  .page {{ width:210mm; height:297mm; padding:26mm 24mm; position:relative; page-break-after:always; overflow:hidden; }}
  .cover {{ background:linear-gradient(155deg,{BLUE_L} 0%,{BLUE} 45%,{BLUE_D} 100%); color:#fff; display:flex; flex-direction:column; }}
  .cover .circ1 {{ position:absolute; width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,.08);top:-140px;right:-120px; }}
  .logo {{ display:flex; align-items:center; gap:16px; z-index:2; }}
  .logo .ic {{ width:70px;height:70px;background:{BLUE};border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(0,0,0,.28); }}
  .logo .ic svg {{ width:44px;height:44px; }}
  .logo span {{ font-size:26px;font-weight:800; }}
  .cover h1 {{ font-size:58px; font-weight:900; line-height:1.05; letter-spacing:-1px; margin:auto 0 0; z-index:2; }}
  .cover .sub {{ font-size:24px; font-weight:500; margin-top:18px; color:rgba(255,255,255,.92); z-index:2; }}
  .cover .url {{ margin-top:26px; font-size:20px; font-weight:700; color:rgba(255,255,255,.85); z-index:2; }}
  .intro h1 {{ font-size:40px; font-weight:900; letter-spacing:-.5px; color:{BLUE_D}; }}
  .intro p {{ font-size:18px; line-height:1.7; color:{MUT}; margin-top:18px; }}
  .intro .lead {{ font-size:20px; color:{INK}; font-weight:500; }}
  .stepnum {{ font-size:180px; font-weight:900; color:{BLUE}; opacity:.12; line-height:.8; letter-spacing:-6px; }}
  .steplabel {{ font-size:16px; font-weight:700; color:{BLUE}; text-transform:uppercase; letter-spacing:2px; margin-top:-30px; }}
  h2 {{ font-size:38px; font-weight:900; letter-spacing:-.5px; margin:10px 0 26px; color:{BLUE_D}; }}
  .block {{ margin-bottom:26px; }}
  .btag {{ display:inline-block; font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; padding:6px 14px; border-radius:100px; margin-bottom:12px; }}
  .tag-red {{ background:#FEE2E2; color:#B91C1C; }}
  .tag-blue {{ background:#DBEAFE; color:{BLUE}; }}
  .block p {{ font-size:18px; line-height:1.7; color:{INK}; margin:0; }}
  .foot {{ position:absolute; bottom:20mm; left:24mm; font-size:14px; color:{MUT}; font-weight:600; }}
  .cta {{ background:linear-gradient(155deg,{BLUE_L},{BLUE_D}); color:#fff; display:flex; flex-direction:column; justify-content:center; }}
  .cta h2 {{ color:#fff; font-size:44px; }}
  .cta p {{ font-size:19px; line-height:1.7; color:rgba(255,255,255,.94); }}
  .cta .btn {{ align-self:flex-start; margin-top:30px; background:#fff; color:{BLUE}; font-size:22px; font-weight:800; padding:20px 40px; border-radius:14px; }}
</style></head><body>

<section class="page cover">
  <div class="circ1"></div>
  <div class="logo"><div class="ic">{HOUSE}</div><span>Meu Vizinho</span></div>
  <h1>Como organizar<br>seu bairro<br>em 3 passos</h1>
  <div class="sub">Um guia pr&aacute;tico pra transformar vizinhos em comunidade &mdash;<br>sem depender de algoritmo, cartaz no poste ou grupo perdido.</div>
  <div class="url">meuvizinhoapp.com.br</div>
</section>

<section class="page intro">
  <h1>Todo bairro tem uma comunidade escondida.</h1>
  <p class="lead">O problema quase nunca &eacute; falta de gente boa &mdash; &eacute; falta de organiza&ccedil;&atilde;o.</p>
  <p>A informa&ccedil;&atilde;o do bairro vive espalhada: um grupo de WhatsApp aqui, um cartaz ali, um aviso que
  ningu&eacute;m viu. O resultado? Vizinhos que moram a tr&ecirc;s ruas de dist&acirc;ncia e nunca se falaram.
  Um sof&aacute; que ia pro lixo e podia ser do vizinho. Um encanador de confian&ccedil;a que ningu&eacute;m indicou.</p>
  <p>Este guia mostra 3 passos simples pra mudar isso. Serve pra s&iacute;ndico, pra quem administra grupo,
  ou pra qualquer vizinho que s&oacute; quer facilitar a vida de todo mundo. Sem teoria &mdash; direto ao que funciona.</p>
  <div class="foot">Meu Vizinho &bull; meuvizinhoapp.com.br</div>
</section>

{step_page(1, "Centralize a comunica&ccedil;&atilde;o",
  "Cinco grupos de WhatsApp do mesmo pr&eacute;dio, cada um com metade das pessoas. Ningu&eacute;m sabe qual &eacute; o oficial, os links se perdem e os recados importantes somem no meio das figurinhas de bom dia.",
  "Escolha <b>um</b> canal principal e divulgue ele em todo lugar &mdash; elevador, portaria, garagem. Deixe claro qual &eacute; o grupo oficial e quem administra. Bairro organizado tem poucos canais, bem definidos. Menos &eacute; mais.")}

{step_page(2, "Saiba quem &eacute; vizinho de verdade",
  "Grupo aberto vira terra de ningu&eacute;m: entra vendedor de fora, golpista, gente que nem mora ali. Isso mata a confian&ccedil;a &mdash; e sem confian&ccedil;a ningu&eacute;m compartilha nada que preste.",
  "Pe&ccedil;a uma verifica&ccedil;&atilde;o simples de quem entra: um comprovante de resid&ecirc;ncia, a confirma&ccedil;&atilde;o da unidade. N&atilde;o precisa ser burocr&aacute;tico &mdash; s&oacute; o suficiente pra todo mundo saber que ali &eacute; vizinho real falando com vizinho real.")}

{step_page(3, "Crie utilidade que se repete",
  "Comunidade n&atilde;o se sustenta s&oacute; em aviso de que faltou &aacute;gua. Se o grupo s&oacute; serve pra emerg&ecirc;ncia, ele morre entre uma e outra.",
  "Incentive os usos do dia a dia: marketplace entre vizinhos, indica&ccedil;&atilde;o de servi&ccedil;o local, alerta de seguran&ccedil;a, combinado de &aacute;rea comum. Quanto mais &uacute;til, mais gente participa; quanto mais gente, mais &uacute;til. &Eacute; um ciclo que se alimenta sozinho.")}

<section class="page cta">
  <h2>E se esses 3 passos<br>fossem autom&aacute;ticos?</h2>
  <p>Organizar um bairro na m&atilde;o d&aacute; trabalho. Foi por isso que criamos o <b>Meu Vizinho</b>:
  um app que j&aacute; nasce com os tr&ecirc;s passos embutidos &mdash; grupos de WhatsApp <b>verificados</b> e
  centralizados, verifica&ccedil;&atilde;o por comprovante de resid&ecirc;ncia, e um espa&ccedil;o s&oacute; pro seu bairro
  (marketplace, alertas, condom&iacute;nio). Tudo em ordem cronol&oacute;gica, sem algoritmo decidindo o que voc&ecirc; v&ecirc;
  e sem vender os seus dados.</p>
  <p style="font-weight:700;font-size:22px;margin-top:10px">Seja um dos primeiros do seu bairro.</p>
  <div class="btn">meuvizinhoapp.com.br &rarr;</div>
</section>

</body></html>"""


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page()
        pg.set_content(HTML, wait_until="networkidle")
        pg.wait_for_timeout(600)
        pg.pdf(path=OUT, format="A4", print_background=True,
               margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        b.close()
    print("PDF gerado:", OUT)


if __name__ == "__main__":
    main()
