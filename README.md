# Sistema de Gestão para Padarias — protótipo de validação

Protótipo navegável do MVP, feito para **validar o produto com o cliente antes de escrever backend**.
Tudo roda no navegador com dados fictícios em memória — não há servidor, banco nem integração real.

> Ao recarregar a página, os dados voltam ao estado inicial. Isso é intencional: permite refazer a
> demonstração quantas vezes for preciso, sempre do mesmo ponto de partida.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de produção: `npm run build` (saída em `dist/`, pronta para Vercel/Netlify — o `vercel.json`
já trata o roteamento SPA).

## Telas

| Rota | Tela | Para quem |
|---|---|---|
| `/` | Login | Gerente — qualquer e-mail/senha entra |
| `/app` | Dashboard de alertas | Gerente |
| `/app/estoque` | Farol de validade, lotes, insumos, movimentações | Estoquista / gerente |
| `/app/producao` | Ficha técnica, registro de fornada, pauta do dia | Padeiro |
| `/app/whatsapp` | Painel de encomendas + simulação da conversa | Atendente |
| `/app/rh` | Equipe, registros e inconsistências de ponto | Gerente |
| `/app/financeiro` | Fluxo de caixa do dia | Gerente |
| `/pdv` | Frente de caixa (tablet) | Operador — abre sem login |
| `/ponto` | Terminal de ponto por PIN (tablet) | Toda a equipe — abre sem login |

PINs da demo: `1234` Marcos · `2345` Ana · `3456` Rafael · `4567` Juliana · `5678` Carlos.

## Roteiro sugerido de demonstração

1. **Dashboard** — abrir e ler os três alertas críticos: lotes vencendo, ponto inconsistente,
   encomendas pendentes. É a tela que justifica o sistema em 10 segundos.
2. **Estoque** → aba Lotes. Mostrar que Farinha tem três lotes independentes com validades
   diferentes. Mexer no campo "alerta amarelo com N dias" e ver o farol reclassificar ao vivo.
3. **Produção** — selecionar "Pão Francês", quantidade 100. Antes de confirmar, apontar o bloco
   *Consumo previsto*: o sistema escolheu o lote **FT-2417**, que vence primeiro, e não o mais
   antigo cadastrado. Confirmar e mostrar as baixas aplicadas.
4. Aumentar a quantidade para 5000 → o botão bloqueia e avisa qual insumo falta. **Nada é baixado
   parcialmente**: ou a fornada inteira acontece, ou nenhuma.
5. **Encomendas** → aceitar um pedido e mostrar que ele sai da fila. Na aba *Como o cliente vê*,
   percorrer o fluxo de menus numéricos do WhatsApp.
6. **PDV** — bipar/tocar produtos, adicionar "Pão Francês (kg)" para mostrar a entrada por peso,
   e no pagamento dividir entre Dinheiro e PIX para ver o cálculo do troco.
7. **Terminal de ponto** — digitar `2345`. O sistema decide sozinho se é entrada, pausa ou saída
   com base no último registro.
8. **Equipe** — resolver a inconsistência do Marcos (turno aberto há mais de 14h).
9. **Financeiro** — fechar mostrando o consolidado do dia, já com a venda feita no passo 6.

## Regras de negócio que o protótipo já implementa de verdade

Não são telas estáticas — a lógica roda no cliente e é a mesma que o backend vai reproduzir:

- **FEFO** (`src/lib/fefo.ts`) — consumo sempre do lote com vencimento mais próximo, em cascata
  entre lotes quando um não basta.
- **Tudo ou nada na fornada** (`src/store.tsx`) — se faltar qualquer insumo da ficha técnica,
  a operação inteira é abortada sem baixa parcial. Espelha a transação do banco.
- **Saldo mora no lote, não no insumo** — o saldo do insumo é sempre a soma dos lotes. É o que
  torna impossível misturar saldos de lotes diferentes por acidente.
- **Farol de validade** — classificação calculada na hora a partir da data, com janela do amarelo
  configurável.
- **Máquina de estados do ponto** — o próximo registro é deduzido do último; não dá para bater
  duas entradas seguidas nem sair sem ter entrado.
- **Encomenda nasce pendente** — só vira confirmada após aceite humano no painel.

## O que **não** existe aqui

Fora de escopo nesta etapa, por decisão: backend, banco de dados, autenticação real, integração com
a API do WhatsApp, impressão fiscal, e o modo offline dos terminais. O protótipo serve para validar
fluxo e telas — a fundação técnica vem depois, com o backlog já aprovado.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router. Sem dependência de UI externa.
