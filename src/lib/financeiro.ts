import type {
  CustoOperacional, FormaPagamento, PerdaBalcao, Produto, Venda,
} from '@/types'

/**
 * Do faturamento ao lucro líquido.
 *
 * Margem bruta engana: uma padaria pode ter 70% de margem bruta e fechar o mês
 * no vermelho. Entre uma coisa e outra estão a taxa da maquininha, o imposto e
 * o custo fixo — e é só depois de descontar os três que o dono sabe se um
 * produto dá lucro de verdade.
 */

/**
 * Taxa efetiva por forma de recebimento.
 *
 * Valores típicos de mercado para pequeno varejo. Cada padaria negocia os seus
 * com a adquirente, então isto é configuração, não constante de negócio.
 */
export const TAXAS_PAGAMENTO: Record<FormaPagamento, number> = {
  DINHEIRO: 0,
  PIX: 0.0099,
  DEBITO: 0.0189,
  CREDITO: 0.0319,
}

/**
 * Alíquota efetiva do Simples Nacional.
 *
 * O anexo e a faixa dependem do faturamento dos últimos 12 meses e do tipo de
 * atividade. Este número é uma aproximação para a demonstração — na v1 ele vem
 * do cadastro da empresa, confirmado com o contador.
 */
export const ALIQUOTA_SIMPLES = 0.06

export const rotuloCategoria: Record<CustoOperacional['categoria'], string> = {
  PESSOAL: 'Pessoal',
  OCUPACAO: 'Ocupação',
  UTILIDADES: 'Utilidades',
  ADMINISTRATIVO: 'Administrativo',
  MANUTENCAO: 'Manutenção',
}

export const custoFixoMensal = (custos: CustoOperacional[]) =>
  custos.reduce((s, c) => s + c.valorMensal, 0)

/** Custo fixo proporcional ao número de dias analisados. */
export const custoFixoNoPeriodo = (custos: CustoOperacional[], dias: number) =>
  (custoFixoMensal(custos) / 30) * dias

/**
 * Taxa média ponderada das formas de pagamento efetivamente usadas.
 *
 * Melhor que aplicar uma taxa fixa: se o cliente paga mais no PIX, a taxa cai,
 * e o relatório reflete isso.
 */
export function taxaMediaPonderada(vendas: Venda[]): number {
  let total = 0
  let custo = 0
  for (const v of vendas) {
    for (const p of v.pagamentos) {
      total += p.valor
      custo += p.valor * TAXAS_PAGAMENTO[p.forma]
    }
  }
  return total > 0 ? custo / total : 0
}

// ---------------------------------------------------------------------------
// Resultado por produto
// ---------------------------------------------------------------------------

export interface ResultadoProduto {
  produtoId: string
  nome: string
  /** Quantidade vendida no período (unidades ou kg). */
  quantidade: number
  precoMedio: number
  receita: number
  participacaoReceita: number

  custoUnitario: number
  cmv: number
  /** Taxa de cartão/PIX atribuída pela participação na receita. */
  taxas: number
  imposto: number
  /** Custo fixo rateado pela participação na receita. */
  custoFixoRateado: number
  /** Perda de balcão deste produto, valorizada pelo custo. */
  perdas: number

  lucroBruto: number
  margemBrutaPercentual: number
  /**
   * Margem de contribuição: o que sobra depois dos custos VARIÁVEIS
   * (insumo, taxa, imposto, perda), antes do rateio do custo fixo.
   *
   * É esta — e não o lucro líquido rateado — que decide se vale manter o item
   * no cardápio. Enquanto for positiva, o produto ajuda a pagar o custo fixo:
   * tirá-lo do cardápio pioraria o resultado da padaria, não melhoraria.
   */
  margemContribuicao: number
  margemContribuicaoPercentual: number
  lucroLiquido: number
  margemLiquidaPercentual: number
  /** Quanto este produto contribui, em reais, para o lucro do período. */
  lucroPorUnidade: number

  temCusto: boolean
  origemCusto: 'FICHA' | 'REVENDA' | 'SEM_CUSTO'
}

export interface ParametrosResultado {
  vendas: Venda[]
  perdas: PerdaBalcao[]
  produtos: Produto[]
  custos: CustoOperacional[]
  dias: number
  custoUnitarioDe: (produtoId: string) => number
}

/**
 * Calcula o resultado de cada produto vendido no período.
 *
 * Rateio: taxas, imposto e custo fixo são distribuídos pela participação do
 * produto na receita. É o critério mais simples e o mais defensável sem
 * apropriação direta — e o relatório diz qual critério usou, para ninguém
 * confundir rateio com custo medido.
 */
export function resultadoPorProduto({
  vendas, perdas, produtos, custos, dias, custoUnitarioDe,
}: ParametrosResultado): ResultadoProduto[] {
  const agregado = new Map<string, { quantidade: number; receita: number }>()

  for (const venda of vendas) {
    for (const item of venda.itens) {
      const atual = agregado.get(item.produtoId) ?? { quantidade: 0, receita: 0 }
      atual.quantidade += item.quantidade
      atual.receita += item.quantidade * item.precoUnitario
      agregado.set(item.produtoId, atual)
    }
  }

  const receitaTotal = [...agregado.values()].reduce((s, v) => s + v.receita, 0)
  if (receitaTotal === 0) return []

  const taxaMedia = taxaMediaPonderada(vendas)
  const fixoPeriodo = custoFixoNoPeriodo(custos, dias)

  const perdasPorProduto = perdas.reduce<Record<string, number>>((acc, p) => {
    acc[p.produtoId] = (acc[p.produtoId] ?? 0) + p.custoEstimado
    return acc
  }, {})

  return [...agregado.entries()]
    .map(([produtoId, v]) => {
      const produto = produtos.find((p) => p.id === produtoId)
      const custoUnitario = custoUnitarioDe(produtoId)
      const participacao = v.receita / receitaTotal

      const cmv = v.quantidade * custoUnitario
      const taxas = v.receita * taxaMedia
      const imposto = v.receita * ALIQUOTA_SIMPLES
      const custoFixoRateado = fixoPeriodo * participacao
      const perdasProduto = perdasPorProduto[produtoId] ?? 0

      const lucroBruto = v.receita - cmv
      const margemContribuicao = v.receita - cmv - taxas - imposto - perdasProduto
      const lucroLiquido = margemContribuicao - custoFixoRateado

      const origemCusto: ResultadoProduto['origemCusto'] =
        custoUnitario <= 0 ? 'SEM_CUSTO' : produto?.custoCompra ? 'REVENDA' : 'FICHA'

      return {
        produtoId,
        nome: produto?.nome ?? '—',
        quantidade: v.quantidade,
        precoMedio: v.quantidade > 0 ? v.receita / v.quantidade : 0,
        receita: v.receita,
        participacaoReceita: participacao * 100,
        custoUnitario,
        cmv,
        taxas,
        imposto,
        custoFixoRateado,
        perdas: perdasProduto,
        lucroBruto,
        margemBrutaPercentual: v.receita > 0 ? (lucroBruto / v.receita) * 100 : 0,
        margemContribuicao,
        margemContribuicaoPercentual: v.receita > 0 ? (margemContribuicao / v.receita) * 100 : 0,
        lucroLiquido,
        margemLiquidaPercentual: v.receita > 0 ? (lucroLiquido / v.receita) * 100 : 0,
        lucroPorUnidade: v.quantidade > 0 ? lucroLiquido / v.quantidade : 0,
        temCusto: custoUnitario > 0,
        origemCusto,
      }
    })
    .sort((a, b) => b.lucroLiquido - a.lucroLiquido)
}

// ---------------------------------------------------------------------------
// DRE do período
// ---------------------------------------------------------------------------

export interface Dre {
  receitaBruta: number
  descontos: number
  receitaLiquida: number
  cmv: number
  lucroBruto: number
  margemBrutaPercentual: number
  taxasPagamento: number
  impostos: number
  perdas: number
  custoFixo: number
  despesasTotais: number
  lucroLiquido: number
  margemLiquidaPercentual: number
  /** Faturamento diário necessário para o resultado do período ser zero. */
  pontoEquilibrioDiario: number
  coberturaCusto: number
}

export function calcularDre(
  vendas: Venda[],
  perdas: PerdaBalcao[],
  custos: CustoOperacional[],
  dias: number,
  custoUnitarioDe: (produtoId: string) => number,
): Dre {
  const receitaBruta = vendas.reduce((s, v) => s + v.total + (v.desconto ?? 0), 0)
  const descontos = vendas.reduce((s, v) => s + (v.desconto ?? 0), 0)
  const receitaLiquida = receitaBruta - descontos

  let cmv = 0
  let receitaComCusto = 0
  for (const venda of vendas) {
    for (const item of venda.itens) {
      const custo = custoUnitarioDe(item.produtoId)
      if (custo <= 0) continue
      cmv += item.quantidade * custo
      receitaComCusto += item.quantidade * item.precoUnitario
    }
  }

  const taxasPagamento = receitaLiquida * taxaMediaPonderada(vendas)
  const impostos = receitaLiquida * ALIQUOTA_SIMPLES
  const custoPerdas = perdas.reduce((s, p) => s + p.custoEstimado, 0)
  const custoFixo = custoFixoNoPeriodo(custos, dias)

  const lucroBruto = receitaLiquida - cmv
  const despesasTotais = taxasPagamento + impostos + custoPerdas + custoFixo
  const lucroLiquido = lucroBruto - despesasTotais

  // Ponto de equilíbrio: quanto precisa vender por dia para o lucro ser zero.
  const margemContribuicao =
    receitaLiquida > 0 ? (receitaLiquida - cmv - taxasPagamento - impostos) / receitaLiquida : 0
  const equilibrioPeriodo =
    margemContribuicao > 0 ? (custoFixo + custoPerdas) / margemContribuicao : 0

  return {
    receitaBruta,
    descontos,
    receitaLiquida,
    cmv,
    lucroBruto,
    margemBrutaPercentual: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
    taxasPagamento,
    impostos,
    perdas: custoPerdas,
    custoFixo,
    despesasTotais,
    lucroLiquido,
    margemLiquidaPercentual: receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0,
    pontoEquilibrioDiario: dias > 0 ? equilibrioPeriodo / dias : 0,
    coberturaCusto: receitaLiquida > 0 ? (receitaComCusto / receitaLiquida) * 100 : 0,
  }
}

// ---------------------------------------------------------------------------
// Sazonalidade — quando cada produto vende
// ---------------------------------------------------------------------------

export const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export interface FatiaTempo {
  rotulo: string
  chave: string
  quantidade: number
  receita: number
  pedidos: number
}

/** Filtra as vendas que contêm o produto e devolve só as linhas dele. */
function linhasDoProduto(vendas: Venda[], produtoId: string) {
  const linhas: { quando: string; quantidade: number; receita: number }[] = []
  for (const venda of vendas) {
    for (const item of venda.itens) {
      if (item.produtoId !== produtoId) continue
      linhas.push({
        quando: venda.criadaEm,
        quantidade: item.quantidade,
        receita: item.quantidade * item.precoUnitario,
      })
    }
  }
  return linhas
}

export function porHoraDoProduto(vendas: Venda[], produtoId: string): FatiaTempo[] {
  const faixas: FatiaTempo[] = Array.from({ length: 24 }, (_, h) => ({
    rotulo: `${h}h`, chave: String(h), quantidade: 0, receita: 0, pedidos: 0,
  }))
  for (const l of linhasDoProduto(vendas, produtoId)) {
    const h = new Date(l.quando).getHours()
    faixas[h].quantidade += l.quantidade
    faixas[h].receita += l.receita
    faixas[h].pedidos += 1
  }
  return faixas
}

export function porDiaSemanaDoProduto(vendas: Venda[], produtoId: string): FatiaTempo[] {
  const faixas: FatiaTempo[] = NOMES_DIA.map((nome, i) => ({
    rotulo: nome, chave: String(i), quantidade: 0, receita: 0, pedidos: 0,
  }))
  for (const l of linhasDoProduto(vendas, produtoId)) {
    const d = new Date(l.quando).getDay()
    faixas[d].quantidade += l.quantidade
    faixas[d].receita += l.receita
    faixas[d].pedidos += 1
  }
  return faixas
}

export function porMesDoProduto(vendas: Venda[], produtoId: string): FatiaTempo[] {
  const mapa = new Map<string, FatiaTempo>()
  for (const l of linhasDoProduto(vendas, produtoId)) {
    const d = new Date(l.quando)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const atual = mapa.get(chave) ?? {
      chave,
      rotulo: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      quantidade: 0, receita: 0, pedidos: 0,
    }
    atual.quantidade += l.quantidade
    atual.receita += l.receita
    atual.pedidos += 1
    mapa.set(chave, atual)
  }
  return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave))
}

/** Devolve a fatia campeã, para a frase de resumo do produto. */
export function melhorFatia(fatias: FatiaTempo[]): FatiaTempo | undefined {
  const comVenda = fatias.filter((f) => f.receita > 0)
  if (comVenda.length === 0) return undefined
  return comVenda.reduce((melhor, f) => (f.receita > melhor.receita ? f : melhor))
}
