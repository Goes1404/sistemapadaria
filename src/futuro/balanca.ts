/**
 * Balança e código de barras de peso variável — esqueleto.
 *
 * O item de melhor relação impacto/esforço da lista, e o mais específico de
 * padaria. Ver docs/MELHORIAS.md § 3.
 *
 * Diferente dos outros arquivos desta pasta, aqui há implementação de verdade:
 * o parser do EAN-13 é pequeno, autocontido e não depende de backend, então
 * já fica pronto e testável.
 */

/**
 * Como a etiqueta da balança monta os 13 dígitos.
 *
 * Não existe um layout único: cada modelo de balança é configurado pela loja.
 * Os campos abaixo descrevem o recorte, em índices baseados em 1, para bater
 * com a documentação dos fabricantes.
 *
 * Layout comum no Brasil (prefixo 2, código de 6, valor de 5):
 *
 *   2  123456  01250  8
 *   │  │       │      └─ dígito verificador
 *   │  │       └──────── valor: 1250 g  ou  R$ 12,50
 *   │  └──────────────── código interno do produto
 *   └─────────────────── prefixo de uso interno da loja
 */
export interface LayoutEtiquetaBalanca {
  /** Prefixos que marcam etiqueta interna. O padrão GS1 reserva o "2". */
  prefixos: string[]
  codigoInicio: number
  codigoFim: number
  valorInicio: number
  valorFim: number
  /** O valor embutido é peso (em gramas) ou preço (em centavos). */
  tipoValor: 'PESO_GRAMAS' | 'PRECO_CENTAVOS'
}

export const LAYOUT_PADRAO: LayoutEtiquetaBalanca = {
  prefixos: ['2'],
  codigoInicio: 2,
  codigoFim: 7,
  valorInicio: 8,
  valorFim: 12,
  tipoValor: 'PESO_GRAMAS',
}

export interface EtiquetaBalanca {
  codigoInterno: string
  /** Em quilos, quando o layout embute peso. */
  pesoKg?: number
  /** Em reais, quando o layout embute preço. */
  precoReais?: number
}

/** Dígito verificador do EAN-13, calculado sobre os 12 primeiros dígitos. */
export function digitoVerificadorEan13(doze: string): number {
  let soma = 0
  for (let i = 0; i < 12; i++) {
    // Posições ímpares (1-indexed) pesam 1; pares pesam 3.
    soma += Number(doze[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (soma % 10)) % 10
}

export function ean13Valido(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false
  return digitoVerificadorEan13(codigo.slice(0, 12)) === Number(codigo[12])
}

/**
 * Lê uma etiqueta de balança. Devolve `null` quando o código não é etiqueta
 * interna — nesse caso o PDV deve tratá-lo como código de produto comum.
 *
 * Rejeita código com dígito verificador errado: leitura suja de scanner é
 * comum, e aceitar silenciosamente vira venda com peso errado.
 */
export function lerEtiquetaBalanca(
  codigo: string,
  layout: LayoutEtiquetaBalanca = LAYOUT_PADRAO,
): EtiquetaBalanca | null {
  if (!ean13Valido(codigo)) return null
  if (!layout.prefixos.some((p) => codigo.startsWith(p))) return null

  const codigoInterno = codigo.slice(layout.codigoInicio - 1, layout.codigoFim)
  const bruto = Number(codigo.slice(layout.valorInicio - 1, layout.valorFim))

  return layout.tipoValor === 'PESO_GRAMAS'
    ? { codigoInterno, pesoKg: bruto / 1000 }
    : { codigoInterno, precoReais: bruto / 100 }
}

// ---------------------------------------------------------------------------
// Integração com o equipamento — porta, sem implementação
// ---------------------------------------------------------------------------

export interface ProdutoParaBalanca {
  codigoInterno: string
  descricao: string
  precoPorKg: number
  /** Dias de validade impressos na etiqueta a partir da data de embalagem. */
  diasValidade: number
  /** Texto de ingredientes/conservação, quando a balança imprime. */
  informacaoAdicional?: string
}

/**
 * Envio do cadastro do sistema para a balança.
 *
 * Hoje isso é feito à mão, duas vezes, e diverge. Fabricantes (Toledo, Filizola
 * e outros) usam protocolos seriais próprios — cada um vira uma implementação
 * desta porta.
 */
export interface IntegracaoBalanca {
  enviarCadastro(produtos: ProdutoParaBalanca[]): Promise<{ ok: boolean; enviados: number; erro?: string }>
  testarConexao(): Promise<boolean>
}
