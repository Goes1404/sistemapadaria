/**
 * Fidelidade, clube do pão e CRM — esqueleto.
 *
 * Casa com o módulo de WhatsApp que já existe: o canal de comunicação com o
 * cliente já está aberto, e é por ele que campanha e aviso de assinatura saem.
 *
 * Ver docs/MELHORIAS.md § 10.
 */

export interface Cliente {
  id: string
  nome: string
  /** Identificação no caixa costuma ser por um dos dois. */
  cpf?: string
  telefone?: string
  email?: string
  nascimento?: string
  /** Consentimento de contato — exigência de LGPD, não detalhe. */
  aceitaContato: boolean
  criadoEm: string
}

export interface ResumoCliente {
  clienteId: string
  totalGasto: number
  compras: number
  ticketMedio: number
  ultimaCompraEm?: string
  /** Dias desde a última compra — dispara campanha de reativação. */
  diasSemComprar: number
  produtosFavoritos: { produtoId: string; nome: string; vezes: number }[]
}

// ---------------------------------------------------------------------------
// Pontos e cashback
// ---------------------------------------------------------------------------

export type ModeloFidelidade = 'PONTOS' | 'CASHBACK' | 'CARTAO_CARIMBO'

export interface RegraFidelidade {
  modelo: ModeloFidelidade
  /** PONTOS: pontos por real gasto. CASHBACK: fração devolvida. */
  taxa: number
  /** CARTAO_CARIMBO: quantos carimbos para ganhar o brinde. */
  carimbosParaResgate?: number
  produtoBrinde?: string
  /** Saldo expira depois deste prazo; 0 = não expira. */
  validadeDias: number
  valorMinimoCompra?: number
}

export interface SaldoFidelidade {
  clienteId: string
  saldo: number
  /** Parcelas do saldo que vencem em breve — avisar antes de expirar. */
  aExpirar: { quantidade: number; em: string }[]
}

export interface MovimentoFidelidade {
  id: string
  clienteId: string
  tipo: 'ACUMULO' | 'RESGATE' | 'EXPIRACAO' | 'ESTORNO' | 'AJUSTE'
  quantidade: number
  vendaId?: string
  criadoEm: string
}

// ---------------------------------------------------------------------------
// Clube de assinatura
// ---------------------------------------------------------------------------

/**
 * Assinatura recorrente — pão diário, cesta semanal.
 *
 * Padaria é um dos poucos varejos onde assinatura funciona naturalmente,
 * porque o consumo é diário. O ganho maior não é nem a receita recorrente:
 * é a demanda conhecida com antecedência, que entra direto na pauta de
 * produção em vez de virar chute.
 */
export interface PlanoAssinatura {
  id: string
  nome: string
  itens: { produtoId: string; quantidade: number }[]
  frequencia: 'DIARIA' | 'DIAS_UTEIS' | 'SEMANAL' | 'QUINZENAL'
  /** Para frequência semanal/quinzenal: em que dias entrega. */
  diasSemana?: number[]
  valorMensal: number
  entrega: 'RETIRADA' | 'ENTREGA'
}

export interface Assinatura {
  id: string
  clienteId: string
  planoId: string
  status: 'ATIVA' | 'PAUSADA' | 'CANCELADA' | 'INADIMPLENTE'
  iniciadaEm: string
  /** Cliente viajou: pausa sem cancelar, e a produção já não conta com ele. */
  pausadaAte?: string
  proximaCobranca: string
  proximaEntrega: string
}

export interface Fidelidade {
  identificar(chave: string): Promise<Cliente | null>
  cadastrar(cliente: Omit<Cliente, 'id' | 'criadoEm'>): Promise<Cliente>
  resumo(clienteId: string): Promise<ResumoCliente>

  acumular(clienteId: string, vendaId: string, valor: number): Promise<MovimentoFidelidade>
  saldo(clienteId: string): Promise<SaldoFidelidade>
  resgatar(clienteId: string, quantidade: number, vendaId: string): Promise<{ ok: boolean; erro?: string }>

  /** Entregas previstas para a data — soma na pauta de produção do padeiro. */
  entregasPrevistas(data: string): Promise<{ assinatura: Assinatura; itens: PlanoAssinatura['itens'] }[]>

  /** Segmentos para campanha: aniversariantes, sumidos, melhores clientes. */
  segmentar(criterio: 'ANIVERSARIANTES' | 'SEM_COMPRAR_30D' | 'TOP_GASTO'): Promise<Cliente[]>
}
