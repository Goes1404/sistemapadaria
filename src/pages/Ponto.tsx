import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useStore } from '@/store'
import { movimentoReduzido } from '@/lib/anima'
import { Logo } from '@/components/ui'

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
  const cartao = useRef<HTMLDivElement>(null)
  const pontos = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setRelogio(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!feedback) return
    if (cartao.current && !movimentoReduzido()) {
      gsap.from(cartao.current, {
        opacity: 0, scale: 0.86, y: 14,
        duration: 0.5, ease: 'back.out(1.7)',
      })
    }
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  function digitar(d: string) {
    if (pin.length >= 6) return
    if (pontos.current && !movimentoReduzido()) {
      const alvo = pontos.current.children[pin.length]
      if (alvo) gsap.fromTo(alvo, { scale: 0.4 }, { scale: 1, duration: 0.34, ease: 'back.out(3)' })
    }
    setPin(pin + d)
  }

  function errar() {
    if (pontos.current && !movimentoReduzido()) {
      gsap.fromTo(pontos.current, { x: -9 },
        { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.32)' })
    }
  }

  function confirmar() {
    if (pin.length < 4) {
      setFeedback({ ok: false, titulo: 'PIN incompleto', texto: 'Digite de 4 a 6 dígitos.' })
      setPin('')
      errar()
      return
    }
    const r = baterPonto(pin)
    if (!r.ok) errar()
    setFeedback(
      r.ok
        ? { ok: true, titulo: r.mensagem, texto: `${r.colaborador?.nome} · ${relogio.toLocaleTimeString('pt-BR')}` }
        : { ok: false, titulo: 'Não foi possível registrar', texto: r.mensagem },
    )
    setPin('')
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mata-900 p-6 text-white"
      style={{
        backgroundImage:
          'radial-gradient(45rem 34rem at 20% 0%, rgba(245,166,35,0.22), transparent 60%),' +
          'radial-gradient(38rem 30rem at 85% 100%, rgba(62,125,85,0.35), transparent 60%)',
      }}
    >
      <button onClick={() => navigate('/app')}
              className="absolute left-5 top-5 text-xs text-white/35 transition-colors hover:text-white/80">
        ← voltar ao backoffice
      </button>

      <div className="absolute right-5 top-5 flex items-center gap-2 opacity-80">
        <Logo tamanho={30} />
        <span className="text-xs font-bold text-white/70">Bela Vista</span>
      </div>

      <div className="mb-8 text-center">
        <p className="text-6xl font-extrabold tabular-nums tracking-tight sm:text-7xl">
          {relogio.toLocaleTimeString('pt-BR')}
        </p>
        <p className="mt-1.5 text-sm text-white/45">
          {relogio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          <span className="ml-2 text-white/25">· hora do servidor</span>
        </p>
      </div>

      {feedback ? (
        <div ref={cartao}
             className={`vidro-escuro w-full max-w-xs p-6 text-center ${
               feedback.ok ? 'ring-1 ring-mata-400/40' : 'ring-1 ring-red-400/40'}`}>
          <p className={`text-4xl ${feedback.ok ? 'text-mata-300' : 'text-red-300'}`}>
            {feedback.ok ? '✓' : '✕'}
          </p>
          <p className="mt-2 text-lg font-bold">{feedback.titulo}</p>
          <p className="mt-1 text-sm text-white/60">{feedback.texto}</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-white/45">Digite seu PIN</p>
          <div ref={pontos} className="mb-7 flex gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}
                className={`h-3.5 w-3.5 rounded-full transition-colors duration-200 ${
                  i < pin.length ? 'bg-bela-400 shadow-[0_0_12px_rgba(250,187,60,0.7)]' : 'bg-white/12'}`} />
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

      <p className="mt-10 text-center text-xs text-white/25">
        PINs da demo: 1234 · 2345 · 3456 · 4567 · 5678
      </p>
    </div>
  )
}

function Tecla({ children, onClick, variante = 'normal' }: {
  children: React.ReactNode; onClick: () => void; variante?: 'normal' | 'principal' | 'secundaria'
}) {
  const ref = useRef<HTMLButtonElement>(null)

  function apertar() {
    if (ref.current && !movimentoReduzido()) {
      gsap.fromTo(ref.current, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' })
    }
    onClick()
  }

  const estilos = {
    normal: 'vidro-escuro text-white hover:bg-white/15',
    principal:
      'border border-bela-300/40 bg-gradient-to-b from-bela-400 to-bela-600 text-mata-900 shadow-[0_6px_20px_-6px_rgba(245,166,35,0.8)] hover:from-bela-300 hover:to-bela-500',
    secundaria: 'vidro-escuro text-white/45 hover:bg-white/12',
  }

  return (
    <button ref={ref} onClick={apertar}
      className={`h-20 w-20 rounded-2xl text-2xl font-bold transition-colors ${estilos[variante]}`}>
      {children}
    </button>
  )
}
