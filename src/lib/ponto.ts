import type { AjustePonto, Colaborador, RegistroPonto, TipoPonto } from '@/types'
import { EMITENTE } from '@/lib/fiscal'

/**
 * Integridade da série de marcações de ponto.
 *
 * Cada marcação carrega o hash da anterior. Alterar uma marcação no meio da
 * série quebra a cadeia a partir dali, e a verificação aponta exatamente onde.
 * É isso que dá não-repúdio ao registro.
 *
 * A função de hash aqui é FNV-1a — determinística, síncrona e suficiente para
 * demonstrar o encadeamento. Na v1 use SHA-256 (Web Crypto / Node crypto): a
 * FNV não é resistente a colisão proposital e não serve para valor probatório.
 */
export function hashDemo(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function calcularHashMarcacao(
  nsr: number,
  colaboradorId: string,
  tipo: TipoPonto,
  registradoEm: string,
  hashAnterior: string,
): string {
  return hashDemo(`${nsr}|${colaboradorId}|${tipo}|${registradoEm}|${hashAnterior}`)
}

export interface QuebraIntegridade {
  nsr: number
  motivo: string
}

/** Percorre a série na ordem do NSR e confere a cadeia. */
export function verificarIntegridade(marcacoes: RegistroPonto[]): QuebraIntegridade[] {
  const ordenadas = [...marcacoes].sort((a, b) => a.nsr - b.nsr)
  const quebras: QuebraIntegridade[] = []

  for (let i = 0; i < ordenadas.length; i++) {
    const m = ordenadas[i]
    const esperado = calcularHashMarcacao(m.nsr, m.colaboradorId, m.tipo, m.registradoEm, m.hashAnterior)
    if (esperado !== m.hash) {
      quebras.push({ nsr: m.nsr, motivo: 'Conteúdo da marcação não corresponde ao hash registrado' })
    }
    if (i > 0 && m.hashAnterior !== ordenadas[i - 1].hash) {
      quebras.push({ nsr: m.nsr, motivo: 'Elo quebrado: não aponta para a marcação anterior' })
    }
  }
  return quebras
}

/** Decide qual é a próxima marcação válida, a partir da última do colaborador. */
export function proximoTipo(ultima: RegistroPonto | undefined): TipoPonto {
  if (!ultima || ultima.tipo === 'SAIDA') return 'ENTRADA'
  if (ultima.tipo === 'ENTRADA') return 'PAUSA_INICIO'
  if (ultima.tipo === 'PAUSA_INICIO') return 'PAUSA_FIM'
  return 'SAIDA'
}

export const rotuloPonto: Record<TipoPonto, string> = {
  ENTRADA: 'Entrada',
  PAUSA_INICIO: 'Início do intervalo',
  PAUSA_FIM: 'Fim do intervalo',
  SAIDA: 'Saída',
}

// ---------------------------------------------------------------------------
// AFD — arquivo para a fiscalização
// ---------------------------------------------------------------------------

function so(texto: string, tamanho: number): string {
  return texto.replace(/\D/g, '').padStart(tamanho, '0').slice(-tamanho)
}

function txt(texto: string, tamanho: number): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().padEnd(tamanho).slice(0, tamanho)
}

function dataHoraAfd(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}${p(d.getHours())}${p(d.getMinutes())}`
}

/**
 * Gera o AFD.
 *
 * O layout real é definido pela norma e tem mais tipos de registro do que os
 * três aqui. Este arquivo demonstra a estrutura — cabeçalho, marcações e
 * trailer, com NSR sequencial — e precisa ser conferido contra a portaria
 * vigente antes de valer para fiscalização.
 */
export function gerarAfd(
  marcacoes: RegistroPonto[],
  colaboradores: Colaborador[],
  inicio: string,
  fim: string,
): string {
  const cpfDe = (id: string) => colaboradores.find((c) => c.id === id)?.cpf ?? '00000000000'
  const ordenadas = [...marcacoes].sort((a, b) => a.nsr - b.nsr)

  // Tipo 1 — cabeçalho
  const cabecalho =
    so('1', 9) + '1' + so(EMITENTE.cnpj, 14) + so('', 12) +
    txt(EMITENTE.razaoSocial, 150) +
    dataHoraAfd(inicio) + dataHoraAfd(fim) + dataHoraAfd(new Date().toISOString())

  // Tipo 3 — marcação de ponto
  const linhas = ordenadas.map(
    (m) => so(String(m.nsr), 9) + '3' + dataHoraAfd(m.registradoEm) + so(cpfDe(m.colaboradorId), 12) + m.hash,
  )

  // Tipo 9 — trailer com a contagem
  const trailer = so('9'.repeat(9), 9) + '9' + so(String(ordenadas.length), 9)

  return [cabecalho, ...linhas, trailer].join('\r\n')
}

// ---------------------------------------------------------------------------
// Apuração
// ---------------------------------------------------------------------------

export interface ApuracaoDia {
  data: string
  colaboradorId: string
  entrada?: string
  saida?: string
  intervaloMinutos: number
  horasTrabalhadas: number
  extras: number
  atrasoMinutos: number
  observacoes: string[]
}

export const JORNADA_PADRAO_HORAS = 8
export const TOLERANCIA_MINUTOS = 10
export const INTERVALO_MINIMO_MINUTOS = 60

/** Apura um dia de um colaborador a partir das marcações válidas. */
export function apurarDia(
  marcacoesDoDia: RegistroPonto[],
  data: string,
  colaboradorId: string,
): ApuracaoDia {
  const ordem = [...marcacoesDoDia].sort((a, b) => a.registradoEm.localeCompare(b.registradoEm))
  const observacoes: string[] = []

  const entrada = ordem.find((m) => m.tipo === 'ENTRADA')
  const saida = [...ordem].reverse().find((m) => m.tipo === 'SAIDA')
  const pausaInicio = ordem.find((m) => m.tipo === 'PAUSA_INICIO')
  const pausaFim = ordem.find((m) => m.tipo === 'PAUSA_FIM')

  const min = (a: string, b: string) =>
    Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000))

  const intervaloMinutos =
    pausaInicio && pausaFim ? min(pausaInicio.registradoEm, pausaFim.registradoEm) : 0

  if (!entrada) observacoes.push('Sem marcação de entrada')
  if (!saida) observacoes.push('Turno não encerrado')
  if (pausaInicio && !pausaFim) observacoes.push('Intervalo iniciado e não encerrado')
  if (intervaloMinutos > 0 && intervaloMinutos < INTERVALO_MINIMO_MINUTOS) {
    observacoes.push(`Intervalo de ${intervaloMinutos} min, abaixo do mínimo de ${INTERVALO_MINIMO_MINUTOS} min`)
  }

  let horasTrabalhadas = 0
  if (entrada && saida) {
    horasTrabalhadas = (min(entrada.registradoEm, saida.registradoEm) - intervaloMinutos) / 60
  }

  const diferencaMinutos = Math.round((horasTrabalhadas - JORNADA_PADRAO_HORAS) * 60)
  const extras = diferencaMinutos > TOLERANCIA_MINUTOS ? diferencaMinutos / 60 : 0
  const atrasoMinutos = diferencaMinutos < -TOLERANCIA_MINUTOS ? Math.abs(diferencaMinutos) : 0

  return {
    data,
    colaboradorId,
    entrada: entrada?.registradoEm,
    saida: saida?.registradoEm,
    intervaloMinutos,
    horasTrabalhadas,
    extras,
    atrasoMinutos,
    observacoes,
  }
}

/** Aplica os ajustes do gerente sobre a série, sem alterar os originais. */
export function marcacoesEfetivas(
  marcacoes: RegistroPonto[],
  ajustes: AjustePonto[],
): RegistroPonto[] {
  const desconsiderados = new Set(
    ajustes.filter((a) => a.tipo === 'DESCONSIDERACAO').map((a) => a.marcacaoOriginalId),
  )
  const correcoes = new Map(
    ajustes.filter((a) => a.tipo === 'CORRECAO' && a.marcacaoOriginalId).map((a) => [a.marcacaoOriginalId!, a]),
  )

  const base = marcacoes
    .filter((m) => !desconsiderados.has(m.id))
    .map((m) => {
      const c = correcoes.get(m.id)
      return c ? { ...m, registradoEm: c.valorNovo } : m
    })

  // Inclusões viram marcações sintéticas, identificadas por NSR negativo.
  const inclusoes: RegistroPonto[] = ajustes
    .filter((a) => a.tipo === 'INCLUSAO')
    .map((a, i) => ({
      id: `inc-${a.id}`,
      colaboradorId: a.colaboradorId,
      tipo: a.tipoPonto,
      registradoEm: a.valorNovo,
      nsr: -(i + 1),
      hash: '',
      hashAnterior: '',
    }))

  return [...base, ...inclusoes]
}
