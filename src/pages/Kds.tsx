import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Logo } from '@/components/ui'
import type { PedidoCozinha, StatusPreparo } from '@/types'

/**
 * KDS — a tela da cozinha.
 *
 * Substitui a comanda de papel. O ganho principal não é digitalizar o pedido:
 * é o cronômetro. Papel não avisa que alguém está esperando há doze minutos.
 */

/** Minutos a partir dos quais o pedido acende. */
const ATENCAO = 6
const ATRASADO = 12

const colunas: { status: StatusPreparo; titulo: string }[] = [
  { status: 'AGUARDANDO', titulo: 'Na fila' },
  { status: 'EM_PREPARO', titulo: 'Preparando' },
  { status: 'PRONTO', titulo: 'Pronto' },
]

export default function Kds() {
  const { pedidosCozinha, atualizarPreparo } = useStore()
  const navigate = useNavigate()
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const minutosDe = (p: PedidoCozinha) =>
    Math.floor((agora - new Date(p.recebidoEm).getTime()) / 60_000)

  const ativos = pedidosCozinha.filter((p) => p.status !== 'ENTREGUE')
  const atrasados = ativos.filter((p) => minutosDe(p) >= ATRASADO && p.status !== 'PRONTO').length

  return (
    <div
      className="min-h-screen bg-mata-900 p-5 text-white"
      style={{
        backgroundImage:
          'radial-gradient(45rem 34rem at 12% 0%, rgba(245,166,35,0.16), transparent 60%),' +
          'radial-gradient(38rem 30rem at 88% 100%, rgba(62,125,85,0.28), transparent 60%)',
      }}
    >
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/app')}
                className="grid h-9 w-9 place-items-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-white">←</button>
        <Logo tamanho={34} />
        <div className="flex-1">
          <h1 className="text-lg font-extrabold">Cozinha</h1>
          <p className="text-xs text-white/45">{ativos.length} pedidos em andamento</p>
        </div>
        {atrasados > 0 && (
          <span className="animate-pulse rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 ring-1 ring-inset ring-red-400/40">
            {atrasados} atrasado{atrasados > 1 ? 's' : ''}
          </span>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {colunas.map((coluna) => {
          const daColuna = ativos
            .filter((p) => p.status === coluna.status)
            .sort((a, b) => a.recebidoEm.localeCompare(b.recebidoEm))

          return (
            <section key={coluna.status} className="vidro-escuro flex flex-col p-4">
              <h2 className="mb-3 flex items-center justify-between text-sm font-bold text-white/80">
                {coluna.titulo}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{daColuna.length}</span>
              </h2>

              <ul className="space-y-3">
                {daColuna.map((p) => {
                  const minutos = minutosDe(p)
                  const nivel = p.status === 'PRONTO' ? 'ok' : minutos >= ATRASADO ? 'atrasado' : minutos >= ATENCAO ? 'atencao' : 'ok'
                  const borda = {
                    ok: 'border-white/10',
                    atencao: 'border-bela-400/50',
                    atrasado: 'border-red-400/60',
                  }[nivel]

                  return (
                    <li key={p.id} className={`rounded-xl border bg-white/[0.06] p-3.5 ${borda}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xl font-extrabold tabular-nums">{p.senha}</span>
                          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/60">
                            {p.origem === 'WHATSAPP' ? 'encomenda' : 'balcão'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${
                          nivel === 'atrasado' ? 'text-red-300' : nivel === 'atencao' ? 'text-bela-300' : 'text-white/50'}`}>
                          {minutos}min
                        </span>
                      </div>

                      {p.prometidoPara && (
                        <p className="mt-1 text-[11px] text-bela-300">Retirada às {p.prometidoPara}</p>
                      )}

                      <ul className="mt-2.5 space-y-1">
                        {p.itens.map((item, i) => (
                          <li key={i} className="text-sm text-white/85">
                            <span className="font-bold tabular-nums text-bela-300">{item.quantidade}×</span> {item.nome}
                            {item.observacao && (
                              <span className="ml-1 text-[11px] italic text-white/50">({item.observacao})</span>
                            )}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex gap-2">
                        {p.status === 'AGUARDANDO' && (
                          <button onClick={() => atualizarPreparo(p.id, 'EM_PREPARO')}
                                  className="btn-primary flex-1 py-2 text-xs">Iniciar</button>
                        )}
                        {p.status === 'EM_PREPARO' && (
                          <button onClick={() => atualizarPreparo(p.id, 'PRONTO')}
                                  className="btn-success flex-1 py-2 text-xs">Pronto</button>
                        )}
                        {p.status === 'PRONTO' && (
                          <button onClick={() => atualizarPreparo(p.id, 'ENTREGUE')}
                                  className="btn-ghost flex-1 border-white/20 bg-white/10 py-2 text-xs text-white hover:bg-white/20">
                            Entregue
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}

                {daColuna.length === 0 && (
                  <li className="py-8 text-center text-sm text-white/25">Vazio</li>
                )}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-white/25">
        Pedidos acendem em âmbar aos {ATENCAO} min e em vermelho aos {ATRASADO} min de espera.
      </p>
    </div>
  )
}
