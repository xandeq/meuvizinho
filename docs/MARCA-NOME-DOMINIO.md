# Meu Vizinho — Nome, Domínios, Marca INPI e Risco Jurídico

> Documento vivo de decisões sobre naming, registro de domínios e registro de marca.
> Criado: 2026-07-11 (sessão de pesquisa completa) · Atualizar aqui a cada novo fato/decisão.

## Visão / Decisão de produto

- **App**: Meu Vizinho — rede social de vizinhança, "o Nextdoor brasileiro" (evolução/rebrand do BairroNow).
- **Objetivo**: superar os concorrentes locais (ex.: Vizinhos App) e não ter passivo jurídico de nome.

---

## 1. Domínios — status verificado ao vivo em 2026-07-11

| Domínio | Status | Detalhe |
|---|---|---|
| `meuvizinho.com.br` | 🟡 Em **processo de liberação** (avail status 5) | NÃO está na lista do ciclo 08–15/07/2026. Deve entrar em ciclo futuro (estimativa: ~12/08). Monitorar `https://registro.br/dominio/lista-processo-liberacao.txt` (lista sai ~2 dias antes de cada ciclo). Se houver mais de um interessado, vai a disputa — aplicar rápido. |
| `meuvizinhoapp.com.br` | ✅ **Disponível** (11/07) | **Decisão: registrar já** (~R$40/ano) — pendente execução. |
| `appmeuvizinho.com.br` | ✅ Disponível | Registro defensivo opcional. |
| `meuvizinho.net.br` | ✅ Disponível | Registro defensivo opcional. |
| `meuvizinho.app.br` | ⚠️ **Registrado por terceiro** | Ederson Coimbra de Oliveira (pessoa física), registrado em **07/04/2026**, expira 04/2027, DNS KingHost. **Sinal de concorrência pelo nome — urgência em garantir as variantes.** |

- Registro é feito via Registro.br, conta ALCQU12 (credenciais em `~/.claude/.secrets.env`).
- Kit de go-live pronto: `scripts/golive-meuvizinho.sh` (DNS+vhost+SSL+301) + `docs/GO-LIVE-MEUVIZINHO.md`.

## 2. O app antigo "MeuVizinho.me" (o histórico que preocupava)

- Lançado em **maio/2020** por **Carlos Roberto de Ávila Filho**, startup de **Caxias do Sul-RS**.
- Proposta: "primeira rede social de consumo local" — achar comércios/autônomos do bairro (marketplace local, **não** era rede de comunidade estilo Nextdoor).
- Pico: **12 mil usuários** (set/2020). Cobertura: Canaltech, TudoCelular, Hoje em Dia.
- **Estado em 2026: abandonado.** Site `meuvizinho.me` é só um logo em página vazia; sem app nas lojas.
- **Marca deles no INPI: "MEUVIZINHO.ME" (processo 920114806, classe 35, dep. 09/07/2020) = PEDIDO DEFINITIVAMENTE ARQUIVADO.** Eles nunca tiveram marca registrada.
- ⚠️ Não confundir com "**Clube Meu Vizinho**" (app ativo em 2025 nas lojas): é o clube de fidelidade da rede **Meu Vizinho Supermercados** via plataforma Mercafácil — outro segmento.

**Conclusão: risco jurídico BAIXO.** Sem marca registrada + produto abandonado = sem base para nos impedir. Se voltarem à ativa, quem terá registro seremos nós.

## 3. INPI — busca radical "meu vizinho" (18 processos, consulta real 11/07/2026)

### Registros EM VIGOR (os que importam)
| Processo | Marca | Titular | Classe |
|---|---|---|---|
| 918111994 | **MEU VIZINHO** | Instituto Hermes Pardini S.A. | **NCL 35** |
| 917758250 | **MEU VIZINHO** | Instituto Hermes Pardini S.A. | **NCL 41** |
| 917766199 / 918111765 | MEU VIZINHO PARDINI | Instituto Hermes Pardini S.A. | 41 / 35 |
| 936308737 | FESTIVAL MEU VIZINHO PARDINI | Instituto Hermes Pardini S.A. | 41 |
| 916305929 | MEU VIZINHO SUPERMERCADOS | MV Comércio Atacadista e Varejista de Alimentos | 35 |

### Aguardando exame (radar)
- MEU VIZINHO ME DISSE (939186845, cls 41, dep. 18/05/2025, Daniel Alves dos Santos)
- Meu Vizinho Mini Mercados (941198111, cls 35, dep. 18/09/2025, Robson da Silva Marques)

### Arquivados (sem efeito)
- MeuVizinho ×5 (2009, H E Comércio e Serviços em Informática) — classes **09, 35, 38, 41, 42** todas arquivadas (alguém já tentou as classes de tech em 2009 e deixou morrer)
- MEUVIZINHO.ME (2020) — o app antigo, arquivado definitivamente
- MEU VIZINHO TEM ×2 (2015), MEU VIZINHO SUPERMERCADOS (2002 e 2018)

## 4. Quem é o Pardini e por que não bloqueia o app

- **Instituto Hermes Pardini S.A.** = um dos maiores laboratórios de medicina diagnóstica do Brasil (BH, fundado 1959, hoje Grupo Fleury). Vendem **exames de laboratório**.
- "Meu Vizinho Pardini" = **programa de relacionamento com a comunidade** (desde 2015: palestras de saúde, visitas a escolas/asilos) + **Festival Meu Vizinho Pardini** (evento cultural gratuito em praças de BH desde 2016, 33 edições).
- Por isso as classes: **41** (eventos culturais/educação — o festival) e **35** (publicidade/promoção institucional).
- **Princípio da especialidade**: a marca deles vale só nos segmentos registrados. Laboratório com festival de rua ≠ rede social de vizinhança. Sem risco de confusão do consumidor = sem base para bloquear as nossas classes.

### Cenários de risco
1. Registrar nas classes 9/45/42 → caminho livre; pior caso é oposição do Pardini (argumento fraco, tendência de deferimento nosso).
2. Tentar registrar na 35 ou 41 → indeferimento quase certo (art. 124, XIX LPI). **NÃO tentar.**
3. Processo por uso do nome → só se invadirmos o território deles (produzir festivais/eventos culturais sob a marca, ou vender publicidade como atividade-fim). Feed/grupos/classificados de bairro não é isso.
4. ⚠️ Radar futuro: se o app um dia promover **eventos comunitários presenciais grandes** com a marca (principalmente em BH), reavaliar com advogado antes.

## 5. Estratégia de registro de marca — DECISÃO

**Marca: MEU VIZINHO** (nominativa; avaliar mista com logo depois).

| Classe | O que cobre | Prioridade |
|---|---|---|
| **NCL 9** | Aplicativo baixável (o produto) | Inegociável |
| **NCL 45** | Serviços de rede social online (é ESTA a classe de social network, não a 42) | Inegociável |
| **NCL 42** | SaaS / plataforma web | Recomendada (backend + planos pagos estilo Premium) |
| NCL 35, 41 | — | **EVITAR** (Pardini em vigor) |

### Custos (tabela INPI vigente desde ago/2025 — pagamento ÚNICO, 1º decênio grátis desde 20/09/2025)
- Cód. **389** (e-Marcas, especificação **pré-aprovada**): **R$ 440/classe** com desconto 50% (MEI/ME/EPP/PF) · R$ 880 cheio
- Cód. 394 (especificação livre): R$ 860/classe com desconto — **não usar**, a pré-aprovada resolve
- **2 classes (9+45): R$ 880** · **3 classes (9+45+42): R$ 1.320** (com desconto)
- Titular: CNPJ 49.559.839/0001-53 (verificar enquadramento MEI/ME para o desconto de 50%)
- Só volta a pagar na prorrogação em 10 anos. Depósito via e-Marcas com login gov.br + GRU.
- Especificações pré-aprovadas sugeridas: "aplicativo de software baixável" (9), "serviços de rede social online" (45), "software como serviço [SaaS]" (42)
- Exame demora ~12–18 meses, mas **a prioridade conta da data do depósito** → depositar cedo.

## 6. Pendências / próximos passos — ONDE PARAMOS (15/07/2026)

**Status: pesquisa 100% concluída, relatório entregue, NADA registrado ainda (nem domínio nem marca). Tudo aguarda OK do Alexandre.**

Ordem de execução sugerida ao retomar:
1. Registrar `meuvizinhoapp.com.br` (~R$40/ano, Registro.br conta ALCQU12, débito) — **maior urgência** (terceiro já pegou meuvizinho.app.br em 04/2026)
2. Montar monitor diário da lista de liberação + alerta Telegram p/ `meuvizinho.com.br` (ciclo ~12/08)
3. Depositar marca MEU VIZINHO no e-Marcas: classes 9+45+42 = R$1.320 (ou 9+45 = R$880) c/ desconto 50% MEI — verificar enquadramento do CNPJ 49.559.839/0001-53 antes
4. Decidir defensivos: `appmeuvizinho.com.br`, `meuvizinho.net.br` (livres em 11/07)
5. Após ter o domínio: rodar kit go-live (`scripts/golive-meuvizinho.sh` + `docs/GO-LIVE-MEUVIZINHO.md`)

- [ ] Registrar `meuvizinhoapp.com.br` no Registro.br (~R$40) — aguardando OK do Alexandre
- [ ] Decidir registros defensivos: `appmeuvizinho.com.br`, `meuvizinho.net.br`
- [ ] Monitor automático da lista de liberação (`lista-processo-liberacao.txt`) com alerta Telegram para `meuvizinho.com.br` (~ciclo de agosto)
- [ ] Confirmar enquadramento MEI/ME/EPP do CNPJ para o desconto de 50% no INPI
- [ ] Depositar marca MEU VIZINHO no e-Marcas — decidir 2 ou 3 classes (recomendação: 3)
- [ ] (Radar) Acompanhar processos "aguardando exame" com "meu vizinho" no nome

## Histórico de decisões

| Data | Decisão/Fato |
|---|---|
| 2026-06-21 | Kit go-live meuvizinho.com.br preparado (fase 0 BairroNow) |
| 2026-07-04 | Tentativa de registro do meuvizinho.com.br — bloqueado, "em processo de liberação" |
| 2026-07-11 | Pesquisa completa: domínios, MeuVizinho.me (morto, marca arquivada), INPI (Pardini 35/41 em vigor), custos. Definidas classes 9+45(+42) e plano B `meuvizinhoapp.com.br` |
| 2026-07-16 | **`meuvizinhoapp.com.br` PEDIDO ENVIADO** (nº 31792599, titular CNPJ 49.559.839/0001-53, R$40/1 ano) — aguardando email de pagamento. Senha Registro.br rotacionada (`~/.claude/.secrets.env`). Repo GitHub `xandeq/bairronow`→`xandeq/meuvizinho`; pasta `D:\claude-code\meuvizinho`. CNPJ confirmado ME (desconto 50% INPI) |
