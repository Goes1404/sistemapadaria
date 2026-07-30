import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'

/**
 * Terminal isolado de ponto — roda em tablet fixado na parede.
 * Sem navegação e sem acesso a dados sensíveis: só PIN.
 */
export default function Ponto() {
  const { baterPonto } = useStore()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [relogio, setRelogio] = useState(new Date())
  const [feedback, setFeedback] = useState<{ ok: boolean; titulo: string; texto: string } | null>(null)

  useEffect(() => {
    const t = setInterval(() => setRelogio(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  function digitar(d: string) {
    if (pin.length >= 6) return
    setPin(pin + d)
  }

  function confirmar() {
    if (pin.length < 4) {
      setFeedback({ ok: false, titulo: 'PIN incompleto', texto: 'Digite de 4 a 6 dígitos.' })
      setPin('')
      return
    }
    const r = baterPonto(pin)
    setFeedback(
      r.ok
        ? { ok: true, titulo: r.mensagem, texto: `${r.colaborador?.nome} · ${relogio.toLocaleTimeString('pt-BR')}` }
        : { ok: false, titulo: 'Não foi possível registrar', texto: r.mensagem },
    )
    setPin('')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 p-6 text-white">
      <button onClick={() => navigate('/app')}
              className="absolute left-5 top-5 text-xs text-stone-500 hover:text-stone-300">
        ← voltar ao backoffice
      </button>

      <div className="mb-8 text-center">
        <p className="text-6xl font-bold tabular-nums tracking-tight">
          {relogio.toLocaleTimeString('pt-BR')}
        </p>
        <p className="mt-1.5 text-sm text-stone-400">
          {relogio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          <span className="ml-2 text-stone-600">· hora do servidor</span>
        </p>
      </div>

      {feedback ? (
        <div className={`w-full max-w-xs rounded-2xl p-6 text-center ${feedback.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <p className="text-3xl">{feedback.ok ? '✓' : '✕'}</p>
          <p className="mt-2 text-lg font-bold">{feedback.titulo}</p>
          <p className="mt-1 text-sm opacity-90">{feedback.texto}</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-stone-400">Digite seu PIN</p>
          <div className="mb-7 flex gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}
                className={`h-3.5 w-3.5 rounded-full transition-colors ${i < pin.length ? 'bg-crosta-400' : 'bg-stone-700'}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <Tecla key={d} onClick={() => digitar(d)}>{d}</Tecla>
            ))}
            <Tecla onClick={() => setPin('')} variante="secundaria">C</Tecla>
            <Tecla onClick={() => digitar('0')}>0</Tecla>
            <Tecla onClick={confirmar} variante="principal">✓</Tecla>
          </div>
        </>
      )}

      <p className="mt-10 text-center text-xs text-stone-600">
        PINs da demo: 1234 · 2345 · 3456 · 4567 · 5678
      </p>
    </div>
  )
}

function Tecla({ children, onClick, variante = 'normal' }: {
  children: React.ReactNode; onClick: () => void; variante?: 'normal' | 'principal' | 'secundaria'
}) {
  const estilos = {
    normal: 'bg-stone-800 hover:bg-stone-700 active:bg-stone-600',
    principal: 'bg-crosta-600 hover:bg-crosta-500 active:bg-crosta-400',
    secundaria: 'bg-stone-800 text-stone-400 hover:bg-stone-700',
  }
  return (
    <button onClick={onClick}
      className={`h-20 w-20 rounded-2xl text-2xl font-semibold transition-colors ${estilos[variante]}`}>
      {children}
    </button>
  )
}
