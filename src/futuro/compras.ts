/**
 * Compras: entrada por XML da NF-e, de-para de produtos, cotação — esqueleto.
 *
 * Ver docs/MELHORIAS.md § 4 e § 14.
 */

export interface Fornecedor {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  telefone?: string
  /** Dias entre o pedido e a entrega — entra no cálculo de sugestão de compra. */
  prazoEntregaDias?: number
}

/** Um item como ele vem no XML do fornecedor, antes de virar lote nosso. */
export interface ItemNotaFornecedor {
  /** Código do produto no catálogo do FORNECEDOR — não é o nosso. */
  codigoFornecedor: string
  descricao: string
  ncm?: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface NotaFornecedor {
  chaveAcesso: string
  numero: number
  serie: number
  emitidaEm: string
  fornecedor: Fornecedor
  itens: ItemNotaFornecedor[]
  valorTotal: number
}

/**
 * Associação entre o código do fornecedor e o nosso insumo.
 *
 * Aprendida na primeira importação e reaproveitada nas seguintes — sem isso,
 * o ganho de tempo do XML evapora, porque o estoquista reassocia tudo toda vez.
 */
export interface DeParaProduto {
  fornecedorId: string
  codigoFornecedor: string
  insumoId: string
  /** Quantos da NOSSA unidade equivalem a 1 da unidade do fornecedor. */
  fatorConversao: number
}

/**
 * O que o humano ainda precisa preencher depois de importar o XML.
 *
 * Lote e validade nunca vêm na nota — e são exatamente a base do nosso FEFO.
 * Por isso a importação não pode ser totalmente automática: ela pré-preenche
 * e devolve o que falta.
 */
export interface PendenciaImportacao {
  itemIndice: number
  descricao: string
  precisaDePara: boolean
  precisaLote: boolean
  precisaValidade: boolean
}

export interface ResultadoImportacao {
  nota: NotaFornecedor
  pendencias: PendenciaImportacao[]
  /** Itens já resolvidos por de-para existente. */
  prontos: number
}

export interface ImportacaoNotaFornecedor {
  /** Lê o XML e resolve o que der pelo de-para já cadastrado. */
  analisar(xml: string): Promise<ResultadoImportacao>

  /**
   * Confirma a entrada, criando lote e movimento para cada item.
   * Idempotente por `chaveAcesso`: reimportar a mesma nota não duplica estoque.
   */
  confirmar(
    chaveAcesso: string,
    itens: { itemIndice: number; insumoId: string; lote: string; validade: string; fatorConversao: number }[],
  ): Promise<{ ok: boolean; lotesCriados: number; erro?: string }>

  registrarDePara(mapa: DeParaProduto): Promise<void>
}

// ---------------------------------------------------------------------------
// Sugestão de compra e cotação
// ---------------------------------------------------------------------------

export interface SugestaoCompra {
  insumoId: string
  nome: string
  saldoAtual: number
  estoqueMinimo: number
  /** Consumo diário médio observado no período analisado. */
  consumoMedioDiario: number
  /** Dias até acabar no ritmo atual. */
  diasDeCobertura: number
  quantidadeSugerida: number
  fornecedorSugerido?: Fornecedor
  urgencia: 'NORMAL' | 'ATENCAO' | 'CRITICA'
}

export interface ItemCotacao {
  fornecedorId: string
  precoUnitario: number
  prazoEntregaDias: number
  cotadoEm: string
}

export interface Cotacao {
  insumoId: string
  itens: ItemCotacao[]
  /** Menor preço já pago, para perceber aumento antes de ele comer a margem. */
  menorPrecoHistorico?: number
}

export interface PlanejamentoCompras {
  sugerir(diasCobertura: number): Promise<SugestaoCompra[]>
  cotar(insumoIds: string[]): Promise<Cotacao[]>
  historicoPreco(insumoId: string, meses: number): Promise<{ mes: string; precoMedio: number }[]>
}
