/**
 * Ponto eletrônico com valor legal — esqueleto.
 *
 * O terminal atual está certo no espírito (hora do servidor, máquina de
 * estados), mas registro que vale para fiscalização tem exigências formais.
 * A Portaria 671 do Ministério do Trabalho consolidou as regras dos
 * registradores eletrônicos, incluindo a modalidade por programa (REP-P).
 *
 * Confirmar os requisitos vigentes antes de implementar — a norma muda.
 * Ver docs/MELHORIAS.md § 2.
 */

export type MetodoIdentificacao = 'PIN' | 'BIOMETRIA' | 'CRACHA_NFC' | 'QR_CODE'

/**
 * Marcação de ponto.
 *
 * Diferença central em relação ao que temos hoje: uma marcação registrada é
 * IMUTÁVEL. Correções não editam o original — criam um ajuste que aponta para
 * ele. Sem isso não há não-repúdio, e o registro perde valor probatório.
 */
export interface Marcacao {
  readonly id: string
  readonly colaboradorId: string
  readonly tipo: 'ENTRADA' | 'PAUSA_INICIO' | 'PAUSA_FIM' | 'SAIDA'
  /** Sempre o relógio do servidor. O do dispositivo é ignorado por definição. */
  readonly registradoEm: string
  readonly metodo: MetodoIdentificacao
  /** Sequencial próprio da marcação, exigido no arquivo de fiscalização. */
  readonly nsr: number
  /** Hash encadeado com a marcação anterior — detecta adulteração da série. */
  readonly hash: string
  readonly hashAnterior: string
  /** Marcada offline e transmitida depois; o horário continua sendo o do registro. */
  readonly offline: boolean
}

/**
 * Ajuste de marcação pelo gerente.
 *
 * Nunca sobrescreve. Registra quem ajustou, quando, o que mudou e por quê.
 * O relatório do colaborador mostra o original e o ajuste.
 */
export interface AjusteMarcacao {
  id: string
  /** Vazio quando o ajuste INCLUI uma marcação que faltou. */
  marcacaoOriginalId?: string
  colaboradorId: string
  tipoAjuste: 'INCLUSAO' | 'CORRECAO' | 'DESCONSIDERACAO'
  valorAnterior?: string
  valorNovo: string
  justificativa: string
  ajustadoPor: string
  ajustadoEm: string
}

/** Comprovante entregue ao trabalhador a cada marcação. */
export interface ComprovanteMarcacao {
  nsr: number
  colaborador: string
  cpf: string
  empregador: string
  cnpj: string
  registradoEm: string
  /** Para o trabalhador conferir que o registro não foi alterado depois. */
  hash: string
}

export interface JornadaEsperada {
  colaboradorId: string
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6
  entrada: string
  saida: string
  intervaloMinutos: number
  /** Minutos de tolerância que não geram nem desconto nem hora extra. */
  toleranciaMinutos: number
}

export interface ApuracaoDia {
  data: string
  colaboradorId: string
  horasTrabalhadas: number
  horasExtras: number
  atrasoMinutos: number
  /** Intervalo abaixo do mínimo legal — precisa aparecer para o gerente. */
  intervaloIrregular: boolean
  inconsistencias: string[]
}

/**
 * Porta do ponto.
 *
 * `gerarAfd` produz o arquivo que a fiscalização pede, em layout definido pela
 * norma. É o entregável que separa "registro de ponto" de "controle interno".
 */
export interface RegistroPontoLegal {
  marcar(identificacao: string, metodo: MetodoIdentificacao): Promise<{
    ok: boolean
    marcacao?: Marcacao
    comprovante?: ComprovanteMarcacao
    erro?: string
  }>

  ajustar(ajuste: Omit<AjusteMarcacao, 'id' | 'ajustadoEm'>): Promise<void>

  apurar(colaboradorId: string, inicio: string, fim: string): Promise<ApuracaoDia[]>

  /** Arquivo Fonte de Dados, no layout exigido pela fiscalização. */
  gerarAfd(inicio: string, fim: string): Promise<string>

  /** Verifica a cadeia de hashes — prova que a série não foi adulterada. */
  verificarIntegridade(inicio: string, fim: string): Promise<{ integra: boolean; quebraEm?: number }>

  /** Fecha turnos abertos há mais tempo que o limite, marcando inconsistência. */
  encerrarTurnosAbandonados(limiteHoras: number): Promise<number>
}
