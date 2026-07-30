import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import { classificarFarol, diasParaVencer } from '@/lib/fefo'
import { brl, horaBR, num } from '@/lib/format'
import { Badge, BadgeFarol, Card, PageHeader, Stat, Vazio } from '@/components/ui'

export default function Dashboard() {
  const { lotes, insumos, pedidos, registrosPonto, colaboradores, vendas, movimentosCaixa, caixa } = useStore()

  const criticos = lotes
    .filter((l) => l.status === 'ATIVO' && l.quantidadeAtual > 0)
    .map((l) => ({ ...l, farol: classificarFarol(l.dataValidade), dias: diasParaVencer(l.dataValidade) }))
    .filter((l) => l.farol !== 'VERDE')
    .sort((a, b) => a.dias - b.dias)

  const pendentes = pedidos.filter((p) => p.status === 'PENDING_CONFIRMATION')
  const inconsistentes = registrosPonto.filter((r) => r.inconsistencia)

  const hoje = new Date().toDateString()
  const vendasHoje = vendas.filter((v) => new Date(v.criadaEm).toDateString() === hoje)
  const entradas = vendasHoje.reduce((s, v) => s + v.total, 0)
  const sangrias = movimentosCaixa
    .filter((m) => m.motivo === 'SANGRIA' && new Date(m.criadoEm).toDateString() === hoje)
    .reduce((s, m) => s + m.valor, 0)

  const perdaPotencial = criticos
    .filter((l) => l.farol === 'VERMELHO')
    .reduce((s, l) => s + l.quantidadeAtual * l.custoUnitario, 0)

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'
  const unidade = (id: string) => insumos.find((i) => i.id === id)?.unidade ?? ''
  const nomeColaborador = (id: string) => colaboradores.find((c) => c.id === id)?.nome ?? '—'

  return (
    <>
      <PageHeader
        titulo="Bom dia, Juliana"
        subtitulo={
          caixa.aberto
            ? `Caixa aberto por ${caixa.operador} desde ${caixa.abertoEm ? horaBR(caixa.abertoEm) : '—'}`
            : 'Caixa fechado no momento'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Vendas de hoje" valor={brl(entradas)} numero={entradas} formatar={brl}
              detalhe={`${vendasHoje.length} pedidos`} tom="ok" />
        <Stat rotulo="Vencendo / vencidos" valor={String(criticos.length)} numero={criticos.length}
              formatar={(n) => String(Math.round(n))} detalhe="lotes exigindo decisão"
              tom={criticos.length ? 'erro' : 'neutro'} />
        <Stat rotulo="Perda potencial" valor={brl(perdaPotencial)} numero={perdaPotencial} formatar={brl}
              detalhe="valor parado em lote vencido" tom={perdaPotencial > 0 ? 'erro' : 'ok'} />
        <Stat rotulo="Encomendas pendentes" valor={String(pendentes.length)} numero={pendentes.length}
              formatar={(n) => String(Math.round(n))} detalhe="aguardando aceite"
              tom={pendentes.length ? 'alerta' : 'neutro'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          titulo="Farol de validade — precisa de decisão hoje"
          acao={<Link to="/app/estoque" className="text-xs font-semibold text-bela-700 hover:underline">Ver estoque</Link>}
        >
          {criticos.length === 0 ? (
            <Vazio mensagem="Nenhum lote em risco. Estoque saudável." />
          ) : (
            <ul className="space-y-3">
              {criticos.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-mata-800">{nomeInsumo(l.insumoId)}</p>
                    <p className="text-xs text-mata-900/50">
                      Lote {l.codigo} · {num(l.quantidadeAtual)} {unidade(l.insumoId)} ·{' '}
                      {brl(l.quantidadeAtual * l.custoUnitario)} em risco
                    </p>
                  </div>
                  <BadgeFarol
                    farol={l.farol}
                    texto={l.dias < 0 ? `venceu há ${Math.abs(l.dias)}d` : l.dias === 0 ? 'vence hoje' : `${l.dias}d`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Encomendas do WhatsApp aguardando aceite"
          acao={<Link to="/app/whatsapp" className="text-xs font-semibold text-bela-700 hover:underline">Abrir painel</Link>}
        >
          {pendentes.length === 0 ? (
            <Vazio mensagem="Nenhuma encomenda pendente." />
          ) : (
            <ul className="space-y-3">
              {pendentes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-mata-800">{p.cliente}</p>
                    <p className="text-xs text-mata-900/50">
                      {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} · retirar às {p.retirarEm}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-mata-800">{brl(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Ponto com inconsistência"
          acao={<Link to="/app/rh" className="text-xs font-semibold text-bela-700 hover:underline">Resolver</Link>}
        >
          {inconsistentes.length === 0 ? (
            <Vazio mensagem="Nenhuma inconsistência de ponto." />
          ) : (
            <ul className="space-y-3">
              {inconsistentes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-mata-800">{nomeColaborador(r.colaboradorId)}</p>
                    <p className="text-xs text-mata-900/50">
                      Entrada às {horaBR(r.registradoEm)} sem saída há mais de 14h
                    </p>
                  </div>
                  <Badge tom="erro">Ajustar</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Caixa do dia"
          acao={<Link to="/app/financeiro" className="text-xs font-semibold text-bela-700 hover:underline">Detalhar</Link>}
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-mata-900/60">Troco inicial</dt>
              <dd className="font-semibold tabular-nums">{brl(caixa.trocoInicial)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mata-900/60">Entradas (vendas)</dt>
              <dd className="font-semibold tabular-nums text-mata-700">+ {brl(entradas)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mata-900/60">Sangrias</dt>
              <dd className="font-semibold tabular-nums text-red-700">− {brl(sangrias)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/50 pt-3">
              <dt className="font-semibold text-mata-800">Saldo esperado</dt>
              <dd className="text-lg font-bold tabular-nums">{brl(caixa.trocoInicial + entradas - sangrias)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  )
}
