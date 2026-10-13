---
name: Meu Vizinho
description: A rede social hiperlocal do bairro brasileiro, onde confiança vem de endereço verificado
colors:
  bg: "#F8FAFC"
  fg: "#0F172A"
  muted-fg: "#64748B"
  card: "#FFFFFF"
  surface-elevated: "#FAFBFF"
  muted: "#F1F5F9"
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-light: "#EFF6FF"
  primary-mid: "#BFDBFE"
  secondary: "#059669"
  secondary-hover: "#047857"
  secondary-light: "#ECFDF5"
  accent: "#D97706"
  accent-hover: "#B45309"
  accent-light: "#FFFBEB"
  danger: "#DC2626"
  danger-hover: "#B91C1C"
  danger-light: "#FEF2F2"
  verified: "#059669"
  verified-glow: "#ECFDF5"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  2xl: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 24px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  verified-badge:
    backgroundColor: "{colors.verified-glow}"
    textColor: "{colors.verified}"
    rounded: "{rounded.xl}"
    padding: "4px 10px"
---

# Design System: Meu Vizinho

## 1. Overview

**Creative North Star: "A Varanda Verificada"**

A varanda é o limiar entre o privado e o coletivo: você reconhece quem está ali, conversa de perto, mas não é qualquer um que sobe a escada. Todo elemento de interface do Meu Vizinho vive nesse limiar — calor humano de vizinhança real, com um sinal de confiança sempre visível e nunca pedante. Não é o cadeado frio de um banco, nem o selo burocrático de um cartório: é o "ah, você mora aqui perto, pode subir" materializado em cor, forma e microcópia.

A pesquisa de concorrentes (Nextdoor, WeUp, SOSAFE) confirmou uma lacuna real: nenhum comunica confiança/verificação de forma visualmente forte. Nextdoor tem o conceito mas não uma linguagem visual marcante pra ele; WeUp não mostra nada; SOSAFE nem tem o conceito (é rede de denúncia, não de identidade verificada). O selo de verificação do Meu Vizinho — recorrente em perfil, posts e mapa — é o componente que mais diferencia o produto visualmente, não um detalhe secundário.

O sistema parte da base visual já em produção no web (paleta azul/verde/âmbar madura, sombras suaves, Outfit como fonte) em vez de recomeçar do zero — o pedido foi elevar, não reconstruir. O mobile hoje está defasado (sem Outfit, sem escala de radius, sem sombra, ícone de botão ausente) e é o alvo principal desta rodada: alinhar a identidade das duas plataformas.

Rejeita explicitamente: o visual datado e sem hierarquia do Facebook Groups/Marketplace; qualquer tom de app institucional de prefeitura (frio, burocrático); qualquer clone genérico de rede social sem identidade própria.

**Key Characteristics:**
- Confiança visível em cada superfície relevante (selo verde-esmeralda recorrente), nunca só declarada em texto
- Fotografia e avatares reais como protagonistas — nunca ilustração genérica ou ícone abstrato no lugar de uma pessoa
- Sombra suave e ambiente (elevação tipo Airbnb), nunca flat-institucional nem glassmorphism decorativo
- Outfit como única família tipográfica, web e mobile, hierarquia por peso (400→800) e escala, nunca por cor sozinha
- Paleta de 4 papéis nomeados (azul confiança, verde verificação, âmbar energia local, vermelho só-erro) — Full Palette deliberada, não minimalismo de um acento só

## 2. Colors

Paleta "Full Palette" com quatro papéis nomeados, cada um com um job específico — não é decoração, é vocabulário funcional herdado da base já em produção e formalizado aqui.

### Primary
- **Azul Confiança** (`#2563EB` / oklch(52% 0.19 258)): ação principal, navegação ativa, links. É o "pode confiar, siga em frente" — usado em CTAs primários e estado ativo de tabs.

### Secondary
- **Verde Verificação** (`#059669` / oklch(55% 0.13 162)): reservado quase exclusivamente para o sinal de verificação (selo, borda de avatar verificado, confirmações de sucesso). **Não é um verde genérico de "sucesso" de formulário — é o verde específico de "este vizinho é real".** Usar esse verde fora do contexto de verificação dilui o significado.

### Tertiary (Accent)
- **Âmbar Local** (`#D97706` / oklch(58% 0.15 55)): destaque de energia comunitária — eventos, promoções do marketplace, badges de "novo no bairro". Uso pontual, nunca em área grande.

### Neutral
- **Ardósia Texto** (`#0F172A`): texto principal.
- **Ardósia Suave** (`#64748B`): texto secundário, timestamps, metadados.
- **Névoa de Fundo** (`#F8FAFC`): fundo de tela padrão.
- **Branco Cartão** (`#FFFFFF`): fundo de card/superfície elevada.
- **Névoa Elevada** (`#FAFBFF`): superfícies que precisam se destacar sutilmente do fundo sem virar card.
- **Linha Névoa** (`#E2E8F0`) / **Linha Névoa Forte** (`#CBD5E1`): divisores e bordas, do mais sutil ao mais presente.

Dark mode já existe e é funcional no mobile (`ThemeContext`, persistido) e tem tokens espelhados no CSS web — manter a mesma relação de papéis, só recalculando lightness (ex.: fundo `#0D1117`, primary `#60A5FA` mais claro pra manter contraste AA sobre escuro).

### Named Rules
**A Regra do Verde Reservado.** Verde Verificação (`#059669`) só aparece em contexto de confiança/verificação — selo, borda de avatar, confirmação de identidade. Nunca usar esse verde pra "sucesso" genérico de formulário (toast de "salvo com sucesso" usa um feedback neutro, não o verde de verificação) — senão o selo perde força semântica.

## 3. Typography

**Display/Body Font:** Outfit (com fallback `system-ui, sans-serif`)
**Label/Mono Font:** nenhuma distinta — Outfit em todos os pesos cobre o sistema inteiro.

**Character:** Outfit é geométrica mas com cantos levemente suavizados — confiante sem ser fria, legível em telas pequenas. A mesma fonte em web e mobile é o que mais rapidamente vai unificar a percepção de marca entre as duas plataformas (hoje o mobile usa fonte de sistema, quebrando a identidade).

### Hierarchy
- **Display** (800, clamp(1.75rem,4vw,2.5rem), 1.1): títulos de tela ("Criar conta", "Seu bairro").
- **Headline** (700, 1.5rem, 1.2): títulos de seção dentro de tela (nome do bairro no header do feed).
- **Title** (600, 1.125rem, 1.3): título de card, label de botão, nome de usuário em destaque.
- **Body** (400, 1rem, 1.5; máx. 70ch): texto de post, descrição, corpo de formulário.
- **Label** (600, 0.8125rem, 1.3): metadados, timestamps, labels de campo, texto de selo de verificação.

### Named Rules
**A Regra do Peso, Não da Cor.** Hierarquia se constrói por peso e tamanho (passos ≥1.25x), nunca só trocando a cor do texto pra indicar importância — crítico pro público 40+/60+ da base de usuários (contraste de cor sozinho falha pra baixa visão).

## 4. Elevation

Sistema de sombra suave e ambiente, não flat. O CSS web já define uma escala ativa (`--shadow-xs` a `--shadow-xl`, mais `--shadow-blue`/`--shadow-emerald` coloridas para hover de botão) — a nota "flat design" do `CLAUDE.md` do projeto está desatualizada e não reflete mais o código. O mobile hoje é 100% flat (só `opacity: 0.7` no toque) e é o lado que precisa subir de nível nesta rodada, não o contrário.

### Shadow Vocabulary
- **Ambiente Baixa** (`0 1px 2px rgba(15,23,42,0.06)`): cards em repouso, inputs.
- **Ambiente Média** (`0 4px 12px rgba(15,23,42,0.08)`): cards elevados, modais, bottom sheets.
- **Ambiente Alta** (`0 12px 32px rgba(15,23,42,0.12)`): elementos flutuantes (FAB, tooltip).
- **Sombra Azul** (`0 4px 14px rgba(37,99,235,0.25)`): hover/press de botão primário — reforça o azul-confiança com profundidade, não só cor plana.
- **Sombra Verde** (`0 4px 14px rgba(5,150,105,0.25)`): hover/press de qualquer elemento de verificação.

### Named Rules
**A Regra da Elevação Unificada.** Web e mobile usam a mesma escala de sombra — se o botão primário do site tem `shadow-blue` no hover, o botão primário do app tem o equivalente nativo (`elevation`/`shadowColor` no Android). Nenhuma plataforma fica "mais achatada" que a outra por omissão.

## 5. Components

### Buttons
- **Shape:** cantos levemente arredondados (`rounded-md`, 12px) — nem pill (perde seriedade), nem reto (perde calor).
- **Primary:** fundo Azul Confiança, texto branco, overlay sutil de gradiente claro no topo (`from-white/10`), `Sombra Azul` no hover/press, `translateY(-1px)` no hover e `scale(0.97)` no press — já implementado assim no web, replicar no mobile.
- **Secondary:** mesma forma, fundo Verde Verificação — reservado pra ações relacionadas a confirmar/verificar, não é o botão secundário genérico.
- **Outline/Ghost:** borda 2px Azul Confiança, fundo transparente, preenche sutilmente no hover.
- **Ícone:** todo botão com ação clara ganha um ícone Ionicons de 18-20px antes do label (ex.: casa, mapa-pin, cadeado-aberto, seta), alinhado ao centro vertical do texto, nunca sozinho sem label em ações primárias (exceção: FAB e botões de ícone puro em toolbars).

### Verified Badge (componente assinatura)
Pílula pequena (`rounded-xl`, padding 4px 10px), fundo `Verde Verificação` a 10% de opacidade (`verified-glow` `#ECFDF5`), texto e ícone de check sólido em `Verde Verificação` cheio. Aparece: ao lado do nome no post, na borda do avatar (anel de 2px) no mapa e no perfil, no header da conversa de grupo verificado. **Esse selo nunca muda de cor por contexto** — é o único elemento 100% consistente do app, de propósito, porque é o diferencial do produto.

### Cards / Containers
- **Corner Style:** `rounded-lg` (18px) pra cards de feed/listing, `rounded-xl` (24px) pra cards maiores (hero, destaque).
- **Background:** Branco Cartão sobre Névoa de Fundo.
- **Shadow Strategy:** Ambiente Baixa em repouso, Ambiente Média em hover/foco (web) ou press (mobile).
- **Border:** nenhuma por padrão — a sombra já separa do fundo; borda só aparece em estado de erro/alerta (`Linha Névoa Forte` ou `danger`).
- **Internal Padding:** `spacing.md` (16px) padrão, `spacing.lg` (24px) em cards hero.

### Inputs / Fields
- **Style:** fundo `Névoa` (`#F1F5F9`), sem borda em repouso, `rounded-sm` (8px), altura mínima 52px (touch target generoso pro público 40+/60+).
- **Focus:** borda 2px Azul Confiança substitui o fundo neutro.
- **Error:** borda 2px `danger`, fundo `danger-light`, mensagem abaixo em `label` size, cor `danger` — nunca só a cor da borda sem texto explicando o erro (regra de acessibilidade do PRODUCT.md).

### Navigation
- **Mobile:** tab bar inferior (já corrigida na v0.1.2 — bug de abas fantasma resolvido), ícones Ionicons outline em repouso e filled quando ativo, label abaixo do ícone, cor ativa = Azul Confiança.
- **Web:** header fixo com ações à direita, sem mega-menu — hierarquia rasa, uma tarefa por tela, consistente com o Design Principle 3 do PRODUCT.md.

## 6. Do's and Don'ts

### Do:
- **Do** usar fotografia e avatares reais como protagonistas visuais — nunca ilustração genérica no lugar de uma pessoa (lição direta do redesign 2025 do Nextdoor).
- **Do** manter o selo de verificação verde-esmeralda 100% consistente em cor/forma em toda superfície onde aparece.
- **Do** levar a escala de sombra do web pro mobile — os dois lados devem parecer a mesma marca.
- **Do** usar Outfit em toda interface, web e mobile, sem exceção.
- **Do** dar touch target mínimo de 44-52px em todo elemento tocável (síndicos e público 60+ usam o app).
- **Do** usar ícone + label em botões de ação primária no mobile (pedido explícito do usuário, lacuna confirmada no scan — hoje nenhum botão mobile tem ícone).

### Don't:
- **Don't** fazer visual "Facebook Groups/Marketplace" — denso, sem hierarquia, datado (anti-referência explícita do PRODUCT.md).
- **Don't** parecer app institucional de prefeitura — frio, burocrático, sem calor humano (anti-referência explícita do PRODUCT.md).
- **Don't** usar `border-left`/`border-right` colorido como faixa decorativa em card, item de lista ou alerta.
- **Don't** usar gradiente em texto (`background-clip: text`) — ênfase é peso/tamanho, nunca gradiente decorativo.
- **Don't** usar glassmorphism decorativo fora de um propósito funcional específico.
- **Don't** usar o Verde Verificação fora de contexto de confiança/identidade — ele perde força semântica se virar "verde de sucesso genérico".
- **Don't** depender só de cor pra indicar erro/estado — sempre texto ou ícone junto (acessibilidade, público 40+/60+).
- **Don't** empilhar múltiplos CTAs de mesmo peso visual na mesma tela — uma ação primária clara por vez.
