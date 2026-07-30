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
        <Stat rotulo="Entradas" valor={brl(entradas)} detalhe={`${doDia.length} vendas`} tom="ok" />
        <Stat rotulo="Sangrias" valor={brl(sangrias)} detalhe="retiradas do caixa" tom={sangrias > 0 ? 'alerta' : 'neutro'} />
        <Stat rotulo="Suprimentos" valor={brl(suprimentos)} detalhe="reforço de troco" />
        <Stat rotulo="Esperado em gaveta" valor={brl(dinheiroEmGaveta)} detalhe="só o dinheiro físico" />
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
                      <span className="font-medium text-stone-700">{rotuloForma[forma as FormaPagamento]}</span>
                      <span className="font-semibold tabular-nums">{brl(valor)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-crosta-500" style={{ width: `${(valor / maiorForma) * 100}%` }} />
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
                    <span className="font-medium text-stone-700">
                      {origem === 'PDV' ? 'Balcão (PDV)' : 'Encomendas WhatsApp'}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {brl(valor)} <span className="text-xs font-normal text-stone-400">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className={`h-full rounded-full ${origem === 'PDV' ? 'bg-stone-600' : 'bg-emerald-500'}`}
                         style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 rounded-lg bg-stone-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">Troco inicial</span>
              <span className="tabular-nums">{brl(caixa.trocoInicial)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-semibold">
              <span className="text-stone-800">Resultado do dia</span>
              <span className="tabular-nums text-emerald-700">{brl(entradas - sangrias + suprimentos)}</span>
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
                  <td className="td text-xs text-stone-500">{horaBR(v.criadaEm)}</td>
                  <td className="td">
                    <Badge tom={v.origem === 'PDV' ? 'neutro' : 'ok'}>{v.origem}</Badge>
                  </td>
                  <td className="td text-stone-600">{v.itens.length}</td>
                  <td className="td text-xs text-stone-500">
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
                    <p className="text-sm font-medium text-stone-800">{m.observacao}</p>
                    <p className="text-xs text-stone-500">{horaBR(m.criadoEm)}</p>
                  </div>
                  <span className={`font-semibold tabular-nums ${m.motivo === 'SANGRIA' ? 'text-red-600' : 'text-emerald-700'}`}>
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
