/**
 * BI, metas e canais de venda — esqueleto.
 *
 * O painel de hoje mostra o dia. Falta a série histórica que mostra tendência.
 * Ver docs/MELHORIAS.md § 11 e § 12.
 */

export interface SerieTemporal {
  pontos: { data: string; valor: number }[]
  total: number
  media: number
  /** Variação percentual contra o período anterior de mesmo tamanho. */
  variacaoPercentual: number
}

/**
 * Venda por faixa de horário.
 *
 * Padaria tem dois picos claros — manhã e fim de tarde. Saber o formato exato
 * da curva é o que permite dimensionar escala de equipe e horário de fornada,
 * que são as duas maiores alavancas de custo da operação.
 */
export interface VendaPorHora {
  hora: number
  faturamento: number
  pedidos: number
  ticketMedio: number
}

export interface IndicadoresPeriodo {
  periodo: { inicio: string; fim: string }
  faturamento: number
  pedidos: number
  ticketMedio: number
  itensPorPedido: number
  /** Custo da mercadoria vendida, com base na ficha técnica e no custo de lote. */
  cmv: number
  margemBruta: number
  perdaPercentual: number
  porCanal: { canal: CanalVenda; faturamento: number; participacao: number }[]
}

export interface Meta {
  id: string
  tipo: 'FATURAMENTO' | 'TICKET_MEDIO' | 'PEDIDOS' | 'PERDA_MAXIMA'
  periodo: 'DIA' | 'SEMANA' | 'MES'
  valor: number
  /** Meta por turno ou por operador, quando fizer sentido. */
  escopo?: { tipo: 'LOJA' | 'TURNO' | 'OPERADOR'; id: string }
}

export interface AcompanhamentoMeta {
  meta: Meta
  realizado: number
  percentual: number
  /** Projeção de fechamento no ritmo atual. */
  projecao: number
  situacao: 'ACIMA' | 'NO_RITMO' | 'ABAIXO'
}

export interface Analytics {
  faturamento(inicio: string, fim: string, granularidade: 'DIA' | 'SEMANA' | 'MES'): Promise<SerieTemporal>
  porHora(inicio: string, fim: string): Promise<VendaPorHora[]>
  indicadores(inicio: string, fim: string): Promise<IndicadoresPeriodo>

  /** Comparativo com o mesmo dia da semana anterior — o que faz sentido no varejo diário. */
  compararComPeriodoAnterior(inicio: string, fim: string): Promise<{
    atual: IndicadoresPeriodo
    anterior: IndicadoresPeriodo
  }>

  metas(periodo: 'DIA' | 'SEMANA' | 'MES'): Promise<AcompanhamentoMeta[]>

  /** Exportação para o contador. Não somos ERP contábil: entregamos dado limpo. */
  exportar(inicio: string, fim: string, formato: 'CSV' | 'XLSX'): Promise<Uint8Array>
}

// ---------------------------------------------------------------------------
// Canais de venda
// ---------------------------------------------------------------------------

export type CanalVenda = 'PDV' | 'WHATSAPP' | 'IFOOD' | 'RAPPI' | 'LOJA_PROPRIA' | 'ASSINATURA'

export interface PedidoCanal {
  id: string
  canal: CanalVenda
  /** Identificador do pedido no sistema do parceiro. */
  idExterno: string
  cliente: { nome: string; telefone?: string; endereco?: string }
  itens: { produtoId?: string; descricaoExterna: string; quantidade: number; valor: number }[]
  subtotal: number
  taxaEntrega: number
  /** Comissão do marketplace — precisa aparecer no resultado, não só o bruto. */
  comissao: number
  liquido: number
  status: 'NOVO' | 'ACEITO' | 'EM_PREPARO' | 'PRONTO' | 'DESPACHADO' | 'ENTREGUE' | 'CANCELADO'
  recebidoEm: string
}

/**
 * Porta dos marketplaces.
 *
 * O objetivo é os pedidos caírem no MESMO painel das encomendas de WhatsApp,
 * em vez de um tablet por aplicativo no balcão.
 *
 * O de-para de produto é o mesmo problema do XML de fornecedor: o código do
 * item no iFood não é o nosso.
 */
export interface IntegracaoCanal {
  canal: CanalVenda
  pedidosNovos(): Promise<PedidoCanal[]>
  aceitar(idExterno: string, minutosPreparo: number): Promise<void>
  recusar(idExterno: string, motivo: string): Promise<void>
  atualizarStatus(idExterno: string, status: PedidoCanal['status']): Promise<void>
  /** Pausar o canal quando faltar produto ou a cozinha estiver saturada. */
  pausarCanal(motivo: string, minutos: number): Promise<void>
  sincronizarCardapio(): Promise<{ enviados: number; erros: string[] }>
}
