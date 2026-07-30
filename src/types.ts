export type Unidade = 'KG' | 'G' | 'L' | 'ML' | 'UN'

export type StatusLote = 'ATIVO' | 'ESGOTADO' | 'VENCIDO'

export type Farol = 'VERDE' | 'AMARELO' | 'VERMELHO'

export interface Insumo {
  id: string
  nome: string
  unidade: Unidade
  estoqueMinimo: number
}

export interface Lote {
  id: string
  insumoId: string
  codigo: string
  quantidadeInicial: number
  quantidadeAtual: number
  dataValidade: string // ISO yyyy-mm-dd
  custoUnitario: number
  status: StatusLote
}

export type MotivoMovimento =
  | 'ENTRADA'
  | 'PRODUCAO'
  | 'VENDA'
  | 'PERDA'
  | 'DESCARTE'
  | 'AJUSTE'

export interface MovimentoEstoque {
  id: string
  loteId: string
  insumoId: string
  quantidade: number // negativo = saída
  motivo: MotivoMovimento
  referencia: string
  criadoEm: string // ISO datetime
}

export interface Produto {
  id: string
  nome: string
  preco: number
  porPeso: boolean
  codigoBarras?: string
}

export interface FichaTecnicaItem {
  insumoId: string
  quantidade: number
}

export interface FichaTecnica {
  id: string
  produtoId: string
  nome: string
  rendimento: number
  itens: FichaTecnicaItem[]
}

export interface Fornada {
  id: string
  fichaTecnicaId: string
  quantidadeProduzida: number
  responsavel: string
  produzidaEm: string
  consumos: { loteId: string; insumoId: string; quantidade: number }[]
}

export type Cargo = 'GERENTE' | 'PADEIRO' | 'ATENDENTE' | 'ESTOQUISTA'

export interface Colaborador {
  id: string
  nome: string
  cargo: Cargo
  pin: string
  ativo: boolean
}

export type TipoPonto = 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'

export interface RegistroPonto {
  id: string
  colaboradorId: string
  tipo: TipoPonto
  registradoEm: string
  inconsistencia?: boolean
}

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO'

export interface Pagamento {
  forma: FormaPagamento
  valor: number
}

export interface ItemVenda {
  produtoId: string
  nome: string
  quantidade: number
  precoUnitario: number
}

export interface Venda {
  id: string
  itens: ItemVenda[]
  pagamentos: Pagamento[]
  total: number
  criadaEm: string
  origem: 'PDV' | 'WHATSAPP'
}

export type MotivoCaixa = 'SANGRIA' | 'SUPRIMENTO'

export interface MovimentoCaixa {
  id: string
  motivo: MotivoCaixa
  valor: number
  observacao: string
  criadoEm: string
}

export interface Caixa {
  aberto: boolean
  operador: string
  trocoInicial: number
  abertoEm: string | null
}

export type StatusPedido =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'ABORTED'

export interface PedidoWhatsapp {
  id: string
  cliente: string
  telefone: string
  itens: ItemVenda[]
  total: number
  retirarEm: string
  status: StatusPedido
  recebidoEm: string
}
