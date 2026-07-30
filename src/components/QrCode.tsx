import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QR Code real, gerado no cliente.
 *
 * Vale para os dois usos: o BR Code do PIX (legível por qualquer app de banco)
 * e o QR de consulta do DANFE-NFC-e.
 */
export function QrCode({ valor, tamanho = 200, className = '' }: {
  valor: string
  tamanho?: number
  className?: string
}) {
  const [url, setUrl] = useState<string>('')
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let ativo = true
    QRCode.toDataURL(valor, {
      width: tamanho,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#16331f', light: '#ffffff' },
    })
      .then((d) => { if (ativo) { setUrl(d); setErro(false) } })
      .catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false }
  }, [valor, tamanho])

  if (erro) {
    return (
      <div className="grid place-items-center rounded-xl bg-mata-900/5 text-xs text-mata-900/40"
           style={{ width: tamanho, height: tamanho }}>
        QR indisponível
      </div>
    )
  }

  return url ? (
    <img src={url} width={tamanho} height={tamanho} alt="QR Code"
         className={`rounded-xl bg-white p-1 ${className}`} />
  ) : (
    <div className="animate-pulse rounded-xl bg-mata-900/5" style={{ width: tamanho, height: tamanho }} />
  )
}
