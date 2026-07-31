import type { FichaTecnica, Lote, PerdaBalcao, Produto, Venda } from '@/types'

/**
 * Custo, margem e curva ABC.
 *
 * O custo do insumo vem do lote — média ponderada dos lotes com saldo, que é a
 * aproximação honesta enquanto não há entrada por XML da nota do fornecedor.
 * Com o XML, o custo passa a vir do documento real.
 */

export function custoMedioInsumo(lotes: Lote[], insumoId: string): number {
  const comSaldo = lotes.filter((l) => l.insumoId === insumoId && l.quantidadeAtual > 0)
  if (comSaldo.length === 0) {
    // Sem saldo, usa o último custo conhecido em vez de assumir zero.
    const ultimo = [...lotes].reverse().find((l) => l.insumoId === insumoId)
    return ultimo?.custoUnitario ?? 0
  }
  const total = comSaldo.reduce((s, l) => s + l.quantidadeAtual, 0)
  const valor = comSaldo.reduce((s, l) => s + l.quantidadeAtual * l.custoUnitario, 0)
  return total > 0 ? valor / total : 0
}

export interface CustoProduto {
  produtoId: string
  nome: string
  custoUnitario: number
  precoVenda: number
  margemBruta: number
  margemPercentual: number
  /** Quanto cada insumo pesa no custo — mostra onde mexer para melhorar margem. */
  composicao: { insumoId: string; nome: string; custo: number; participacao: number }[]
  /** Sem ficha técnica não dá para calcular. Melhor dizer do que inventar. */
  temFicha: boolean
}

export function custoDoProduto(
  produto: Produto,
  fichas: FichaTecnica[],
  lotes: Lote[],
  nomeInsumo: (id: string) => string,
): CustoProduto {
  // Revenda: o custo é o preço de compra, não uma receita.
  if (produto.custoCompra !== undefined) {
    const margemBruta = produto.preco - produto.custoCompra
    return {
      produtoId: produto.id,
      nome: produto.nome,
      custoUnitario: produto.custoCompra,
      precoVenda: produto.preco,
      margemBruta,
      margemPercentual: produto.preco > 0 ? (margemBruta / produto.preco) * 100 : 0,
      composicao: [{ insumoId: '', nome: 'Custo de compra', custo: produto.custoCompra, participacao: 100 }],
      temFicha: true,
    }
  }

  const ficha = fichas.find((f) => f.produtoId === produto.id)

  if (!ficha || ficha.rendimento <= 0) {
    return {
      produtoId: produto.id,
      nome: produto.nome,
      custoUnitario: 0,
      precoVenda: produto.preco,
      margemBruta: 0,
      margemPercentual: 0,
      composicao: [],
      temFicha: false,
    }
  }

  const composicaoBruta = ficha.itens.map((item) => ({
    insumoId: item.insumoId,
    nome: nomeInsumo(item.insumoId),
    custo: (item.quantidade * custoMedioInsumo(lotes, item.insumoId)) / ficha.rendimento,
  }))

  const custoUnitario = composicaoBruta.reduce((s, c) => s + c.custo, 0)
  const margemBruta = produto.preco - custoUnitario

  return {
    produtoId: produto.id,
    nome: produto.nome,
    custoUnitario,
    precoVenda: produto.preco,
    margemBruta,
    margemPercentual: produto.preco > 0 ? (margemBruta / produto.preco) * 100 : 0,
    composicao: composicaoBruta
      .map((c) => ({ ...c, participacao: custoUnitario > 0 ? (c.custo / custoUnitario) * 100 : 0 }))
      .sort((a, b) => b.custo - a.custo),
    temFicha: true,
  }
}

// ---------------------------------------------------------------------------
// Curva ABC
// ---------------------------------------------------------------------------

export type ClasseAbc = 'A' | 'B' | 'C'

export interface ItemCurvaAbc {
  produtoId: string
  nome: string
  quantidade: number
  faturamento: number
  participacao: number
  participacaoAcumulada: number
  classe: ClasseAbc
  margemPercentual: number
}

/**
 * Classifica por faturamento acumulado: A até 80%, B até 95%, C o resto.
 * É o corte clássico de Pareto e é o que o dono da padaria espera ver.
 */
export function curvaAbc(
  vendas: Venda[],
  produtos: Produto[],
  margemDe: (produtoId: string) => number,
): ItemCurvaAbc[] {
  const porProduto = new Map<string, { quantidade: number; faturamento: number }>()

  for (const venda of vendas) {
    for (const item of venda.itens) {
      const atual = porProduto.get(item.produtoId) ?? { quantidade: 0, faturamento: 0 }
      atual.quantidade += item.quantidade
      atual.faturamento += item.quantidade * item.precoUnitario
      porProduto.set(item.produtoId, atual)
    }
  }

  const total = [...porProduto.values()].reduce((s, v) => s + v.faturamento, 0)
  if (total === 0) return []

  let acumulado = 0
  return [...porProduto.entries()]
    .map(([produtoId, v]) => ({ produtoId, ...v }))
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((item) => {
      const participacao = (item.faturamento / total) * 100
      acumulado += participacao
      const classe: ClasseAbc = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C'
      return {
        produtoId: item.produtoId,
        nome: produtos.find((p) => p.id === item.produtoId)?.nome ?? '—',
        quantidade: item.quantidade,
        faturamento: item.faturamento,
        participacao,
        participacaoAcumulada: acumulado,
        classe,
        margemPercentual: margemDe(item.produtoId),
      }
    })
}

// ---------------------------------------------------------------------------
// Indicadores do período
// ---------------------------------------------------------------------------

export interface IndicadoresPeriodo {
  faturamento: number
  pedidos: number
  ticketMedio: number
  itensPorPedido: number
  cmv: number
  margemBruta: number
  margemPercentual: number
  custoPerdas: number
  perdaPercentual: number
  /**
   * Percentual do faturamento vindo de produtos COM ficha técnica.
   *
   * Sem isso a margem mente: produto sem ficha entra com custo zero e infla o
   * resultado. A margem só é calculada sobre a parcela coberta, e a cobertura
   * aparece junto para o gerente saber o quanto confiar no número.
   */
  coberturaFicha: number
}

export function indicadores(
  vendas: Venda[],
  perdas: PerdaBalcao[],
  custoUnitarioDe: (produtoId: string) => number,
): IndicadoresPeriodo {
  const faturamento = vendas.reduce((s, v) => s + v.total, 0)
  const itens = vendas.reduce((s, v) => s + v.itens.length, 0)

  let cmv = 0
  let faturamentoComFicha = 0

  for (const venda of vendas) {
    for (const item of venda.itens) {
      const custo = custoUnitarioDe(item.produtoId)
      if (custo <= 0) continue // sem ficha técnica: fica de fora do cálculo
      cmv += item.quantidade * custo
      faturamentoComFicha += item.quantidade * item.precoUnitario
    }
  }

  const custoPerdas = perdas.reduce((s, p) => s + p.custoEstimado, 0)
  const margemBruta = faturamentoComFicha - cmv

  return {
    faturamento,
    pedidos: vendas.length,
    ticketMedio: vendas.length ? faturamento / vendas.length : 0,
    itensPorPedido: vendas.length ? itens / vendas.length : 0,
    cmv,
    margemBruta,
    margemPercentual: faturamentoComFicha > 0 ? (margemBruta / faturamentoComFicha) * 100 : 0,
    custoPerdas,
    perdaPercentual: faturamento > 0 ? (custoPerdas / faturamento) * 100 : 0,
    coberturaFicha: faturamento > 0 ? (faturamentoComFicha / faturamento) * 100 : 0,
  }
}

/** Faturamento por faixa de horário — padaria tem dois picos claros. */
export function vendaPorHora(vendas: Venda[]): { hora: number; faturamento: number; pedidos: number }[] {
  const faixas = Array.from({ length: 24 }, (_, hora) => ({ hora, faturamento: 0, pedidos: 0 }))
  for (const v of vendas) {
    const h = new Date(v.criadaEm).getHours()
    faixas[h].faturamento += v.total
    faixas[h].pedidos += 1
  }
  return faixas
}
