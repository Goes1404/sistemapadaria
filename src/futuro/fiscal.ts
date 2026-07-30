/**
 * Módulo fiscal — esqueleto.
 *
 * Contratos do domínio de emissão de documento fiscal no PDV. Nada aqui é
 * implementado: são as portas que o backend (ou um provedor externo) preenche.
 *
 * Decisão de arquitetura registrada: NÃO escrever emissor próprio. Assinatura,
 * schema XML, comunicação com SEFAZ e contingência são commodity. Modelamos o
 * domínio e integramos um provedor por trás de `EmissorFiscal`.
 *
 * As regras variam por estado e por regime tributário. Validar com o contador
 * antes de implementar.
 *
 * Ver docs/MELHORIAS.md § 1.
 */

/** Modelo do documento. 65 = NFC-e, 59 = CF-e emitido por SAT. */
export type ModeloDocumento = 'NFCE_65' | 'CFE_SAT_59'

export type RegimeTributario = 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO' | 'NORMAL'

/**
 * Estados do documento. A transição para AUTORIZADO pode acontecer minutos ou
 * horas depois da venda, quando emitido em contingência — por isso o documento
 * é uma entidade própria, e não um campo da venda.
 */
export type StatusDocumento =
  | 'PENDENTE'
  | 'EM_CONTINGENCIA'
  | 'AUTORIZADO'
  | 'REJEITADO'
  | 'CANCELADO'
  | 'INUTILIZADO'

/** Dados fiscais do produto. Entram no cadastro que hoje só tem nome e preço. */
export interface DadosFiscaisProduto {
  ncm: string
  cfop: string
  /** Origem da mercadoria (nacional, importada, etc.) conforme tabela oficial. */
  origem: string
  /** Exigido apenas para mercadorias sujeitas a substituição tributária. */
  cest?: string
  /** Simples Nacional usa CSOSN; regime normal usa CST. */
  csosn?: string
  cst?: string
  aliquotaIcms?: number
  unidadeTributavel: string
}

export interface DestinatarioDocumento {
  /** Venda sem identificação é o caso normal em padaria; ambos ficam vazios. */
  cpf?: string
  cnpj?: string
  nome?: string
}

export interface ItemDocumento {
  produtoId: string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  fiscal: DadosFiscaisProduto
}

export interface DocumentoFiscal {
  id: string
  vendaId: string
  modelo: ModeloDocumento
  serie: number
  numero: number
  /** Chave de acesso de 44 dígitos, disponível após autorização. */
  chaveAcesso?: string
  protocoloAutorizacao?: string
  status: StatusDocumento
  emitidoEm: string
  autorizadoEm?: string
  /** Preenchido quando a SEFAZ rejeita — precisa chegar legível ao operador. */
  motivoRejeicao?: string
  contingencia: boolean
  itens: ItemDocumento[]
  destinatario?: DestinatarioDocumento
  /** XML autorizado, guardado pelo prazo legal de guarda de documentos. */
  xml?: string
}

export interface ConfiguracaoFiscal {
  cnpj: string
  inscricaoEstadual: string
  regime: RegimeTributario
  modeloPadrao: ModeloDocumento
  serie: number
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO'
  /**
   * O certificado nunca deve trafegar nem ser persistido pela aplicação:
   * guarde uma referência ao cofre (KMS, Vault) e resolva no momento do uso.
   */
  referenciaCertificado: string
}

export interface ResultadoEmissao {
  ok: boolean
  documento?: DocumentoFiscal
  /** Mensagem já traduzida para o operador do caixa, não o código da SEFAZ. */
  erro?: string
}

/**
 * Porta do emissor.
 *
 * `emitir` precisa ser idempotente por `vendaId`: numa reconexão após queda,
 * o terminal reenvia, e emitir duas vezes a mesma venda é problema fiscal.
 */
export interface EmissorFiscal {
  emitir(vendaId: string, itens: ItemDocumento[], destinatario?: DestinatarioDocumento): Promise<ResultadoEmissao>

  /** Cancelamento tem prazo legal contado da autorização. */
  cancelar(documentoId: string, justificativa: string): Promise<ResultadoEmissao>

  /** Inutiliza faixa de numeração que se perdeu (ex.: falha entre emissões). */
  inutilizar(serie: number, de: number, ate: number, justificativa: string): Promise<ResultadoEmissao>

  /**
   * Transmite o que foi emitido offline. Chamada pelo processo de sincronização
   * quando a conexão volta — ver o plano de resiliência do PDV.
   */
  transmitirContingencia(): Promise<ResultadoEmissao[]>

  consultarStatusServico(): Promise<{ disponivel: boolean; mensagem?: string }>
}

/** Impressão do cupom. Separada do emissor: o documento existe mesmo sem papel. */
export interface ImpressaoDocumento {
  /** DANFE-NFC-e em formato de impressora térmica. */
  gerarCupom(documento: DocumentoFiscal): Promise<Uint8Array>
  /** URL de consulta pública que vira o QR Code do cupom. */
  urlConsulta(documento: DocumentoFiscal): string
}
