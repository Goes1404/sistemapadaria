import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useStore } from '@/store'
import { movimentoReduzido } from '@/lib/anima'
import { Logo } from '@/components/ui'

export default function Login() {
  const { entrar } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('juliana@belavista.com.br')
  const [senha, setSenha] = useState('demo1234')
  const [erro, setErro] = useState('')
  const palco = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!palco.current || movimentoReduzido()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-intro]', {
        opacity: 0, y: 22, duration: 0.7, ease: 'power3.out', stagger: 0.09,
      })
      gsap.from('[data-marca]', {
        opacity: 0, scale: 0.8, rotate: -12, duration: 0.9, ease: 'back.out(1.6)',
      })
    }, palco)
    return () => ctx.revert()
  }, [])

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@') || senha.length < 4) {
      setErro('Informe um e-mail válido e uma senha com pelo menos 4 caracteres.')
      return
    }
    entrar('Juliana Prado')
    navigate('/app')
  }

  return (
    <div ref={palco} className="grid min-h-screen lg:grid-cols-2">
      {/* Painel institucional */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-mata-800 p-12 text-bela-50 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(38rem 30rem at 15% 0%, rgba(245,166,35,0.35), transparent 60%),' +
              'radial-gradient(30rem 26rem at 95% 100%, rgba(245,166,35,0.20), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-3" data-marca>
          <Logo tamanho={52} />
          <div>
            <p className="text-lg font-extrabold leading-tight">Pães e Doces</p>
            <p className="text-lg font-extrabold leading-tight text-bela-400">Bela Vista</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight" data-intro>
            A padaria inteira em uma tela só.
          </h2>
          <p className="mt-5 max-w-md text-bela-100/80" data-intro>
            Caixa, encomendas do WhatsApp, estoque com controle de lote e validade,
            produção e ponto da equipe — tudo conversando entre si, sem planilha paralela.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              'Baixa automática de insumos a cada fornada',
              'Alerta de vencimento antes do prejuízo',
              'Encomendas do WhatsApp sem celular na mão',
              'Ponto eletrônico com hora do servidor',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5" data-intro>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bela-500 text-[11px] font-bold text-mata-900">
                  ✓
                </span>
                <span className="text-bela-50/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-bela-100/40" data-intro>
          Protótipo de validação · dados fictícios
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submeter} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden" data-marca>
            <Logo tamanho={56} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-mata-900" data-intro>
            Entrar no backoffice
          </h1>
          <p className="mt-1.5 text-sm text-mata-900/55" data-intro>Acesso restrito à gerência.</p>

          <div className="mt-7 space-y-4">
            <div data-intro>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" value={email}
                     onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div data-intro>
              <label className="label" htmlFor="senha">Senha</label>
              <input id="senha" type="password" className="input" value={senha}
                     onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
            </div>
          </div>

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          <button type="submit" className="btn-primary mt-6 w-full" data-intro>Entrar</button>

          <p className="vidro mt-6 px-4 py-3 text-xs text-mata-900/60" data-intro>
            <strong className="text-mata-900">Demo:</strong> qualquer e-mail e senha funcionam. Os terminais de{' '}
            <a href="/pdv" className="font-bold text-bela-700 underline">PDV</a> e{' '}
            <a href="/ponto" className="font-bold text-bela-700 underline">Ponto</a>{' '}
            abrem sem login, como acontece nos tablets da loja.
          </p>
        </form>
      </div>
    </div>
  )
}
