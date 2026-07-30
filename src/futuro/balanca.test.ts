import { describe, expect, it } from 'vitest'
import {
  LAYOUT_PADRAO,
  digitoVerificadorEan13,
  ean13Valido,
  lerEtiquetaBalanca,
  type LayoutEtiquetaBalanca,
} from './balanca'

/** Monta uma etiqueta válida com o dígito verificador correto. */
function etiqueta(prefixo: string, codigo: string, valor: string): string {
  const doze = prefixo + codigo + valor
  return doze + digitoVerificadorEan13(doze)
}

describe('dígito verificador EAN-13', () => {
  it('confere com exemplos conhecidos do padrão', () => {
    // 5901234123457 e 4006381333931 são EAN-13 válidos usados como exemplo.
    expect(digitoVerificadorEan13('590123412345')).toBe(7)
    expect(digitoVerificadorEan13('400638133393')).toBe(1)
  })

  it('valida e invalida código completo', () => {
    expect(ean13Valido('5901234123457')).toBe(true)
    expect(ean13Valido('5901234123450')).toBe(false)
    expect(ean13Valido('590123412345')).toBe(false)
    expect(ean13Valido('abcdefghijklm')).toBe(false)
  })
})

describe('etiqueta de balança', () => {
  it('extrai código do produto e peso em quilos', () => {
    const codigo = etiqueta('2', '123456', '01250')
    const lida = lerEtiquetaBalanca(codigo)
    expect(lida?.codigoInterno).toBe('123456')
    expect(lida?.pesoKg).toBe(1.25)
  })

  it('extrai preço quando a balança embute valor em vez de peso', () => {
    const layoutPreco: LayoutEtiquetaBalanca = { ...LAYOUT_PADRAO, tipoValor: 'PRECO_CENTAVOS' }
    const lida = lerEtiquetaBalanca(etiqueta('2', '123456', '01250'), layoutPreco)
    expect(lida?.precoReais).toBe(12.5)
    expect(lida?.pesoKg).toBeUndefined()
  })

  it('devolve null para produto comum, para o PDV tratar como código normal', () => {
    expect(lerEtiquetaBalanca('5901234123457')).toBeNull()
  })

  it('rejeita leitura suja em vez de aceitar peso errado', () => {
    const codigo = etiqueta('2', '123456', '01250')
    const corrompido = codigo.slice(0, 12) + ((Number(codigo[12]) + 1) % 10)
    expect(lerEtiquetaBalanca(corrompido)).toBeNull()
  })

  it('aceita prefixos alternativos configurados pela loja', () => {
    const layout: LayoutEtiquetaBalanca = { ...LAYOUT_PADRAO, prefixos: ['20', '21'] }
    expect(lerEtiquetaBalanca(etiqueta('20', '12345', '00500'), layout)?.pesoKg).toBe(0.5)
    expect(lerEtiquetaBalanca(etiqueta('29', '12345', '00500'), layout)).toBeNull()
  })

  it('lê peso zerado sem quebrar', () => {
    expect(lerEtiquetaBalanca(etiqueta('2', '123456', '00000'))?.pesoKg).toBe(0)
  })
})
