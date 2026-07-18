# Concorrentes — inventário de features e gap analysis

> Doc vivo. Atualizar sempre que pesquisar concorrente ou decidir construir/descartar um item do backlog abaixo.
> Última pesquisa: 2026-07-18.

## Por que este doc existe

Decisão: implementar o que os concorrentes têm de validado, priorizando o que reforça o
diferencial do Meu Vizinho (WhatsApp verificado + condomínio/síndico) em vez de copiar
tudo cegamente. Ver seção "Backlog priorizado" no fim.

---

## O que o Meu Vizinho já tem (baseline, 2026-07-18)

Frontend (`frontend/src/app/(main)/`): feed, marketplace, chat, condominios, groups
(posts/likes/comments/events/RSVP/**polls (enquetes)**/invite links HMAC), whatsapp
(diretório de grupos verificados), map, businesses, events, alertas, notifications,
profile, premium (Kiwify), admin.

Backend (`src/BairroNow.Api/Controllers/v1/`): Account, AdminStats, AdminVerification,
Auth, BusinessAnalytics, BusinessPhotos, **BusinessRatings** (avaliação de negócio já
existe), Businesses, Categories, Cep, Chat, Comments, **Condominiums** (só
listagem + claim de síndico — ver gap abaixo), Events, Feed, Groups, Kiwify, Likes,
Listings, Map, Moderation, Notifications, Posts, Profile, PublicProfile, PushToken,
Reports, Search, SecurityAlerts, SellerRatings, Subscription, Verification,
WhatsAppGroups.

Verificação: CEP + comprovante de residência (foto), aprovação em até 24h.
Feed: **explicitamente cronológico, sem algoritmo** — princípio de marca declarado na home
("Sem algoritmo — veja tudo do seu bairro, em ordem cronológica").

---

## Concorrentes — inventário detalhado

### 1. Vizinhos (Vizinhosapp) — `com.Vizinhosapp.vizinhos`
1.000+ installs · atualizado set/2025 · classificação 12+

- Feed da Vizinhança (posts, pedir ajuda, conhecer vizinhos)
- Alertas de segurança em tempo real, espaço dedicado + push
- "Indicações e Comércio" — marketplace de serviços/produtos locais
- Eventos e Causas — criar/participar de mutirões, cafés de vizinhança
- Verificação por comprovante de residência (exploração limitada sem verificar)
- Dados: **compartilha** infos pessoais + fotos/vídeos com terceiros (postura mais permissiva que a nossa)
- Sem badge de monetização visível

**Gap vs Meu Vizinho**: nenhum item novo — conceitualmente já coberto (feed, alertas,
marketplace, eventos). Nosso diferencial (WhatsApp + condomínio) não existe nele.

### 2. WeUp (Alphacode) — `weup.alphacode.com.br`
100+ installs · atualizado abr/2026 (**dev ativo**) · classificação 12+

- Feed local: novidades de comércio, dicas do bairro, eventos, alertas de segurança,
  **alertas de trânsito** (categoria distinta de segurança)
- "Desapego" — seção dedicada pra vender/doar/comprar itens locais
- **Upvote ("dar um up")** — ranking de relevância dos posts por voto dos vizinhos (mecanismo tipo Reddit)
- Dados: **não** compartilha com terceiros (postura igual à nossa)
- Sem monetização visível

**Gap real**: upvote/ranking de relevância — mas **conflita com o princípio de marca**
"sem algoritmo" já declarado na home. Decisão de produto, não só técnica (ver backlog).
Alertas de trânsito como categoria separada de segurança é gap pequeno e barato.

### 3. Lello para Moradores (Lello Condomínios) — ecossistema de 3 apps
**100 mil+ installs, 4,5★, 8.180 avaliações** · 3.500 prédios administrados, ~1 milhão
de moradores · apps irmãos: "Lello para Síndicos" (4,9★) e "App para Colaboradores"
(4,4★) — modelo de 3 lados (morador / síndico / porteiro-funcionário)

Features confirmadas (descrição + reviews):
- **Reserva de áreas comuns** (salão de festas, churrasqueira, etc.)
- **Comunicação direta com a portaria**
- **Boletos**: ver/baixar boleto de condomínio (feature mais usada E mais reclamada —
  bugs de "erro ao carregar boleto" frequentes nas reviews)
- **Assembleias digitais**: participar/votar remotamente
- **Correspondências**: rastreio de encomendas recebidas na portaria
- **Comunicados**: avisos oficiais do síndico/administração, compartilháveis (mas com
  bug relatado: exporta como `.bin` em vez de PDF)
- **Autorização de entrada de visitantes** — pré-autorizar acesso digitalmente
- **Livro de ocorrências**: morador registra problema vinculado ao prédio, síndico
  responde na thread (review reclama do limite de 280 caracteres, curto demais)
- **Cadastro de unidades**: membros da família (incl. menores, acesso restrito),
  veículos, autorizar acesso de inquilinos/procuradores
- **Clube Lello**: cashback/desconto até 50% em 900+ lojas parceiras (BD, não é código)
- **Comodidades**: compra in-app de seguro residencial, faxina, lavanderia
- "Tesouros do Bairro" (achado na 1ª pesquisa) é só o módulo de comércio local
  (30+ categorias) DENTRO desse app maior — não é produto separado

**Gap real e grande** — nosso `CondominiumsController` hoje só faz listagem + claim de
síndico. Zero de: reserva de área comum, boletos, assembleia digital formal, encomendas,
comunicados oficiais, autorização de visitante, livro de ocorrências, cadastro de
unidades/veículos. Ver priorização no backlog — é onde a Lello nos ameaça por
DISTRIBUIÇÃO (já está instalada em 3.500 prédios).

### 4. Nextdoor — `com.nextdoor` (referência global, não localizado BR)
10 mi+ installs · 4,6★ · 421 mil avaliações · contém anúncios · atualizado 17/jul/2026

- Alertas hiperlocais em tempo real: segurança, falta de energia, emergências, clima
- **Agregação de notícias locais** de 1.720+ publishers parceiros + threads de discussão
  sobre escola/obras/planejamento urbano
- **Posts de órgãos públicos/governo** (não só vizinhos)
- Marketplace: compra/venda + **seção "grátis"** (doação/retirada)
- **Diretório de serviços locais COM avaliações** ("honest reviews from people in your
  neighborhood") — marketplace de serviço, não só recomendação
- Grupos por interesse (não só geografia/prédio)
- Eventos: bazares, festivais, campanhas de voluntariado; negócios podem promover eventos
- **Nome real + endereço verificado obrigatório em todo o app** (mais rígido que
  "comprovante só no cadastro")
- **Resumo de conversas do bairro gerado por IA** (lançado jul/2025)
- Dados: postura BEM mais permissiva (compartilha financeiro + pessoal + 3 categorias a mais)
- Monetização: anúncios

**Gap real, mas caro/longo prazo**: agregação de notícias locais e posts de órgãos
públicos exigem parceria com prefeitura/publishers — fora de alcance no piloto. Seção
"grátis" no marketplace é barata (é só um filtro de preço=0). Grupos por interesse
(vs. só geografia/prédio) é extensão razoável dos Grupos que já existem. Resumo por IA é
diferenciador interessante, mas não é prioridade de piloto de 3 bairros.

---

## Backlog priorizado (o que realmente vale construir)

**P0 — reforça o diferencial condomínio (bate direto na distribuição da Lello)**
1. Reserva de áreas comuns
2. Comunicados oficiais do síndico (broadcast pro prédio)
3. Livro de ocorrências (morador registra, síndico responde — pode reusar o modelo de
   Comments/thread que já existe em Groups)
4. Autorização de entrada de visitantes

**P1 — barato, sem conflito de princípio**
5. Alertas de trânsito como categoria separada de Alertas de segurança (WeUp)
6. Filtro/badge "grátis" no Marketplace (Nextdoor)
7. Grupos por interesse, não só geografia/prédio (Nextdoor) — extensão do Groups existente

**P2 — decisão de produto antes de codar (não é só esforço técnico)**
8. Upvote/ranking de relevância no feed (WeUp) — **conflita com o princípio "sem
   algoritmo" da home**. Decidir: manter promessa de marca OU introduzir ranking opcional
   (ex: só dentro de Grupos, feed geral continua cronológico).
9. Assembleia digital formal com voto vinculante (Lello) — Groups já tem "enquetes"
   (polls), mas são genéricas. Formalizar como "assembleia" exigiria ata, quórum, peso de
   voto por unidade — escopo jurídico/produto maior que uma poll comum.

**P3 — caro, longo prazo, fora do piloto**
10. Boletos de condomínio (integração financeira/bancária — grande escopo, risco)
11. Cadastro de unidades/veículos/dependentes
12. Rastreio de encomendas/correspondência
13. Agregação de notícias locais / posts de órgãos públicos (Nextdoor)
14. Clube de descontos com parceiros (é BD, não código)
15. Resumo de bairro gerado por IA (Nextdoor)

---

## Fontes
- https://play.google.com/store/apps/details?id=com.Vizinhosapp.vizinhos&hl=pt_BR&gl=BR
- https://play.google.com/store/apps/details?id=weup.alphacode.com.br&hl=pt_BR&gl=BR
- https://play.google.com/store/apps/details?id=com.nextdoor&hl=pt_BR&gl=BR
- https://play.google.com/store/search?q=lello+para+moradores&c=apps&hl=pt_BR&gl=BR
- https://www.lellocondominios.com.br/app-que-conecta-vizinhos-de-predios/
- https://meuvizinho.me/ (morto/dormente, pico ~12k usuários em set/2020)
- https://play.google.com/store/apps/details?id=inovatech.mercafacil.clube.meu.vizinho (Clube Meu Vizinho/Mercafácil — colisão de nome só, categoria diferente)
