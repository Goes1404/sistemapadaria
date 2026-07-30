/**
 * Dispositivos da loja: impressão térmica, KDS e gaveta — esqueleto.
 *
 * Ver docs/MELHORIAS.md § 7.
 */

// ---------------------------------------------------------------------------
// Impressão térmica (ESC/POS)
// ---------------------------------------------------------------------------

export type TipoImpressao =
  | 'CUPOM_FISCAL'
  | 'COMPROVANTE_PAGAMENTO'
  | 'COMPROVANTE_PONTO'
  | 'ETIQUETA_VALIDADE'
  | 'PEDIDO_COZINHA'
  | 'FECHAMENTO_CAIXA'

export interface Impressora {
  id: string
  nome: string
  /** Onde ela está — define o que é impresso nela. */
  local: 'CAIXA' | 'COZINHA' | 'BALCAO' | 'ESCRITORIO'
  conexao: 'USB' | 'REDE' | 'SERIAL' | 'BLUETOOTH'
  endereco?: string
  colunas: 32 | 42 | 48
}

/**
 * Etiqueta de produção.
 *
 * Vai no produto embalado, com fabricação e validade. Além de exigência
 * sanitária, é o que permite rastrear um lote de produto pronto — o
 * equivalente, na saída, do controle de lote que já fazemos na entrada.
 */
export interface EtiquetaValidade {
  produto: string
  fabricadoEm: string
  validoAte: string
  lote: string
  /** Padaria que embala precisa declarar ingredientes e alergênicos. */
  ingredientes?: string
  alergenicos?: string
  conservacao?: string
  pesoLiquido?: string
}

export interface ServicoImpressao {
  imprimir(impressoraId: string, tipo: TipoImpressao, dados: unknown): Promise<{ ok: boolean; erro?: string }>
  imprimirEtiquetas(impressoraId: string, etiquetas: EtiquetaValidade[]): Promise<{ ok: boolean; impressas: number }>
  abrirGaveta(impressoraId: string): Promise<void>
  status(impressoraId: string): Promise<{ online: boolean; semPapel: boolean; tampaAberta: boolean }>
}

// ---------------------------------------------------------------------------
// KDS — Kitchen Display System
// ---------------------------------------------------------------------------

/** Sem delivery, o ciclo termina na entrega ao cliente no balcão. */
export type StatusPreparo = 'AGUARDANDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO'

/**
 * Pedido na tela da cozinha.
 *
 * Substitui a comanda de papel e — o ponto principal — torna visível quem está
 * esperando há muito tempo. Papel não tem cronômetro.
 */
export interface PedidoCozinha {
  id: string
  /** Número curto que o cliente ouve ser chamado. */
  senha: string
  origem: 'PDV' | 'WHATSAPP' | 'MESA'
  itens: {
    produtoId: string
    nome: string
    quantidade: number
    observacao?: string
    status: StatusPreparo
  }[]
  status: StatusPreparo
  recebidoEm: string
  iniciadoEm?: string
  prontoEm?: string
  /** Compromisso de horário — encomenda marcada para as 17h. */
  prometidoPara?: string
}

export interface AlertaKds {
  pedidoId: string
  senha: string
  minutosEsperando: number
  nivel: 'ATENCAO' | 'ATRASADO'
}

export interface Kds {
  fila(local: string): Promise<PedidoCozinha[]>
  atualizarStatus(pedidoId: string, status: StatusPreparo): Promise<void>
  atualizarItem(pedidoId: string, indice: number, status: StatusPreparo): Promise<void>

  /** Pedidos passando do tempo — é o que justifica a tela existir. */
  alertas(limiteMinutos: number): Promise<AlertaKds[]>

  /** Tempo médio de preparo por produto, para calibrar a promessa ao cliente. */
  tempoMedioPreparo(inicio: string, fim: string): Promise<{ produtoId: string; minutos: number }[]>
}
