import type { Farol, Lote } from '@/types'

/** Dias de antecedência que disparam o alerta amarelo. Configurável no backoffice. */
export const JANELA_AMARELO = 3

export function diasParaVencer(dataValidade: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const validade = new Date(`${dataValidade}T00:00:00`)
  return Math.round((validade.getTime() - hoje.getTime()) / 86_400_000)
}

export function classificarFarol(dataValidade: string, janela = JANELA_AMARELO): Farol {
  const dias = diasParaVencer(dataValidade)
  if (dias <= 0) return 'VERMELHO'
  if (dias <= janela) return 'AMARELO'
  return 'VERDE'
}

export interface ConsumoLote {
  loteId: string
  codigo: string
  insumoId: string
  quantidade: number
  dataValidade: string
}

export interface ResultadoFefo {
  ok: boolean
  consumos: ConsumoLote[]
  faltando: number
}

/**
 * Seleciona lotes pela política FEFO (First Expired, First Out).
 *
 * Ordena por validade crescente e consome em cascata. Se o saldo total não
 * cobre a quantidade pedida, devolve `ok: false` sem consumir nada — o mesmo
 * comportamento "tudo ou nada" que a transação do backend terá.
 */
export function selecionarFefo(
  lotes: Lote[],
  insumoId: string,
  quantidade: number,
): ResultadoFefo {
  const candidatos = lotes
    .filter((l) => l.insumoId === insumoId && l.status === 'ATIVO' && l.quantidadeAtual > 0)
    .sort((a, b) => a.dataValidade.localeCompare(b.dataValidade))

  const consumos: ConsumoLote[] = []
  let restante = quantidade

  for (const lote of candidatos) {
    if (restante <= 0.0000001) break
    const usar = Math.min(lote.quantidadeAtual, restante)
    consumos.push({
      loteId: lote.id,
      codigo: lote.codigo,
      insumoId: lote.insumoId,
      quantidade: usar,
      dataValidade: lote.dataValidade,
    })
    restante -= usar
  }

  if (restante > 0.0000001) {
    return { ok: false, consumos: [], faltando: restante }
  }
  return { ok: true, consumos, faltando: 0 }
}

export function saldoDoInsumo(lotes: Lote[], insumoId: string): number {
  return lotes
    .filter((l) => l.insumoId === insumoId && l.status !== 'VENCIDO')
    .reduce((soma, l) => soma + l.quantidadeAtual, 0)
}
