/**
 * Produção avançada: perdas de balcão, CMV e previsão de demanda — esqueleto.
 *
 * Ver docs/MELHORIAS.md § 6, § 9 e § 13.
 */

/**
 * Perda de produto pronto.
 *
 * A perda que mais dói na padaria não é o insumo vencido: é o pão que sobrou
 * no fim do dia. Sem esse registro, metade dos relatórios seguintes não tem
 * sentido, e a previsão de demanda aprende a repetir o desperdício.
 */
export interface PerdaBalcao {
  id: string
  produtoId: string
  quantidade: number
  motivo: 'SOBRA_FIM_DIA' | 'QUEIMADO' | 'QUEBRADO' | 'DEVOLUCAO' | 'CONSUMO_INTERNO' | 'DOACAO'
  /** Custo calculado pela ficha técnica no momento do registro. */
  custoEstimado: number
  registradoPor: string
  registradoEm: string
  observacao?: string
}

export interface ResumoPerdas {
  periodo: { inicio: string; fim: string }
  porMotivo: { motivo: PerdaBalcao['motivo']; quantidade: number; custo: number }[]
  porProduto: { produtoId: string; nome: string; quantidade: number; custo: number }[]
  custoTotal: number
  /** Percentual do que foi produzido que virou perda. */
  percentualSobreProducao: number
}

// ---------------------------------------------------------------------------
// Custo e margem
// ---------------------------------------------------------------------------

/**
 * Ficha técnica com fatores de correção.
 *
 * A ficha atual assume que 1 kg comprado vira 1 kg usado. Não vira: farinha
 * tem perda de manipulação, fruta tem casca, carne perde na limpeza. Sem os
 * fatores, o CMV sai sempre otimista.
 */
export interface FichaTecnicaAvancada {
  id: string
  produtoId: string
  rendimento: number
  itens: {
    insumoId: string
    quantidadeBruta: number
    /** Rendimento após limpeza/descarte. 0,85 = aproveita 85% do que comprou. */
    fatorCorrecao: number
    /** Variação por cocção: pão perde água, arroz ganha. 1 = neutro. */
    fatorCoccao: number
  }[]
  /** Perda esperada do processo, além dos fatores por insumo. */
  quebraTecnicaPercentual: number
  /** Tempo de preparo — entra no planejamento da fornada. */
  tempoPreparoMinutos?: number
}

export interface CustoProduto {
  produtoId: string
  nome: string
  /** Custo da matéria-prima pela ficha, com os lotes efetivamente consumidos. */
  custoInsumos: number
  /** Rateio de mão de obra e energia, se a padaria quiser esse nível. */
  custoIndireto?: number
  custoTotal: number
  precoVenda: number
  margemBruta: number
  margemPercentual: number
}

export type ClasseAbc = 'A' | 'B' | 'C'

export interface ItemCurvaAbc {
  produtoId: string
  nome: string
  faturamento: number
  participacao: number
  participacaoAcumulada: number
  classe: ClasseAbc
  margemPercentual: number
}

// ---------------------------------------------------------------------------
// Previsão de demanda
// ---------------------------------------------------------------------------

/**
 * Sugestão de produção.
 *
 * Padaria tem padrão forte e repetitivo — média móvel ponderada por dia da
 * semana já acerta muito mais que o chute. Não precisa de nada sofisticado
 * para gerar valor; precisa de histórico limpo, incluindo as perdas.
 */
export interface PrevisaoProducao {
  data: string
  produtoId: string
  nome: string
  quantidadeSugerida: number
  /** Média do mesmo dia da semana nas últimas semanas. */
  baseHistorica: number
  /** Encomendas já confirmadas para a data, somadas por cima da base. */
  encomendasConfirmadas: number
  ajustes: { motivo: string; fator: number }[]
  /** Quão confiável é a sugestão, dado o volume de histórico disponível. */
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
}

export interface AnaliseProducao {
  registrarPerda(perda: Omit<PerdaBalcao, 'id' | 'custoEstimado' | 'registradoEm'>): Promise<void>
  resumoPerdas(inicio: string, fim: string): Promise<ResumoPerdas>

  custoDeProduto(produtoId: string): Promise<CustoProduto>
  curvaAbc(inicio: string, fim: string): Promise<ItemCurvaAbc[]>

  /**
   * `semanasHistorico` controla a janela. Menos que 4 semanas devolve
   * confiança BAIXA — melhor avisar do que dar número com cara de certeza.
   */
  preverProducao(data: string, semanasHistorico: number): Promise<PrevisaoProducao[]>
}
