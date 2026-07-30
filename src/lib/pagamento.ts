import type { BandeiraSimulada } from '@/lib/pagamentoTipos'

export type { BandeiraSimulada }

/**
 * TEF e PIX simulados.
 *
 * Reproduz o comportamento e a temporização do fluxo real — inclusive a espera,
 * que é o que faz o operador entender que o pinpad está processando. Na v1 isto
 * vira uma implementação de `Tef` e `PagamentoPix` (src/futuro/pagamentos.ts).
 */

export interface RespostaTefSimulada {
  aprovada: boolean
  nsu?: string
  autorizacao?: string
  bandeira?: BandeiraSimulada
  motivoRecusa?: string
}

const BANDEIRAS: BandeiraSimulada[] = ['VISA', 'MASTERCARD', 'ELO']

function espera(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Passa o cartão no pinpad.
 *
 * `forcarRecusa` existe para a demonstração: o operador precisa ver o que
 * acontece quando a operadora nega, não só o caminho feliz.
 */
export async function passarCartao(
  valor: number,
  modalidade: 'DEBITO' | 'CREDITO',
  forcarRecusa = false,
): Promise<RespostaTefSimulada> {
  await espera(1800)
  if (forcarRecusa || valor <= 0) {
    return { aprovada: false, motivoRecusa: 'Cartão recusado pela operadora (saldo insuficiente)' }
  }
  return {
    aprovada: true,
    nsu: String(Math.floor(Math.random() * 9e8) + 1e8),
    autorizacao: String(Math.floor(Math.random() * 9e5) + 1e5),
    bandeira: BANDEIRAS[Math.floor(Math.random() * BANDEIRAS.length)],
    ...(modalidade === 'CREDITO' ? {} : {}),
  }
}

// ---------------------------------------------------------------------------
// PIX
// ---------------------------------------------------------------------------

export interface CobrancaPixSimulada {
  txid: string
  brCode: string
  valor: number
  expiraEm: string
}

/**
 * Monta um payload BR Code no formato EMV.
 *
 * A estrutura de campos (ID, tamanho, valor) e o CRC-16 são os reais — o que é
 * fictício é a chave PIX. Isso faz o QR ser legível por qualquer app de banco,
 * ainda que aponte para um destinatário que não existe.
 */
export function montarBrCode(chavePix: string, valor: number, txid: string): string {
  const campo = (id: string, valor: string) => id + String(valor.length).padStart(2, '0') + valor

  const merchant =
    campo('00', 'br.gov.bcb.pix') + campo('01', chavePix)

  const payload =
    campo('00', '01') +
    campo('26', merchant) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', 'PAES E DOCES BELA VISTA') +
    campo('60', 'SAO PAULO') +
    campo('62', campo('05', txid)) +
    '6304'

  return payload + crc16(payload)
}

/** CRC-16/CCITT-FALSE, exigido pelo padrão do BR Code. */
function crc16(texto: string): string {
  let crc = 0xffff
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function criarCobrancaPix(valor: number): CobrancaPixSimulada {
  const txid = `BV${Date.now().toString(36).toUpperCase()}`
  const expira = new Date(Date.now() + 5 * 60_000)
  return {
    txid,
    brCode: montarBrCode('12345678000199', valor, txid),
    valor,
    expiraEm: expira.toISOString(),
  }
}

/**
 * Aguarda a confirmação do PIX.
 *
 * No sistema real isso chega por webhook do PSP, não por espera — o operador
 * vê "pago" na tela em segundos sem ninguém consultar nada.
 */
export async function aguardarPix(): Promise<{ pago: boolean }> {
  await espera(2600)
  return { pago: true }
}
