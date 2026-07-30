/**
 * Pagamentos: TEF, PIX e conciliação de recebíveis — esqueleto.
 *
 * Hoje o PDV só registra a forma de pagamento; ninguém conversa com a
 * maquininha. Ver docs/MELHORIAS.md § 5.
 */

export type BandeiraCartao = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTRA'

// ---------------------------------------------------------------------------
// TEF / pinpad
// ---------------------------------------------------------------------------

export interface RequisicaoTef {
  /** Identificador da venda no nosso sistema, para amarrar as duas pontas. */
  vendaId: string
  valor: number
  modalidade: 'DEBITO' | 'CREDITO' | 'VOUCHER'
  /** Só para crédito parcelado. */
  parcelas?: number
}

export interface RespostaTef {
  aprovada: boolean
  /** NSU do TEF — a chave para conciliar e para estornar. */
  nsu?: string
  codigoAutorizacao?: string
  bandeira?: BandeiraCartao
  /** Texto que a operadora manda imprimir no comprovante do cliente. */
  comprovanteCliente?: string
  comprovanteEstabelecimento?: string
  motivoRecusa?: string
}

/**
 * Porta do TEF.
 *
 * Ponto de atenção: `pagar` pode ficar pendente se a rede cair entre a
 * aprovação na operadora e a resposta chegar ao PDV. `confirmar` e `desfazer`
 * existem por isso — é o protocolo de duas fases que evita cobrar o cliente
 * por uma venda que o sistema não registrou.
 */
export interface Tef {
  pagar(req: RequisicaoTef): Promise<RespostaTef>
  /** Confirma após a venda ter sido gravada com sucesso do nosso lado. */
  confirmar(nsu: string): Promise<void>
  /** Desfaz quando a gravação da venda falhou depois da aprovação. */
  desfazer(nsu: string): Promise<void>
  estornar(nsu: string, valor: number): Promise<RespostaTef>
  statusPinpad(): Promise<{ conectado: boolean; modelo?: string }>
}

// ---------------------------------------------------------------------------
// PIX
// ---------------------------------------------------------------------------

export interface CobrancaPix {
  id: string
  vendaId: string
  valor: number
  /** Payload do BR Code, que vira o QR na tela do PDV. */
  brCode: string
  /** Identificador da transação no PSP. */
  txid: string
  expiraEm: string
  status: 'AGUARDANDO' | 'PAGA' | 'EXPIRADA' | 'DEVOLVIDA'
}

/**
 * Porta do PIX.
 *
 * A confirmação chega por webhook do PSP, não por consulta. `aguardarPagamento`
 * existe como fallback para quando o webhook atrasa — mas a fila do caixa não
 * pode depender de polling: o operador precisa ver "pago" na tela em segundos.
 */
export interface PagamentoPix {
  criarCobranca(vendaId: string, valor: number, expiraSegundos?: number): Promise<CobrancaPix>
  consultar(txid: string): Promise<CobrancaPix>
  devolver(txid: string, valor: number, motivo: string): Promise<{ ok: boolean; erro?: string }>
  /** Assinatura do webhook precisa ser verificada antes de confiar no evento. */
  validarWebhook(corpo: string, assinatura: string): boolean
}

// ---------------------------------------------------------------------------
// Conciliação de recebíveis
// ---------------------------------------------------------------------------

export interface Recebivel {
  id: string
  /** Amarra com a venda pelo NSU (cartão) ou txid (PIX). */
  referencia: string
  bandeira?: BandeiraCartao
  valorBruto: number
  taxa: number
  valorLiquido: number
  previsaoRecebimento: string
  recebidoEm?: string
  status: 'PREVISTO' | 'RECEBIDO' | 'DIVERGENTE' | 'ESTORNADO'
}

export interface DivergenciaConciliacao {
  referencia: string
  valorEsperado: number
  valorRecebido: number
  diferenca: number
  observacao: string
}

/**
 * Conciliação: o que a operadora depositou contra o que o sistema registrou.
 * É onde padaria costuma perder dinheiro sem perceber — taxa cobrada a maior,
 * venda que não repassou, estorno silencioso.
 */
export interface ConciliacaoRecebiveis {
  importarExtrato(arquivo: Uint8Array, origem: string): Promise<Recebivel[]>
  conciliar(dataInicio: string, dataFim: string): Promise<{
    conciliados: number
    divergencias: DivergenciaConciliacao[]
  }>
  /** Quanto ainda está para entrar, por data — alimenta o fluxo de caixa. */
  aReceber(ate: string): Promise<Recebivel[]>
}
