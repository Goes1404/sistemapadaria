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

/** Cadastro fiscal do produto — exigido para emitir NFC-e. */
export interface DadosFiscais {
  ncm: string
  cfop: string
  origem: string
  /** Simples Nacional usa CSOSN. Regime normal usaria CST. */
  csosn: string
}

export interface Produto {
  id: string
  nome: string
  preco: number
  porPeso: boolean
  codigoBarras?: string
  /** Código interno usado na etiqueta da balança (EAN-13 de peso variável). */
  codigoBalanca?: string
  fiscal: DadosFiscais
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
  cpf: string
}

export type TipoPonto = 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'

/**
 * Marcação de ponto.
 *
 * Imutável por definição: correção não edita, cria um AjustePonto que aponta
 * para ela. `nsr` e `hash` sustentam a integridade da série.
 */
export interface RegistroPonto {
  readonly id: string
  readonly colaboradorId: string
  readonly tipo: TipoPonto
  readonly registradoEm: string
  /** Número Sequencial de Registro, exigido no arquivo de fiscalização. */
  readonly nsr: number
  readonly hash: string
  readonly hashAnterior: string
  inconsistencia?: boolean
}

export interface AjustePonto {
  id: string
  marcacaoOriginalId?: string
  colaboradorId: string
  tipo: 'INCLUSAO' | 'CORRECAO' | 'DESCONSIDERACAO'
  tipoPonto: TipoPonto
  valorAnterior?: string
  valorNovo: string
  justificativa: string
  ajustadoPor: string
  ajustadoEm: string
}

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO'

export interface Pagamento {
  forma: FormaPagamento
  valor: number
  /** NSU do TEF (cartão) ou txid (PIX) — a chave para conciliar. */
  nsu?: string
  bandeira?: string
}

export interface ItemVenda {
  produtoId: string
  nome: string
  quantidade: number
  precoUnitario: number
  /** Marca item que entrou por etiqueta de balança, para o operador conferir. */
  viaBalanca?: boolean
}

export interface Venda {
  id: string
  itens: ItemVenda[]
  pagamentos: Pagamento[]
  total: number
  desconto?: number
  criadaEm: string
  origem: 'PDV' | 'WHATSAPP'
  clienteId?: string
  documentoFiscalId?: string
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

// ---------------------------------------------------------------------------
// Fiscal
// ---------------------------------------------------------------------------

export type StatusDocumento =
  | 'AUTORIZADO'
  | 'EM_CONTINGENCIA'
  | 'REJEITADO'
  | 'CANCELADO'

export interface DocumentoFiscal {
  id: string
  vendaId: string
  modelo: 'NFCE_65'
  serie: number
  numero: number
  chaveAcesso: string
  protocolo?: string
  status: StatusDocumento
  emitidoEm: string
  autorizadoEm?: string
  contingencia: boolean
  motivoRejeicao?: string
  valorTotal: number
  urlConsulta: string
}

// ---------------------------------------------------------------------------
// Clientes e fidelidade
// ---------------------------------------------------------------------------

export interface Cliente {
  id: string
  nome: string
  telefone: string
  cpf?: string
  nascimento?: string
  aceitaContato: boolean
  criadoEm: string
  /** Assinatura do clube do pão, quando houver. */
  assinatura?: {
    plano: string
    itens: { produtoId: string; quantidade: number }[]
    frequencia: 'DIARIA' | 'DIAS_UTEIS' | 'SEMANAL'
    valorMensal: number
    status: 'ATIVA' | 'PAUSADA'
  }
}

export interface MovimentoFidelidade {
  id: string
  clienteId: string
  tipo: 'ACUMULO' | 'RESGATE'
  pontos: number
  vendaId?: string
  criadoEm: string
}

// ---------------------------------------------------------------------------
// Perdas de balcão
// ---------------------------------------------------------------------------

export type MotivoPerda =
  | 'SOBRA_FIM_DIA'
  | 'QUEIMADO'
  | 'QUEBRADO'
  | 'DEVOLUCAO'
  | 'CONSUMO_INTERNO'
  | 'DOACAO'

export interface PerdaBalcao {
  id: string
  produtoId: string
  quantidade: number
  motivo: MotivoPerda
  custoEstimado: number
  registradoPor: string
  registradoEm: string
  observacao?: string
}

// ---------------------------------------------------------------------------
// Auditoria e permissões
// ---------------------------------------------------------------------------

export type AcaoAuditada =
  | 'VENDA_FINALIZADA'
  | 'VENDA_CANCELADA'
  | 'DESCONTO_CONCEDIDO'
  | 'SANGRIA'
  | 'SUPRIMENTO'
  | 'CAIXA_ABERTO'
  | 'CAIXA_FECHADO'
  | 'LOTE_DESCARTADO'
  | 'ESTOQUE_ENTRADA'
  | 'PERDA_REGISTRADA'
  | 'PONTO_AJUSTADO'
  | 'FORNADA_REGISTRADA'
  | 'PEDIDO_RESPONDIDO'
  | 'NOTA_IMPORTADA'
  | 'LOGIN'

export interface EventoAuditoria {
  id: string
  quando: string
  ator: string
  acao: AcaoAuditada
  entidade: string
  detalhe: string
  /** Preenchido quando a ação exigiu alçada de supervisor. */
  autorizadoPor?: string
  terminal: 'BACKOFFICE' | 'PDV' | 'PONTO' | 'KDS'
}

// ---------------------------------------------------------------------------
// KDS
// ---------------------------------------------------------------------------

export type StatusPreparo = 'AGUARDANDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE'

export interface PedidoCozinha {
  id: string
  senha: string
  origem: 'PDV' | 'WHATSAPP'
  itens: { nome: string; quantidade: number; observacao?: string }[]
  status: StatusPreparo
  recebidoEm: string
  prometidoPara?: string
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

export interface ItemNotaFornecedor {
  codigoFornecedor: string
  descricao: string
  quantidade: number
  unidade: string
  valorUnitario: number
  /** Resolvido pelo de-para, quando já existe. */
  insumoId?: string
}

export interface NotaFornecedor {
  chaveAcesso: string
  numero: string
  emitidaEm: string
  fornecedor: { cnpj: string; razaoSocial: string }
  itens: ItemNotaFornecedor[]
  valorTotal: number
}

export interface DeParaProduto {
  codigoFornecedor: string
  insumoId: string
}
