import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { classificarFarol } from '@/lib/fefo'

const navegacao = [
  { para: '/app', rotulo: 'Dashboard', icone: '◎', exato: true },
  { para: '/app/estoque', rotulo: 'Estoque', icone: '▤' },
  { para: '/app/producao', rotulo: 'Produção', icone: '◉' },
  { para: '/app/whatsapp', rotulo: 'Encomendas', icone: '✆' },
  { para: '/app/rh', rotulo: 'Equipe', icone: '☺' },
  { para: '/app/financeiro', rotulo: 'Financeiro', icone: '$' },
]

const externos = [
  { para: '/pdv', rotulo: 'Abrir PDV', icone: '▣' },
  { para: '/ponto', rotulo: 'Terminal de Ponto', icone: '⏱' },
]

export default function Layout() {
  const { usuario, sair, pedidos, lotes, registrosPonto } = useStore()
  const navigate = useNavigate()

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

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-crosta-600 text-lg text-white">🥖</span>
          <div>
            <p className="text-sm font-bold leading-tight text-stone-900">Pão &amp; Cia</p>
            <p className="text-[11px] text-stone-500">Gestão da padaria</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navegacao.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.exato}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-crosta-50 text-crosta-800' : 'text-stone-600 hover:bg-stone-50'
                }`
              }
            >
              <span className="w-4 text-center text-stone-400">{item.icone}</span>
              <span className="flex-1">{item.rotulo}</span>
              {badges[item.para] > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badges[item.para]}
                </span>
              )}
            </NavLink>
          ))}

          <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Terminais da loja
          </p>
          {externos.map((item) => (
            <button
              key={item.para}
              onClick={() => navigate(item.para)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
            >
              <span className="w-4 text-center text-stone-400">{item.icone}</span>
              {item.rotulo}
            </button>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-3">
          <div className="mb-2 px-2">
            <p className="text-sm font-semibold text-stone-800">{usuario}</p>
            <p className="text-xs text-stone-500">Gerente</p>
          </div>
          <button onClick={() => { sair(); navigate('/') }} className="btn-ghost w-full">
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
