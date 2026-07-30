# Pães e Doces Bela Vista — Sistema de Gestão

Protótipo navegável do MVP, feito para **validar o produto com o cliente antes de escrever backend**.
Tudo roda no navegador com dados fictícios em memória — não há servidor, banco nem integração real.

**Demo:** https://sistemapadaria-theta.vercel.app

> Ao recarregar a página, os dados voltam ao estado inicial. Isso é intencional: permite refazer a
> demonstração quantas vezes for preciso, sempre do mesmo ponto de partida.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de produção: `npm run build` (saída em `dist/`). O `vercel.json` trata o roteamento SPA —
sem ele, abrir `/pdv` direto ou recarregar a página daria 404.

## Telas

| Rota | Tela | Para quem |
|---|---|---|
| `/` | Login | Gerente — qualquer e-mail/senha entra |
| `/app` | Dashboard de alertas | Gerente |
| `/app/estoque` | Farol de validade, lotes, insumos, movimentações, perdas | Estoquista / gerente |
| `/app/producao` | Ficha técnica, registro de fornada, pauta do dia | Padeiro |
| `/app/whatsapp` | Painel de encomendas + simulação da conversa | Atendente |
| `/app/rh` | Equipe, registros e inconsistências de ponto | Gerente |
| `/app/financeiro` | Fluxo de caixa do dia | Gerente |
| `/pdv` | Frente de caixa (tablet) | Operador — abre sem login |
| `/ponto` | Terminal de ponto por PIN (tablet) | Toda a equipe — abre sem login |

PINs da demo: `1234` Marcos · `2345` Ana · `3456` Rafael · `4567` Juliana · `5678` Carlos.

## Roteiro sugerido de demonstração

1. **Dashboard** — ler os três alertas críticos: lotes vencendo, ponto inconsistente, encomendas
   pendentes. É a tela que justifica o sistema em 10 segundos.
2. **Estoque** → aba Lotes. Farinha tem três lotes independentes com validades diferentes. Mexer
   no campo "alerta amarelo com N dias" e ver o farol reclassificar ao vivo.
3. **Estoque** → aba **Perdas**. Quanto já foi descartado, quanto está vencido na prateleira,
   quanto está em risco, e o ranking de onde o dinheiro está parado. É o número que fecha a venda.
4. **Produção** — selecionar "Pão Francês", quantidade 100. Antes de confirmar, apontar o bloco
   *Consumo previsto*: o sistema escolheu o lote **FT-2417**, que vence primeiro, e não o mais
   antigo cadastrado. Confirmar e mostrar as baixas aplicadas.
5. Aumentar para 5000 → o botão bloqueia e avisa qual insumo falta. **Nada é baixado parcialmente**:
   ou a fornada inteira acontece, ou nenhuma.
6. **Encomendas** → aceitar um pedido e vê-lo sair da fila. Na aba *Como o cliente vê*, percorrer
   o fluxo de menus numéricos do WhatsApp.
7. **PDV** — tocar produtos, adicionar "Pão Francês (kg)" para mostrar a entrada por peso, e no
   pagamento dividir entre Dinheiro e PIX para ver o troco. Depois **Fechar caixa** e conferir a
   gaveta: o sistema aponta sobra ou falta.
8. **Terminal de ponto** — digitar `2345`. O sistema decide sozinho se é entrada, pausa ou saída
   com base no último registro.
9. **Equipe** — resolver a inconsistência do Marcos (turno aberto há mais de 14h).
10. **Financeiro** — fechar mostrando o consolidado do dia, já com a venda feita no passo 7.

## Regras de negócio que o protótipo implementa de verdade

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
- **Conferência de gaveta** — separa dinheiro físico de cartão/PIX e apura a diferença do turno.
- **Encomenda nasce pendente** — só vira confirmada após aceite humano no painel.

## Identidade e interface

- Paleta tirada da logo: **âmbar** (`bela-*`) para ação e destaque, **verde-mata** (`mata-*`) como
  base institucional e de texto.
- **Vidro líquido** (`.vidro` em `src/index.css`): base translúcida com blur e saturate, brilho
  especular acompanhando o cursor, e borda interna clara no topo para dar espessura. O fundo da
  página é uma malha de gradientes da marca — sem cor atrás, vidro não parece vidro.
- **GSAP** (`src/lib/anima.ts`): entrada em cascata a cada troca de tela, contadores animados nos
  indicadores, resposta tátil no teclado do ponto. Tudo desligado sob `prefers-reduced-motion`.

## Próxima etapa: da demo para a v1

[`docs/MELHORIAS.md`](docs/MELHORIAS.md) levanta o que sistemas de gestão para padaria entregam
hoje e que ainda não cobrimos — emissão fiscal, ponto conforme a legislação, balança com código de
peso variável, entrada de estoque por XML da NF-e, TEF e PIX, perdas de balcão, KDS, auditoria,
CMV, fidelidade e delivery — priorizado por impacto e esforço.

[`src/futuro/`](src/futuro) traz o esqueleto correspondente: contratos tipados e portas, sem
implementação e sem ligação com a interface. Ficam em `src/` porque assim o compilador confere;
como nada é importado pela aplicação, o bundle não cresce. A exceção é `balanca.ts`, cujo parser de
EAN-13 já está pronto e coberto por testes (`npm test`).

## O que **não** existe aqui

Fora de escopo nesta etapa, por decisão: backend, banco de dados, autenticação real, integração com
a API do WhatsApp, impressão fiscal, e o modo offline dos terminais. O protótipo serve para validar
fluxo e telas — a fundação técnica vem depois, com o backlog já aprovado.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · GSAP. Sem biblioteca de UI externa.
