import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useStore } from '@/store'
import { classificarFarol } from '@/lib/fefo'
import { movimentoReduzido, useRevelar } from '@/lib/anima'
import { Logo } from '@/components/ui'

const navegacao = [
  { para: '/app', rotulo: 'Dashboard', icone: '◎', exato: true },
  { para: '/app/estoque', rotulo: 'Estoque', icone: '▤' },
  { para: '/app/producao', rotulo: 'Produção', icone: '◉' },
  { para: '/app/whatsapp', rotulo: 'Encomendas', icone: '✆' },
  { para: '/app/clientes', rotulo: 'Clientes', icone: '♥' },
  { para: '/app/rh', rotulo: 'Equipe', icone: '☺' },
  { para: '/app/financeiro', rotulo: 'Financeiro', icone: '$' },
  { para: '/app/produtos', rotulo: 'Produtos', icone: '▦' },
  { para: '/app/bi', rotulo: 'Inteligência', icone: '◫' },
  { para: '/app/auditoria', rotulo: 'Auditoria', icone: '⚖' },
]

const externos = [
  { para: '/pdv', rotulo: 'Abrir PDV', icone: '▣' },
  { para: '/ponto', rotulo: 'Terminal de Ponto', icone: '⏱' },
  { para: '/kds', rotulo: 'Tela da Cozinha', icone: '☰' },
]

export default function Layout() {
  const { usuario, sair, pedidos, lotes, registrosPonto } = useStore()
  const navigate = useNavigate()
  const local = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const drawer = useRef<HTMLElement>(null)
  const fundo = useRef<HTMLDivElement>(null)

  // Cada troca de tela reanima a entrada em cascata do conteúdo.
  const palco = useRevelar<HTMLDivElement>(local.pathname)

  useEffect(() => setMenuAberto(false), [local.pathname])

  // Drawer deslizando pela esquerda
  useEffect(() => {
    if (!menuAberto || movimentoReduzido()) return
    if (fundo.current) gsap.from(fundo.current, { opacity: 0, duration: 0.2 })
    if (drawer.current) {
      gsap.from(drawer.current, { x: -280, duration: 0.42, ease: 'power3.out' })
    }
  }, [menuAberto])

  const pendentes = pedidos.filter((p) => p.status === 'PENDING_CONFIRMATION').length
  const criticos = lotes.filter(
    (l) => l.status === 'ATIVO' && l.quantidadeAtual > 0 && classificarFarol(l.dataValidade) === 'VERMELHO',
  ).length
  const inconsistencias = registrosPonto.filter((r) => r.inconsistencia).length

  const badges: Record<string, number> = {
    '/app/whatsapp': pendentes,
    '/app/estoque': criticos,
    '/app/rh': inconsistencias,
  }
  const totalAlertas = pendentes + criticos + inconsistencias

  const conteudoNav = (
    <>
      <nav className="flex-1 space-y-1 px-3">
        {navegacao.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.exato}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'border border-white/60 bg-white/70 text-mata-900 shadow-sm backdrop-blur-md'
                  : 'border border-transparent text-mata-900/60 hover:bg-white/50 hover:text-mata-900'
              }`
            }
          >
            <span className="w-4 text-center text-bela-600">{item.icone}</span>
            <span className="flex-1">{item.rotulo}</span>
            {badges[item.para] > 0 && (
              <span className="rounded-full bg-gradient-to-b from-red-500 to-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {badges[item.para]}
              </span>
            )}
          </NavLink>
        ))}

        <p className="px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-wider text-mata-900/35">
          Terminais da loja
        </p>
        {externos.map((item) => (
          <button
            key={item.para}
            onClick={() => navigate(item.para)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-mata-900/60 transition-all duration-200 hover:bg-white/50 hover:text-mata-900"
          >
            <span className="w-4 text-center text-bela-600">{item.icone}</span>
            {item.rotulo}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/50 p-3">
        <div className="mb-2 px-2">
          <p className="text-sm font-bold text-mata-900">{usuario}</p>
          <p className="text-xs text-mata-900/50">Gerente</p>
        </div>
        <button onClick={() => { sair(); navigate('/') }} className="btn-ghost w-full">
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/50 bg-white/40 backdrop-blur-2xl lg:flex">
        <Marca />
        {conteudoNav}
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div ref={fundo} className="absolute inset-0 bg-mata-900/40 backdrop-blur-sm"
               onClick={() => setMenuAberto(false)} />
          <aside ref={drawer}
                 className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/50 bg-white/80 shadow-vidro-alto backdrop-blur-2xl">
            <Marca />
            {conteudoNav}
          </aside>
        </div>
      )}

      <div className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/50 bg-white/60 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="relative grid h-9 w-9 place-items-center rounded-xl text-mata-800 transition-colors hover:bg-white/70"
          >
            <span className="text-lg">☰</span>
            {totalAlertas > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
          <Logo tamanho={26} />
          <span className="text-sm font-bold text-mata-900">Bela Vista</span>
        </header>

        <div ref={palco} className="mx-auto max-w-6xl px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <Logo tamanho={40} />
      <div>
        <p className="text-sm font-extrabold leading-tight text-mata-900">Pães e Doces</p>
        <p className="text-sm font-extrabold leading-tight text-bela-600">Bela Vista</p>
      </div>
    </div>
  )
}
