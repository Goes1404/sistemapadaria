import type { DeParaProduto, ItemNotaFornecedor, NotaFornecedor } from '@/types'

/**
 * Leitura do XML da NF-e do fornecedor.
 *
 * Usa DOMParser do próprio navegador — sem dependência. O parser é real: lê a
 * estrutura de uma NF-e de verdade. O que é simulado na demo é a origem do
 * arquivo (um exemplo embutido em vez de upload do e-mail do fornecedor).
 *
 * O XML não traz lote nem validade. Eles continuam sendo digitados, porque são
 * a base do FEFO — por isso a importação pré-preenche e devolve o que falta,
 * em vez de tentar ser automática de ponta a ponta.
 */

function texto(no: Element | null, tag: string): string {
  return no?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}

export interface ErroLeituraNfe {
  erro: string
}

export function lerXmlNfe(xml: string): NotaFornecedor | ErroLeituraNfe {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { erro: 'Arquivo não é um XML válido.' }
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0]
  if (!infNFe) {
    return { erro: 'XML não parece ser uma NF-e (elemento infNFe não encontrado).' }
  }

  const emit = infNFe.getElementsByTagName('emit')[0] ?? null
  const ide = infNFe.getElementsByTagName('ide')[0] ?? null

  const itens: ItemNotaFornecedor[] = Array.from(infNFe.getElementsByTagName('det')).map((det) => {
    const prod = det.getElementsByTagName('prod')[0] ?? null
    return {
      codigoFornecedor: texto(prod, 'cProd'),
      descricao: texto(prod, 'xProd'),
      quantidade: Number(texto(prod, 'qCom')) || 0,
      unidade: texto(prod, 'uCom') || 'UN',
      valorUnitario: Number(texto(prod, 'vUnCom')) || 0,
    }
  })

  if (itens.length === 0) {
    return { erro: 'A nota não tem itens.' }
  }

  return {
    // A chave vem no atributo Id, prefixada por "NFe".
    chaveAcesso: (infNFe.getAttribute('Id') ?? '').replace(/^NFe/, ''),
    numero: texto(ide, 'nNF'),
    emitidaEm: texto(ide, 'dhEmi').slice(0, 10),
    fornecedor: {
      cnpj: texto(emit, 'CNPJ'),
      razaoSocial: texto(emit, 'xNome'),
    },
    itens,
    valorTotal: itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0),
  }
}

export function ehErro(r: NotaFornecedor | ErroLeituraNfe): r is ErroLeituraNfe {
  return 'erro' in r
}

/** Resolve os itens que já têm de-para cadastrado de importações anteriores. */
export function aplicarDePara(nota: NotaFornecedor, mapa: DeParaProduto[]): NotaFornecedor {
  return {
    ...nota,
    itens: nota.itens.map((item) => ({
      ...item,
      insumoId: mapa.find((m) => m.codigoFornecedor === item.codigoFornecedor)?.insumoId,
    })),
  }
}

/**
 * XML de exemplo para a demonstração.
 *
 * Estrutura reduzida de uma NF-e real: emitente, identificação e itens. Os
 * códigos de produto (`FAR-25KG`, `FER-1KG`) são do catálogo do fornecedor —
 * é justamente por isso que o de-para existe.
 */
export const XML_EXEMPLO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe35250612345678000188550010000045781234567890" versao="4.00">
      <ide>
        <nNF>4578</nNF>
        <dhEmi>2026-07-28T08:14:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000188</CNPJ>
        <xNome>MOINHO SAO JORGE DISTRIBUIDORA LTDA</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>FAR-25KG</cProd>
          <xProd>FARINHA DE TRIGO ESPECIAL SACO 25KG</xProd>
          <NCM>11010010</NCM>
          <uCom>SC</uCom>
          <qCom>4.0000</qCom>
          <vUnCom>108.5000</vUnCom>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>FER-1KG</cProd>
          <xProd>FERMENTO BIOLOGICO SECO INSTANTANEO 1KG</xProd>
          <NCM>21021000</NCM>
          <uCom>UN</uCom>
          <qCom>6.0000</qCom>
          <vUnCom>32.9000</vUnCom>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>MTG-BLOCO</cProd>
          <xProd>MANTEIGA SEM SAL BLOCO 5KG</xProd>
          <NCM>04051000</NCM>
          <uCom>CX</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>198.0000</vUnCom>
        </prod>
      </det>
      <det nItem="4">
        <prod>
          <cProd>ACU-REF</cProd>
          <xProd>ACUCAR REFINADO SACO 5KG</xProd>
          <NCM>17019900</NCM>
          <uCom>SC</uCom>
          <qCom>8.0000</qCom>
          <vUnCom>19.4000</vUnCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`
