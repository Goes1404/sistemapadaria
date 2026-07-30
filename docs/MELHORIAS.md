# Melhorias e aprimoramentos — o que o mercado usa

Levantamento do que sistemas de gestão para padaria e varejo alimentar entregam hoje, e que o
nosso MVP ainda não cobre. Serve para decidir **o que entra na v1 real** (a que vai para produção,
não o protótipo) e o que fica para depois.

Cada item traz impacto, esforço e o porquê. O esqueleto de código correspondente está em
[`src/futuro/`](../src/futuro) — são contratos tipados, sem implementação: quando a hora chegar,
o trabalho é preencher, não desenhar do zero.

> **Aviso sobre a parte fiscal:** as regras variam por estado e por regime tributário, e mudam com
> frequência. O que está aqui é o desenho técnico. Antes de implementar, valide com o contador da
> padaria qual documento o município/estado exige e qual o regime da empresa. Não tome este
> documento como orientação fiscal.

---

## Resumo da priorização

| # | Item | Impacto | Esforço | Quando |
|---|---|---|---|---|
| 1 | Emissão fiscal (NFC-e / SAT) | Bloqueador legal | Alto | v1 |
| 2 | Ponto conforme Portaria 671 | Bloqueador legal | Médio | v1 |
| 3 | Balança e EAN-13 de peso variável | Muito alto | Baixo | v1 |
| 4 | Entrada de estoque por XML da NF-e | Muito alto | Médio | v1 |
| 5 | TEF / pinpad e PIX com conciliação | Alto | Médio | v1 |
| 6 | Perdas de balcão (sobra do dia) | Alto | Baixo | v1 |
| 7 | Impressão térmica e KDS na cozinha | Alto | Médio | v1 |
| 8 | Auditoria e permissões granulares | Alto | Baixo | v1 |
| 9 | CMV, margem e curva ABC | Alto | Médio | v2 |
| 10 | Fidelidade, clube do pão e CRM | Médio-alto | Médio | v2 |
| ~~11~~ | ~~Delivery (iFood/Rappi) e cardápio digital~~ | — | — | **descartado pelo cliente** |
| 12 | Previsão de demanda | Médio | Alto | v3 |
| 13 | Compras: sugestão e cotação | Médio | Médio | v3 |
| ~~14~~ | ~~Multi-loja~~ | — | — | **descartado pelo cliente** |

---

## Prioridade 0 — bloqueadores legais

Sem estes dois, o sistema não pode operar como sistema de gestão de verdade. Não é "melhoria":
é condição para ligar.

### 1. Emissão de documento fiscal no PDV

Hoje o PDV emite um comprovante de mentira. Numa padaria real, cada venda ao consumidor precisa de
documento fiscal eletrônico — em geral **NFC-e** (modelo 65), autorizada pela SEFAZ do estado; em
São Paulo é comum o **SAT-CF-e** (modelo 59), com equipamento dedicado. Alguns estados aceitam os
dois; a escolha é do contador, não nossa.

O que isso arrasta:

- **Certificado digital** (A1 em arquivo, ou A3 em token) e sua guarda segura.
- **Cadastro fiscal por produto**: NCM, CFOP, origem, CEST quando aplicável, e CST ou CSOSN conforme
  o regime (Simples Nacional usa CSOSN). Isso muda o cadastro de produto que temos hoje.
- **Contingência offline.** É aqui que a arquitetura local-first do plano original prova seu valor:
  quando a SEFAZ cai — e ela cai — a venda continua, o documento é emitido em contingência e
  transmitido depois. Esse fluxo precisa ser desenhado junto com a fila de sincronização, não
  depois dela.
- **Cancelamento e inutilização** de numeração, com prazos definidos pela legislação.
- **Impressão do DANFE-NFC-e** com QR Code de consulta.

Recomendação prática: **não escrever o emissor do zero.** Existem bibliotecas e serviços que cuidam
de assinatura, schema XML, comunicação com SEFAZ e contingência. O nosso trabalho é modelar o
domínio e integrar. Escrever emissor próprio é meses de trabalho para reinventar algo que já é
commodity — e cada mudança de layout da SEFAZ vira manutenção nossa.

Esqueleto: [`src/futuro/fiscal.ts`](../src/futuro/fiscal.ts)

### 2. Ponto eletrônico conforme a legislação

Nosso terminal de ponto está correto no espírito (hora do servidor, máquina de estados), mas um
registro de ponto que vale para fiscalização do trabalho tem exigências formais. A **Portaria 671**
do Ministério do Trabalho consolidou as regras dos registradores eletrônicos, incluindo a modalidade
por programa (REP-P).

Na prática isso significa:

- **Comprovante de registro** para o trabalhador a cada marcação.
- **AFD** — o arquivo de dados que a fiscalização pede, em layout definido.
- **Integridade e não-repúdio**: os registros não podem ser alterados sem deixar rastro. Nosso ajuste
  de inconsistência pelo gerente já existe, mas precisa virar um registro *adicional* de ajuste,
  preservando o original, e não uma edição do que foi marcado.
- **Identificação do trabalhador.** PIN é conveniente mas fraco. Biometria ou crachá aumentam a
  robustez; o desenho deve permitir trocar o método sem refazer o módulo.

Esqueleto: [`src/futuro/pontoLegal.ts`](../src/futuro/pontoLegal.ts)

---

## Prioridade 1 — o que a padaria sente todo dia

### 3. Balança e EAN-13 de peso variável

Este é o item de melhor relação impacto/esforço da lista inteira, e é específico de padaria.

A balança do balcão imprime uma etiqueta com código de barras EAN-13 que **carrega o peso ou o
preço dentro do próprio código**. O prefixo `2` é reservado para uso interno da loja justamente
para isso. O operador bipa a etiqueta e o item entra com a quantidade certa, sem digitar nada.

Hoje nosso PDV abre um modal pedindo o peso — funciona na demo, mas na fila do pão às 7h da manhã
isso custa segundos por cliente e gera erro de digitação. Suportar o código de peso variável
transforma a operação.

Também vale a integração direta com a balança (Toledo, Filizola e similares usam protocolos
seriais próprios) para enviar o cadastro de produtos e preços do sistema para a balança — hoje isso
costuma ser feito à mão, duas vezes, com divergência garantida.

Esqueleto: [`src/futuro/balanca.ts`](../src/futuro/balanca.ts) — inclui o parser do EAN-13 de peso
variável, que é pequeno e autocontido.

### 4. Entrada de estoque pelo XML da NF-e do fornecedor

Hoje o estoquista digita insumo, lote, quantidade e validade um por um. Numa entrega de fornecedor
com 40 itens, isso é meia hora de trabalho e uma fonte constante de erro.

A nota fiscal do fornecedor chega como XML. Importar esse XML preenche fornecedor, produtos,
quantidades, valores e impostos de uma vez. Sobra para o humano apenas o que o XML não tem: **lote
e validade** — que continuam sendo digitados, porque são a base de todo o nosso FEFO.

Ganho secundário importante: o custo de entrada passa a vir do documento real, o que torna o CMV
(item 9) confiável em vez de estimado.

Um detalhe que costuma morder: o código do produto no fornecedor não é o nosso. É preciso uma tela
de **de-para**, que aprende a associação na primeira importação e reaproveita nas seguintes.

Esqueleto: [`src/futuro/compras.ts`](../src/futuro/compras.ts)

### 5. TEF, pinpad e PIX com conciliação

Nosso PDV registra a forma de pagamento, mas não conversa com a maquininha. Isso significa
digitar o valor duas vezes — no sistema e no pinpad — com o risco clássico de divergência.

- **TEF** integra o pinpad ao PDV: o valor vai direto, a resposta da operadora volta para a venda,
  e o comprovante sai junto.
- **PIX dinâmico**: gerar QR Code com o valor exato e receber a confirmação por webhook do PSP.
  Sem isso, alguém precisa olhar o celular para conferir se caiu — que é exatamente o problema que
  o módulo de WhatsApp veio resolver no atendimento.
- **Conciliação de recebíveis**: o que a operadora efetivamente depositou, com taxa e prazo, contra
  o que o sistema registrou. É onde padaria costuma perder dinheiro sem perceber.

Esqueleto: [`src/futuro/pagamentos.ts`](../src/futuro/pagamentos.ts)

### 6. Perdas de balcão

Nosso módulo de perdas cobre vencimento de insumo. Falta a perda que mais dói na padaria: o
**produto pronto que sobra no fim do dia**. Pão que não vendeu, salgado que passou do ponto, bolo
que fatiou e não saiu.

Registrar isso fecha o ciclo: produzi 200 pães, vendi 170, sobraram 30. Esse número alimenta a
previsão de produção e revela o desperdício real — que quase nunca está no insumo vencido, e sim
na produção mal dimensionada.

Esforço baixo, e é o dado que dá sentido a metade dos relatórios seguintes.

Esqueleto: [`src/futuro/producaoAvancada.ts`](../src/futuro/producaoAvancada.ts)

### 7. Impressão térmica e KDS

- **Impressora térmica ESC/POS** para cupom, comprovante de ponto e etiquetas de validade de
  produção — a etiqueta que vai no produto embalado com data de fabricação e validade.
- **KDS (Kitchen Display System)**: as encomendas do WhatsApp e os pedidos de cafeteria aparecem
  numa tela na cozinha, com tempo decorrido e ordem de preparo. Substitui a comanda de papel e
  torna visível quem está esperando há muito tempo.

Esqueleto: [`src/futuro/dispositivos.ts`](../src/futuro/dispositivos.ts)

### 8. Auditoria e permissões granulares

Hoje temos "gerente vê tudo, operador vê o PDV". Numa operação real isso não basta:

- **Trilha de auditoria** de quem cancelou venda, quem deu desconto, quem ajustou ponto, quem
  alterou preço, quem fez sangria. Sem isso, qualquer investigação de furto interno morre na
  primeira pergunta.
- **Permissões por ação**, não por tela: o subgerente pode dar desconto até 10%, o operador não
  pode cancelar item já registrado sem autorização, e assim por diante.
- **Autorização por supervisor** no PDV: operações sensíveis pedem PIN de quem tem alçada.

Esforço baixo se entrar cedo. Caro se for enxertado depois, porque exige tocar todos os módulos.

Esqueleto: [`src/futuro/plataforma.ts`](../src/futuro/plataforma.ts)

---

## Prioridade 2 — crescimento

### 9. CMV, margem e curva ABC

Com ficha técnica e custo de entrada reais, dá para responder as perguntas que o dono da padaria
realmente faz: quanto custa produzir um pão francês, qual a margem de cada produto, quais itens
representam 80% do faturamento, e quais ocupam prateleira sem girar.

Depende de: ficha técnica (temos), custo por lote (temos) e entrada por XML (item 4, para o custo
ser real e não estimado).

### 10. Fidelidade, clube do pão e CRM

- Identificação do cliente por CPF ou telefone no PDV.
- Pontos ou cashback.
- **Clube de assinatura** — pão diário, cesta semanal. Receita recorrente e previsível, que é ouro
  para o planejamento de produção. Padaria é um dos poucos varejos onde assinatura funciona
  naturalmente, porque o consumo é diário.
- Aniversariantes e campanhas para quem não compra há X dias.

Casa bem com o módulo de WhatsApp que já existe: o canal de comunicação já está aberto.

Esqueleto: [`src/futuro/fidelidade.ts`](../src/futuro/fidelidade.ts)

### 11. Delivery e cardápio digital — **descartado**

Decisão do cliente: a Bela Vista não trabalha com delivery. Fica registrado que **não** haverá
integração com iFood, Rappi ou qualquer marketplace, nem loja própria de entrega.

Consequências, todas positivas para o escopo:

- O canal de venda digital continua sendo só o **WhatsApp**, que já está no MVP.
- Não há comissão de marketplace a modelar, o que simplifica o financeiro: o valor da venda é o
  valor que entra.
- O KDS fica mais simples — só atende balcão e encomenda de WhatsApp, sem status de despacho
  nem entregador.

Se um dia a decisão mudar, o ponto de entrada natural é o painel de encomendas que já existe:
pedido de marketplace cairia na mesma fila, com um campo de origem a mais.

### 12. BI e metas

Ticket médio, venda por faixa de horário (padaria tem dois picos claros, manhã e fim de tarde),
produtos por horário, comparativo com o mesmo dia da semana anterior, metas por turno.

O painel que temos hoje mostra o dia. Falta a série histórica que mostra tendência.

Esqueleto: [`src/futuro/bi.ts`](../src/futuro/bi.ts)

---

## Prioridade 3 — maturidade

### 13. Previsão de demanda

Sugerir a pauta de produção a partir do histórico, com peso para dia da semana, feriado e sazonalidade.
Padaria tem padrão forte e repetitivo, o que torna a previsão viável sem nada sofisticado — uma média
móvel ponderada por dia da semana já acerta bem mais que o chute.

Só faz sentido depois de acumular alguns meses de histórico de venda **e** de perda de balcão
(item 6). Sem o dado de sobra, o modelo aprende a repetir o desperdício.

### 14. Compras: sugestão e cotação

Sugestão de pedido a partir do estoque mínimo, do consumo médio e do prazo de entrega do fornecedor.
Cotação com múltiplos fornecedores e histórico de preço pago — que também serve para perceber
aumento de custo antes de ele comer a margem.

### 15. Multi-loja — **descartado**

Decisão do cliente: a Bela Vista opera uma unidade só e não há plano de segunda loja. Fica
registrado que **não** haverá `lojaId` no modelo de dados.

Consequência a assumir de olhos abertos: se a decisão mudar, adicionar multi-loja depois exige
reescrever toda consulta do sistema. É o custo aceito em troca de um modelo mais simples agora.

---

## O que eu não recomendo agora

- **App próprio para o cliente final.** Custo alto de desenvolvimento e de aquisição de usuário.
  O WhatsApp já é o app que o cliente da padaria tem e usa — e, sem delivery, não há nem o caso
  de uso de acompanhar entrega.
- **Autoatendimento / totem.** Faz sentido em fast-food, raramente em padaria de bairro, onde o
  atendimento no balcão é parte do serviço.
- **Reconhecimento de produto por imagem no caixa.** Tecnologia interessante, custo e taxa de erro
  ainda não compensam o ganho sobre o código de barras de balança.
- **ERP contábil completo.** O contador da padaria já tem o dele. Nosso papel é exportar dados
  limpos para ele, não substituí-lo.

---

## Impacto no modelo de dados já planejado

Duas decisões precisam ser tomadas **antes da primeira migration**, porque mudá-las depois é caro:

1. ~~**Multi-loja.**~~ Descartado pelo cliente — sem `lojaId` no modelo.
2. **Campos fiscais no produto.** NCM, CFOP, origem, CEST, CST/CSOSN. Adicionar colunas depois é
   fácil; o difícil é preencher o cadastro inteiro retroativamente com o contador.
3. **Auditoria desde o primeiro dia.** Uma tabela de eventos que registra ator, ação, entidade e
   valores anterior/posterior. Enxertar auditoria em um sistema que já roda exige tocar todos os
   pontos de escrita — e você nunca tem certeza de que pegou todos.

As demais podem entrar de forma incremental sem retrabalho estrutural.
