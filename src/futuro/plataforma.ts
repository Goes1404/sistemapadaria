/**
 * Plataforma: auditoria, permissões, multi-loja e sincronização — esqueleto.
 *
 * Esta é a camada que precisa entrar CEDO. Auditoria, permissões e multi-loja
 * são baratas quando nascem com o sistema e caras quando enxertadas depois,
 * porque exigem tocar todos os pontos de escrita.
 *
 * Ver docs/MELHORIAS.md § 8 e § 15.
 */

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export type AcaoAuditada =
  | 'VENDA_CANCELADA'
  | 'ITEM_CANCELADO'
  | 'DESCONTO_CONCEDIDO'
  | 'PRECO_ALTERADO'
  | 'SANGRIA'
  | 'SUPRIMENTO'
  | 'CAIXA_ABERTO'
  | 'CAIXA_FECHADO'
  | 'ESTOQUE_AJUSTADO'
  | 'LOTE_DESCARTADO'
  | 'PONTO_AJUSTADO'
  | 'USUARIO_CRIADO'
  | 'PERMISSAO_ALTERADA'
  | 'LOGIN'
  | 'LOGIN_FALHOU'

/**
 * Evento de auditoria.
 *
 * Sem isso, qualquer investigação de furto interno morre na primeira pergunta:
 * "quem cancelou essa venda?".
 */
export interface EventoAuditoria {
  readonly id: string
  readonly quando: string
  readonly atorId: string
  readonly atorNome: string
  readonly acao: AcaoAuditada
  readonly entidade: string
  readonly entidadeId: string
  readonly valorAnterior?: unknown
  readonly valorNovo?: unknown
  /** Quem autorizou, quando a ação exigiu alçada de supervisor. */
  readonly autorizadoPorId?: string
  readonly terminal?: string
  readonly ip?: string
}

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

/**
 * Permissão por AÇÃO, não por tela.
 *
 * "Gerente vê tudo, operador vê o PDV" não sobrevive à operação real: o
 * subgerente precisa dar desconto até certo limite, o operador não pode
 * cancelar item já registrado sem autorização.
 */
export type Permissao =
  | 'pdv.vender'
  | 'pdv.cancelar_venda'
  | 'pdv.cancelar_item'
  | 'pdv.desconto'
  | 'pdv.sangria'
  | 'pdv.abrir_caixa'
  | 'pdv.fechar_caixa'
  | 'estoque.ver'
  | 'estoque.entrada'
  | 'estoque.ajustar'
  | 'estoque.descartar'
  | 'producao.registrar_fornada'
  | 'producao.editar_ficha'
  | 'rh.ver_ponto'
  | 'rh.ajustar_ponto'
  | 'rh.gerenciar_colaboradores'
  | 'financeiro.ver'
  | 'financeiro.exportar'
  | 'admin.permissoes'
  | 'admin.auditoria'

export interface Papel {
  id: string
  nome: string
  permissoes: Permissao[]
  /** Teto de desconto sem precisar de supervisor, em percentual. */
  limiteDescontoPercentual?: number
}

/**
 * Autorização por supervisor no PDV.
 *
 * O operador tenta uma ação acima da alçada dele, e alguém com permissão
 * libera com o próprio PIN. O evento de auditoria guarda os dois.
 */
export interface PedidoAutorizacao {
  acao: Permissao
  solicitanteId: string
  contexto: Record<string, unknown>
}

export interface ControleAcesso {
  pode(usuarioId: string, permissao: Permissao): Promise<boolean>
  autorizar(pedido: PedidoAutorizacao, pinSupervisor: string): Promise<{
    ok: boolean
    autorizadoPorId?: string
    erro?: string
  }>
  papeis(): Promise<Papel[]>
}

export interface Auditoria {
  registrar(evento: Omit<EventoAuditoria, 'id' | 'quando'>): Promise<void>
  consultar(filtro: {
    inicio: string
    fim: string
    atorId?: string
    acao?: AcaoAuditada
    entidadeId?: string
  }): Promise<EventoAuditoria[]>
}

// ---------------------------------------------------------------------------
// Multi-loja
// ---------------------------------------------------------------------------

export interface Loja {
  id: string
  nome: string
  cnpj: string
  endereco: string
  /** Horário de funcionamento por dia — o bot de WhatsApp valida contra isto. */
  horarios: { diaSemana: number; abre: string; fecha: string }[]
  ativa: boolean
}

/**
 * Decisão que precisa ser tomada ANTES da primeira migration.
 *
 * Se houver qualquer perspectiva de segunda unidade, `lojaId` entra em todas
 * as tabelas desde o início, mesmo com uma loja só. Adicionar depois significa
 * reescrever toda consulta do sistema.
 */
export interface ContextoLoja {
  lojaAtual(): Loja
  lojasDoUsuario(usuarioId: string): Promise<Loja[]>
  /** Transferência de insumo entre unidades, preservando lote e validade. */
  transferir(origemId: string, destinoId: string, loteId: string, quantidade: number): Promise<void>
}

// ---------------------------------------------------------------------------
// Sincronização offline
// ---------------------------------------------------------------------------

export type StatusSincronizacao = 'PENDENTE' | 'ENVIANDO' | 'CONFIRMADA' | 'CONFLITO' | 'ERRO'

/**
 * Item da fila de sincronização do terminal.
 *
 * O protótipo é online, mas o modelo de dados já reserva `idClienteUuid` e
 * `criadoEmDispositivo` justamente para isto. `idClienteUuid` é gerado no
 * dispositivo e é único no servidor: é ele que torna o reenvio idempotente
 * quando a conexão cai entre o envio e a confirmação.
 */
export interface ItemFilaSync {
  idClienteUuid: string
  tipo: 'VENDA' | 'MARCACAO_PONTO' | 'MOVIMENTO_CAIXA' | 'PERDA'
  carga: unknown
  criadoEmDispositivo: string
  tentativas: number
  status: StatusSincronizacao
  ultimoErro?: string
}

export interface FilaSincronizacao {
  enfileirar(item: Omit<ItemFilaSync, 'tentativas' | 'status'>): Promise<void>
  sincronizar(): Promise<{ enviados: number; conflitos: ItemFilaSync[]; erros: ItemFilaSync[] }>
  pendentes(): Promise<ItemFilaSync[]>
  /**
   * Resolução de conflito.
   *
   * Venda é imutável e sempre vence — nunca se descarta uma venda já feita.
   * Estoque é o oposto: o servidor recalcula a partir dos movimentos recebidos,
   * porque o saldo local do terminal está sempre desatualizado.
   */
  resolverConflito(idClienteUuid: string, estrategia: 'MANTER_LOCAL' | 'MANTER_SERVIDOR'): Promise<void>
}
