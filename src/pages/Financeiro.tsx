import { useStore } from '@/store'
import { brl, horaBR } from '@/lib/format'
import { Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import type { FormaPagamento } from '@/types'

const rotuloForma: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'PIX', DEBITO: 'Débito', CREDITO: 'Crédito',
}

export default function Financeiro() {
  const { vendas, movimentosCaixa, caixa } = useStore()

  const hoje = new Date().toDateString()
  const doDia = vendas.filter((v) => new Date(v.criadaEm).toDateString() === hoje)
  const movDia = movimentosCaixa.filter((m) => new Date(m.criadoEm).toDateString() === hoje)

  const entradas = doDia.reduce((s, v) => s + v.total, 0)
  const sangrias = movDia.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0)
  const suprimentos = movDia.filter((m) => m.motivo === 'SUPRIMENTO').reduce((s, m) => s + m.valor, 0)

  const porForma = doDia
    .flatMap((v) => v.pagamentos)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.forma] = (acc[p.forma] ?? 0) + p.valor
      return acc
    }, {})

  const porOrigem = doDia.reduce<Record<string, number>>((acc, v) => {
    acc[v.origem] = (acc[v.origem] ?? 0) + v.total
    return acc
  }, {})

  const dinheiroEmGaveta =
    caixa.trocoInicial + (porForma['DINHEIRO'] ?? 0) + suprimentos - sangrias

  const maiorForma = Math.max(1, ...Object.values(porForma))

  return (
    <>
      <PageHeader titulo="Fluxo de caixa do dia" subtitulo="Entradas e saídas em tempo real, PDV e WhatsApp somados." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Entradas" valor={brl(entradas)} numero={entradas} formatar={brl} detalhe={`${doDia.length} vendas`} tom="ok" />
        <Stat rotulo="Sangrias" valor={brl(sangrias)} numero={sangrias} formatar={brl} detalhe="retiradas do caixa" tom={sangrias > 0 ? 'alerta' : 'neutro'} />
        <Stat rotulo="Suprimentos" valor={brl(suprimentos)} numero={suprimentos} formatar={brl} detalhe="reforço de troco" />
        <Stat rotulo="Esperado em gaveta" valor={brl(dinheiroEmGaveta)} numero={dinheiroEmGaveta} formatar={brl} detalhe="só o dinheiro físico" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card titulo="Recebimentos por forma de pagamento">
          {Object.keys(porForma).length === 0 ? <Vazio mensagem="Nenhum recebimento hoje." /> : (
            <ul className="space-y-3.5">
              {Object.entries(porForma)
                .sort(([, a], [, b]) => b - a)
                .map(([forma, valor]) => (
                  <li key={forma}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-mata-700">{rotuloForma[forma as FormaPagamento]}</span>
                      <span className="font-semibold tabular-nums">{brl(valor)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-mata-900/5">
                      <div className="h-full rounded-full bg-bela-500" style={{ width: `${(valor / maiorForma) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card titulo="Origem das vendas">
          <ul className="space-y-3.5">
            {(['PDV', 'WHATSAPP'] as const).map((origem) => {
              const valor = porOrigem[origem] ?? 0
              const pct = entradas > 0 ? (valor / entradas) * 100 : 0
              return (
                <li key={origem}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-mata-700">
                      {origem === 'PDV' ? 'Balcão (PDV)' : 'Encomendas WhatsApp'}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {brl(valor)} <span className="text-xs font-normal text-mata-900/35">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-mata-900/5">
                    <div className={`h-full rounded-full ${origem === 'PDV' ? 'bg-mata-700' : 'bg-bela-500'}`}
                         style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 rounded-lg bg-white/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-mata-900/60">Troco inicial</span>
              <span className="tabular-nums">{brl(caixa.trocoInicial)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/50 pt-2 font-semibold">
              <span className="text-mata-800">Resultado do dia</span>
              <span className="tabular-nums text-mata-700">{brl(entradas - sangrias + suprimentos)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card titulo="Vendas de hoje">
          {doDia.length === 0 ? <Vazio mensagem="Nenhuma venda registrada." /> : (
            <Tabela cabecalho={['Hora', 'Origem', 'Itens', 'Pagamento', 'Total']}>
              {doDia.map((v) => (
                <tr key={v.id}>
                  <td className="td text-xs text-mata-900/50">{horaBR(v.criadaEm)}</td>
                  <td className="td">
                    <Badge tom={v.origem === 'PDV' ? 'neutro' : 'ok'}>{v.origem}</Badge>
                  </td>
                  <td className="td text-mata-900/60">{v.itens.length}</td>
                  <td className="td text-xs text-mata-900/50">
                    {v.pagamentos.map((p) => rotuloForma[p.forma]).join(' + ')}
                  </td>
                  <td className="td text-right font-semibold tabular-nums">{brl(v.total)}</td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>

        <Card titulo="Movimentações do caixa">
          {movDia.length === 0 ? <Vazio mensagem="Nenhuma sangria ou suprimento hoje." /> : (
            <ul className="space-y-3">
              {movDia.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-mata-800">{m.observacao}</p>
                    <p className="text-xs text-mata-900/50">{horaBR(m.criadoEm)}</p>
                  </div>
                  <span className={`font-semibold tabular-nums ${m.motivo === 'SANGRIA' ? 'text-red-600' : 'text-mata-700'}`}>
                    {m.motivo === 'SANGRIA' ? '−' : '+'} {brl(m.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
