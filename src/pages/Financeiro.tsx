import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { brl, horaBR, num } from '@/lib/format'
import {
  ALIQUOTA_SIMPLES, TAXAS_PAGAMENTO, calcularDre, custoFixoMensal,
  resultadoPorProduto, rotuloCategoria, taxaMediaPonderada,
} from '@/lib/financeiro'
import { Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import type { FormaPagamento } from '@/types'

const rotuloForma: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'PIX', DEBITO: 'Débito', CREDITO: 'Crédito',
}

const PERIODOS = [
  { dias: 1, rotulo: 'Hoje' },
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
] as const

type Aba = 'resultado' | 'caixa' | 'custos'

export default function Financeiro() {
  const {
    vendas, todasVendas, movimentosCaixa, caixa, perdasBalcao,
    produtos, custosOperacionais, custoUnitario,
  } = useStore()

  const [dias, setDias] = useState<number>(30)
  const [aba, setAba] = useState<Aba>('resultado')

  const { dre, resultados, vendasPeriodo } = useMemo(() => {
    const corte = Date.now() - dias * 86_400_000
    const v = todasVendas.filter((x) => new Date(x.criadaEm).getTime() >= corte)
    const p = perdasBalcao.filter((x) => new Date(x.registradoEm).getTime() >= corte)
    return {
      vendasPeriodo: v,
      dre: calcularDre(v, p, custosOperacionais, dias, custoUnitario),
      resultados: resultadoPorProduto({
        vendas: v, perdas: p, produtos, custos: custosOperacionais, dias, custoUnitarioDe: custoUnitario,
      }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, todasVendas, perdasBalcao, produtos, custosOperacionais])

  // Caixa do dia continua sendo o recorte operacional, separado do resultado.
  const hoje = new Date().toDateString()
  const doDia = vendas.filter((v) => new Date(v.criadaEm).toDateString() === hoje)
  const movDia = movimentosCaixa.filter((m) => new Date(m.criadoEm).toDateString() === hoje)
  const entradasDia = doDia.reduce((s, v) => s + v.total, 0)
  const sangrias = movDia.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0)
  const suprimentos = movDia.filter((m) => m.motivo === 'SUPRIMENTO').reduce((s, m) => s + m.valor, 0)

  const porForma = vendasPeriodo
    .flatMap((v) => v.pagamentos)
    .reduce<Record<string, { valor: number; taxa: number }>>((acc, p) => {
      const atual = acc[p.forma] ?? { valor: 0, taxa: 0 }
      atual.valor += p.valor
      atual.taxa += p.valor * TAXAS_PAGAMENTO[p.forma]
      acc[p.forma] = atual
      return acc
    }, {})
  const maiorForma = Math.max(1, ...Object.values(porForma).map((v) => v.valor))

  const faturamentoDiario = dre.receitaLiquida / dias
  const acimaDoEquilibrio = faturamentoDiario >= dre.pontoEquilibrioDiario

  const porCategoria = custosOperacionais.reduce<Record<string, number>>((acc, c) => {
    acc[c.categoria] = (acc[c.categoria] ?? 0) + c.valorMensal
    return acc
  }, {})
  const fixoMensal = custoFixoMensal(custosOperacionais)

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo="Do faturamento ao que realmente sobra no fim do mês."
        acao={
          <div className="abas">
            {PERIODOS.map((p) => (
              <button key={p.dias} onClick={() => setDias(p.dias)}
                className={`${dias === p.dias ? 'aba-ativa' : 'aba-inativa'} px-3 py-1.5 text-xs`}>
                {p.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Receita líquida" valor={brl(dre.receitaLiquida)} numero={dre.receitaLiquida} formatar={brl}
              detalhe={`${brl(faturamentoDiario)} por dia`} tom="ok" />
        <Stat rotulo="Lucro líquido" valor={brl(dre.lucroLiquido)} numero={dre.lucroLiquido} formatar={brl}
              detalhe={`margem de ${dre.margemLiquidaPercentual.toFixed(1)}%`}
              tom={dre.lucroLiquido > 0 ? 'ok' : 'erro'} />
        <Stat rotulo="Ponto de equilíbrio" valor={brl(dre.pontoEquilibrioDiario)}
              numero={dre.pontoEquilibrioDiario} formatar={brl}
              detalhe={acimaDoEquilibrio ? 'faturamento atual cobre' : 'faturamento atual NÃO cobre'}
              tom={acimaDoEquilibrio ? 'ok' : 'erro'} />
        <Stat rotulo="Custo fixo mensal" valor={brl(fixoMensal)} numero={fixoMensal} formatar={brl}
              detalhe={`${brl(fixoMensal / 30)} por dia, chova ou faça sol`} tom="alerta" />
      </div>

      <nav className="abas mb-4 mt-6 flex-wrap">
        {([['resultado', 'Resultado (DRE)'], ['caixa', 'Caixa do dia'], ['custos', 'Custos fixos']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={aba === id ? 'aba-ativa' : 'aba-inativa'}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'resultado' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo={`Demonstrativo de resultado — ${dias} ${dias === 1 ? 'dia' : 'dias'}`}>
            <dl className="space-y-2 text-sm">
              <LinhaDre rotulo="Receita bruta" valor={dre.receitaBruta} />
              {dre.descontos > 0 && <LinhaDre rotulo="(−) Descontos concedidos" valor={-dre.descontos} recuo />}
              <LinhaDre rotulo="Receita líquida" valor={dre.receitaLiquida} forte />

              <div className="pt-2" />
              <LinhaDre rotulo="(−) Custo dos insumos (CMV)" valor={-dre.cmv} recuo />
              <LinhaDre rotulo="Lucro bruto" valor={dre.lucroBruto} forte
                        nota={`${dre.margemBrutaPercentual.toFixed(1)}% de margem`} />

              <div className="pt-2" />
              <LinhaDre rotulo="(−) Taxas de cartão e PIX" valor={-dre.taxasPagamento} recuo />
              <LinhaDre rotulo={`(−) Impostos (Simples ${(ALIQUOTA_SIMPLES * 100).toFixed(0)}%)`}
                        valor={-dre.impostos} recuo />
              <LinhaDre rotulo="(−) Perdas de balcão" valor={-dre.perdas} recuo />
              <LinhaDre rotulo="(−) Custo fixo do período" valor={-dre.custoFixo} recuo />

              <div className="mt-3 flex items-baseline justify-between border-t-2 border-mata-900/15 pt-3">
                <dt className="text-base font-bold text-mata-900">Lucro líquido</dt>
                <dd className={`text-2xl font-extrabold tabular-nums ${
                  dre.lucroLiquido > 0 ? 'text-mata-700' : 'text-red-600'}`}>
                  {brl(dre.lucroLiquido)}
                </dd>
              </div>
              <p className="text-right text-xs text-mata-900/50">
                margem líquida de {dre.margemLiquidaPercentual.toFixed(1)}%
              </p>
            </dl>

            {dre.coberturaCusto < 95 && (
              <p className="mt-4 rounded-xl bg-bela-500/10 px-4 py-3 text-xs text-bela-800">
                O CMV cobre {dre.coberturaCusto.toFixed(0)}% do faturamento — o restante são produtos
                sem ficha técnica, que entram sem custo. Enquanto isso não for 100%, o lucro aqui
                está <strong>superestimado</strong>.
              </p>
            )}
          </Card>

          <div className="space-y-6">
            <Card titulo="Para onde vai cada R$ 100 de venda">
              <Composicao dre={dre} />
            </Card>

            <Card titulo="Ponto de equilíbrio">
              <p className="text-sm text-mata-900/70">
                Para o resultado do período empatar, a padaria precisa faturar{' '}
                <strong className="text-mata-900">{brl(dre.pontoEquilibrioDiario)}</strong> por dia.
                Está faturando <strong className="text-mata-900">{brl(faturamentoDiario)}</strong>.
              </p>
              <div className="mt-4">
                <div className="h-3 overflow-hidden rounded-full bg-mata-900/8">
                  <div className={`h-full rounded-full ${acimaDoEquilibrio ? 'bg-mata-600' : 'bg-red-500'}`}
                       style={{ width: `${Math.min(100, (faturamentoDiario / Math.max(1, dre.pontoEquilibrioDiario)) * 100)}%` }} />
                </div>
                <p className={`mt-2 text-sm font-semibold ${acimaDoEquilibrio ? 'text-mata-700' : 'text-red-600'}`}>
                  {acimaDoEquilibrio
                    ? `${((faturamentoDiario / Math.max(1, dre.pontoEquilibrioDiario) - 1) * 100).toFixed(0)}% acima do equilíbrio`
                    : `Faltam ${brl(dre.pontoEquilibrioDiario - faturamentoDiario)} por dia`}
                </p>
              </div>
              <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
                É o número que responde "posso fechar mais cedo na segunda?". Abaixo dele, o dia dá
                prejuízo mesmo com movimento.
              </p>
            </Card>
          </div>
        </div>
      )}

      {aba === 'resultado' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card titulo="Recebimentos e o custo de receber">
            {Object.keys(porForma).length === 0 ? <Vazio mensagem="Sem recebimentos no período." /> : (
              <>
                <ul className="space-y-3.5">
                  {Object.entries(porForma)
                    .sort(([, a], [, b]) => b.valor - a.valor)
                    .map(([forma, v]) => (
                      <li key={forma}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="font-medium text-mata-900/70">
                            {rotuloForma[forma as FormaPagamento]}
                            <span className="ml-1.5 text-xs text-mata-900/40">
                              taxa {(TAXAS_PAGAMENTO[forma as FormaPagamento] * 100).toFixed(2)}%
                            </span>
                          </span>
                          <span className="tabular-nums">
                            <span className="font-semibold">{brl(v.valor)}</span>
                            {v.taxa > 0 && <span className="ml-2 text-xs text-red-600">− {brl(v.taxa)}</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-mata-900/8">
                          <div className="h-full rounded-full bg-bela-500"
                               style={{ width: `${(v.valor / maiorForma) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                </ul>
                <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
                  Taxa média ponderada de <strong>{(taxaMediaPonderada(vendasPeriodo) * 100).toFixed(2)}%</strong>,
                  custando {brl(dre.taxasPagamento)} no período. Cada ponto migrado de crédito para
                  PIX cai direto no lucro.
                </p>
              </>
            )}
          </Card>

          <Card titulo="Quem dá e quem tira lucro">
            {resultados.length === 0 ? <Vazio mensagem="Sem vendas no período." /> : (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mata-900/45">
                  Maiores geradores
                </p>
                <ul className="space-y-2">
                  {resultados.slice(0, 4).map((r) => (
                    <li key={r.produtoId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-mata-900/70">{r.nome}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-mata-700">
                        {brl(r.lucroLiquido)}
                      </span>
                    </li>
                  ))}
                </ul>

                {resultados.some((r) => r.lucroLiquido < 0) && (
                  <>
                    <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-mata-900/45">
                      Consomem mais do que trazem
                    </p>
                    <ul className="space-y-2">
                      {resultados.filter((r) => r.lucroLiquido < 0).map((r) => (
                        <li key={r.produtoId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-mata-900/70">{r.nome}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-red-600">
                            {brl(r.lucroLiquido)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
                  Análise item a item, com composição de custo e sazonalidade, na aba{' '}
                  <strong className="text-mata-900">Produtos</strong>.
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      {aba === 'caixa' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Caixa de hoje">
            <dl className="space-y-2.5 text-sm">
              <LinhaDre rotulo="Troco inicial" valor={caixa.trocoInicial} />
              <LinhaDre rotulo="Vendas do dia" valor={entradasDia} />
              <LinhaDre rotulo="Suprimentos" valor={suprimentos} />
              <LinhaDre rotulo="Sangrias" valor={-sangrias} />
              <div className="flex justify-between border-t border-mata-900/10 pt-2.5">
                <dt className="font-bold text-mata-900">Saldo do turno</dt>
                <dd className="text-lg font-extrabold tabular-nums">
                  {brl(caixa.trocoInicial + entradasDia + suprimentos - sangrias)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
              Caixa é movimento de dinheiro, não resultado. Uma venda no crédito entra aqui hoje e
              só cai na conta em 30 dias — por isso caixa e lucro nunca batem.
            </p>
          </Card>

          <Card titulo="Movimentações do dia">
            {movDia.length === 0 ? <Vazio mensagem="Nenhuma sangria ou suprimento hoje." /> : (
              <ul className="space-y-3">
                {movDia.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-mata-800">{m.observacao}</p>
                      <p className="text-xs text-mata-900/50">{horaBR(m.criadoEm)}</p>
                    </div>
                    <span className={`font-semibold tabular-nums ${
                      m.motivo === 'SANGRIA' ? 'text-red-600' : 'text-mata-700'}`}>
                      {m.motivo === 'SANGRIA' ? '−' : '+'} {brl(m.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-2">
            <Card titulo="Vendas de hoje">
              {doDia.length === 0 ? <Vazio mensagem="Nenhuma venda registrada." /> : (
                <Tabela cabecalho={['Hora', 'Origem', 'Itens', 'Pagamento', 'Total']}>
                  {doDia.map((v) => (
                    <tr key={v.id}>
                      <td className="td text-xs text-mata-900/50">{horaBR(v.criadaEm)}</td>
                      <td className="td"><Badge tom={v.origem === 'PDV' ? 'neutro' : 'ok'}>{v.origem}</Badge></td>
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
          </div>
        </div>
      )}

      {aba === 'custos' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Despesas fixas mensais">
            <Tabela cabecalho={['Despesa', 'Categoria', 'Por mês', 'Por dia']}>
              {[...custosOperacionais]
                .sort((a, b) => b.valorMensal - a.valorMensal)
                .map((c) => (
                  <tr key={c.id}>
                    <td className="td font-medium text-mata-800">{c.nome}</td>
                    <td className="td"><Badge>{rotuloCategoria[c.categoria]}</Badge></td>
                    <td className="td tabular-nums">{brl(c.valorMensal)}</td>
                    <td className="td tabular-nums text-mata-900/50">{brl(c.valorMensal / 30)}</td>
                  </tr>
                ))}
              <tr className="bg-mata-900/5">
                <td className="td font-bold text-mata-900" colSpan={2}>Total</td>
                <td className="td font-bold tabular-nums">{brl(fixoMensal)}</td>
                <td className="td font-bold tabular-nums">{brl(fixoMensal / 30)}</td>
              </tr>
            </Tabela>
          </Card>

          <Card titulo="Peso de cada categoria">
            <ul className="space-y-3.5">
              {Object.entries(porCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([categoria, valor]) => (
                  <li key={categoria}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-mata-900/70">
                        {rotuloCategoria[categoria as keyof typeof rotuloCategoria]}
                      </span>
                      <span className="tabular-nums">
                        <span className="font-semibold">{brl(valor)}</span>
                        <span className="ml-2 text-xs text-mata-900/45">
                          {((valor / fixoMensal) * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-mata-900/8">
                      <div className="h-full rounded-full bg-mata-600"
                           style={{ width: `${(valor / fixoMensal) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
            <div className="mt-5 rounded-xl bg-mata-900/5 p-4 text-sm">
              <p className="text-mata-900/70">
                O custo fixo consome{' '}
                <strong className="text-mata-900">
                  {dre.receitaLiquida > 0 ? ((dre.custoFixo / dre.receitaLiquida) * 100).toFixed(1) : '—'}%
                </strong>{' '}
                da receita do período.
              </p>
              <p className="mt-2 text-xs text-mata-900/55">
                Ele é rateado sobre cada produto pela participação na receita. É por isso que um item
                pode ter margem bruta alta e ainda assim dar prejuízo.
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

function LinhaDre({ rotulo, valor, forte, recuo, nota }: {
  rotulo: string; valor: number; forte?: boolean; recuo?: boolean; nota?: string
}) {
  const negativo = valor < 0
  return (
    <div className={`flex items-baseline justify-between ${recuo ? 'pl-4' : ''} ${
      forte ? 'border-t border-mata-900/10 pt-2' : ''}`}>
      <dt className={forte ? 'font-semibold text-mata-900' : 'text-mata-900/60'}>
        {rotulo}
        {nota && <span className="ml-2 text-xs text-mata-900/45">{nota}</span>}
      </dt>
      <dd className={`tabular-nums ${
        forte ? 'font-bold text-mata-900' : negativo ? 'text-red-600' : 'text-mata-800'}`}>
        {negativo ? '− ' : ''}{brl(Math.abs(valor))}
      </dd>
    </div>
  )
}

/** Onde cada real de venda é consumido — a leitura mais direta da DRE. */
function Composicao({ dre }: { dre: ReturnType<typeof calcularDre> }) {
  const base = Math.max(dre.receitaLiquida, 0.01)
  const fatias = [
    { rotulo: 'Insumos', valor: dre.cmv, cor: 'bg-bela-600' },
    { rotulo: 'Taxas', valor: dre.taxasPagamento, cor: 'bg-bela-400' },
    { rotulo: 'Impostos', valor: dre.impostos, cor: 'bg-mata-400' },
    { rotulo: 'Perdas', valor: dre.perdas, cor: 'bg-red-400' },
    { rotulo: 'Custo fixo', valor: dre.custoFixo, cor: 'bg-mata-600' },
    { rotulo: 'Lucro', valor: Math.max(0, dre.lucroLiquido), cor: 'bg-mata-800' },
  ].filter((f) => f.valor > 0)

  return (
    <>
      <div className="flex h-6 overflow-hidden rounded-full bg-mata-900/8">
        {fatias.map((f) => (
          <div key={f.rotulo} className={f.cor} style={{ width: `${(f.valor / base) * 100}%` }}
               title={`${f.rotulo}: ${brl(f.valor)}`} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-mata-900/70">
              <span className={`h-2.5 w-2.5 rounded-full ${f.cor}`} />
              {f.rotulo}
            </span>
            <span className="tabular-nums">
              <span className="font-semibold text-mata-900">R$ {((f.valor / base) * 100).toFixed(2)}</span>
              <span className="ml-2 text-xs text-mata-900/45">de cada R$ 100</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
        {num((Math.max(0, dre.lucroLiquido) / base) * 100, 1)}% de cada venda vira lucro. O resto já
        tem dono antes de o dinheiro entrar.
      </p>
    </>
  )
}
