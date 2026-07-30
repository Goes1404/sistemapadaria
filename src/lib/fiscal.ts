import type { DocumentoFiscal, ItemVenda } from '@/types'
import { uid } from '@/lib/format'

/**
 * Emissor fiscal simulado.
 *
 * Reproduz o COMPORTAMENTO da emissão de NFC-e para a demonstração: numeração
 * por série, chave de acesso de 44 dígitos com dígito verificador, autorização,
 * rejeição e contingência. Nada é transmitido a lugar nenhum.
 *
 * Na v1, isto é substituído por uma implementação de `EmissorFiscal`
 * (src/futuro/fiscal.ts) apoiada num provedor. A interface de tela não muda.
 */

export const EMITENTE = {
  razaoSocial: 'PAES E DOCES BELA VISTA LTDA',
  cnpj: '12345678000199',
  inscricaoEstadual: '110042490114',
  uf: 'SP',
  codigoUf: 35,
  endereco: 'Rua das Acácias, 245 — Jardim Bela Vista',
  regime: 'Simples Nacional',
} as const

const SERIE = 1

/** Módulo 11 — o mesmo cálculo usado no DV da chave de acesso. */
function digitoVerificadorChave(chave43: string): number {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9]
  let soma = 0
  for (let i = chave43.length - 1, p = 0; i >= 0; i--, p++) {
    soma += Number(chave43[i]) * pesos[p % pesos.length]
  }
  const resto = soma % 11
  return resto === 0 || resto === 1 ? 0 : 11 - resto
}

/**
 * Monta a chave de acesso de 44 dígitos.
 *
 * Layout: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
export function montarChaveAcesso(numero: number, contingencia: boolean, quando: Date): string {
  const aamm = `${String(quando.getFullYear()).slice(2)}${String(quando.getMonth() + 1).padStart(2, '0')}`
  const codigoNumerico = String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
  const base =
    String(EMITENTE.codigoUf).padStart(2, '0') +
    aamm +
    EMITENTE.cnpj +
    '65' +
    String(SERIE).padStart(3, '0') +
    String(numero).padStart(9, '0') +
    (contingencia ? '9' : '1') +
    codigoNumerico
  return base + digitoVerificadorChave(base)
}

export function formatarChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export interface EstadoSefaz {
  disponivel: boolean
}

export interface ResultadoEmissao {
  documento: DocumentoFiscal
  /** Mensagem já traduzida para o operador do caixa, não o código da SEFAZ. */
  aviso?: string
}

/**
 * Emite o documento da venda.
 *
 * Quando a SEFAZ está fora, emite em contingência: a venda NÃO para. O
 * documento fica pendente de transmissão e é enviado quando o serviço volta —
 * é o mesmo princípio da fila de sincronização do PDV offline.
 */
export function emitirDocumento(
  vendaId: string,
  itens: ItemVenda[],
  valorTotal: number,
  numero: number,
  sefaz: EstadoSefaz,
): ResultadoEmissao {
  const agora = new Date()
  const contingencia = !sefaz.disponivel
  const chave = montarChaveAcesso(numero, contingencia, agora)

  // Rejeição comum na vida real: produto sem NCM cadastrado.
  const semNcm = itens.find((i) => !i.nome)
  if (semNcm) {
    return {
      documento: {
        id: uid(), vendaId, modelo: 'NFCE_65', serie: SERIE, numero, chaveAcesso: chave,
        status: 'REJEITADO', emitidoEm: agora.toISOString(), contingencia: false,
        motivoRejeicao: 'Produto sem NCM cadastrado', valorTotal,
        urlConsulta: urlConsulta(chave),
      },
      aviso: 'Documento rejeitado: produto sem cadastro fiscal completo.',
    }
  }

  return {
    documento: {
      id: uid(),
      vendaId,
      modelo: 'NFCE_65',
      serie: SERIE,
      numero,
      chaveAcesso: chave,
      protocolo: contingencia ? undefined : `135${Date.now().toString().slice(-12)}`,
      status: contingencia ? 'EM_CONTINGENCIA' : 'AUTORIZADO',
      emitidoEm: agora.toISOString(),
      autorizadoEm: contingencia ? undefined : agora.toISOString(),
      contingencia,
      valorTotal,
      urlConsulta: urlConsulta(chave),
    },
    aviso: contingencia
      ? 'SEFAZ indisponível — emitido em contingência. Será transmitido quando o serviço voltar.'
      : undefined,
  }
}

export function urlConsulta(chave: string): string {
  return `https://www.nfce.fazenda.sp.gov.br/consulta?p=${chave}`
}

/** Transmite o que ficou em contingência. Chamado quando a SEFAZ volta. */
export function transmitirContingencia(documentos: DocumentoFiscal[]): DocumentoFiscal[] {
  const agora = new Date().toISOString()
  return documentos.map((d) =>
    d.status === 'EM_CONTINGENCIA'
      ? { ...d, status: 'AUTORIZADO' as const, autorizadoEm: agora, protocolo: `135${Date.now().toString().slice(-12)}` }
      : d,
  )
}
