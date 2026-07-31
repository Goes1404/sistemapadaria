import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { brl, num } from '@/lib/format'
import { custoDoProduto } from '@/lib/custos'
import {
  ALIQUOTA_SIMPLES, melhorFatia, porDiaSemanaDoProduto,
  porHoraDoProduto, porMesDoProduto, resultadoPorProduto, taxaMediaPonderada,
  type FatiaTempo, type ResultadoProduto,
} from '@/lib/financeiro'
import { Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'

const PERIODOS = [
  { dias: 30, rotulo: '30 dias' },
  { dias: 60, rotulo: '60 dias' },
  { dias: 120, rotulo: '120 dias' },
] as const

type Ordem = 'lucro' | 'receita' | 'margem' | 'quantidade'

export default function Produtos() {
  const {
    todasVendas, perdasBalcao, produtos, fichas, lotes, insumos,
    custosOperacionais, custoUnitario,
  } = useStore()

  const [dias, setDias] = useState<number>(30)
  const [ordem, setOrdem] = useState<Ordem>('lucro')
  const [selecionado, setSelecionado] = useState<string | null>(null)

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'

  const { resultados, vendasPeriodo } = useMemo(() => {
    const corte = Date.now() - dias * 86_400_000
    const vendas = todasVendas.filter((v) => new Date(v.criadaEm).getTime() >= corte)
    const perdas = perdasBalcao.filter((p) => new Date(p.registradoEm).getTime() >= corte)
    return {
      vendasPeriodo: vendas,
      resultados: resultadoPorProduto({
        vendas, perdas, produtos, custos: custosOperacionais, dias, custoUnitarioDe: custoUnitario,
      }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, todasVendas, perdasBalcao, produtos, custosOperacionais, fichas, lotes])

  const ordenados = useMemo(() => {
    const copia = [...resultados]
    const criterio: Record<Ordem, (r: ResultadoProduto) => number> = {
      lucro: (r) => r.lucroLiquido,
      receita: (r) => r.receita,
      margem: (r) => r.margemContribuicaoPercentual,
      quantidade: (r) => r.quantidade,
    }
    return copia.sort((a, b) => criterio[ordem](b) - criterio[ordem](a))
  }, [resultados, ordem])

  const detalhe = resultados.find((r) => r.produtoId === selecionado) ?? ordenados[0]

  const lucroTotal = resultados.reduce((s, r) => s + r.lucroLiquido, 0)
  /** Negativo mesmo ANTES do rateio: aí sim o item destrói valor. */
  const destroemValor = resultados.filter((r) => r.margemContribuicao < 0)
  /** Positivo na contribuição, negativo só após o rateio do custo fixo. */
  const subsidiados = resultados.filter((r) => r.margemContribuicao >= 0 && r.lucroLiquido < 0)
  const taxaMedia = taxaMediaPonderada(vendasPeriodo)

  return (
    <>
      <PageHeader
        titulo="Análise por produto"
        subtitulo="Quanto cada item custa, quanto sobra dele, e quando ele vende."
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
        <Stat rotulo="Lucro líquido do período" valor={brl(lucroTotal)} numero={lucroTotal} formatar={brl}
              detalhe="depois de insumo, taxa, imposto e fixo" tom={lucroTotal > 0 ? 'ok' : 'erro'} />
        <Stat rotulo="Produtos analisados" valor={String(resultados.length)}
              numero={resultados.length} formatar={(n) => String(Math.round(n))}
              detalhe={`${resultados.filter((r) => r.temCusto).length} com custo apurado`} />
        <Stat rotulo="Destroem valor" valor={String(destroemValor.length)}
              numero={destroemValor.length} formatar={(n) => String(Math.round(n))}
              detalhe={destroemValor.length
                ? 'não cobrem nem o próprio custo variável'
                : 'todos cobrem o próprio custo'}
              tom={destroemValor.length ? 'erro' : 'ok'} />
        <Stat rotulo="Taxa média de recebimento" valor={`${(taxaMedia * 100).toFixed(2)}%`}
              numero={taxaMedia * 100} formatar={(n) => `${n.toFixed(2)}%`}
              detalhe="ponderada pelas formas usadas" tom={taxaMedia > 0.025 ? 'alerta' : 'ok'} />
      </div>

      {destroemValor.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-300/50 bg-red-500/10 px-4 py-3.5 text-sm text-mata-900/80">
          <strong className="text-red-800">
            {destroemValor.length} produto{destroemValor.length > 1 ? 's não cobrem' : ' não cobre'} nem
            o próprio custo variável:
          </strong>{' '}
          {destroemValor.map((r) => r.nome).join(', ')}. Cada unidade vendida deixa a padaria pior.
          Aqui a decisão é objetiva: subir o preço, baixar o custo, ou tirar do cardápio.
        </div>
      )}

      {subsidiados.length > 0 && (
        <div className="mt-6 rounded-xl border border-bela-400/40 bg-bela-500/10 px-4 py-3.5 text-sm text-mata-900/80">
          <strong className="text-bela-800">
            {subsidiados.length} produto{subsidiados.length > 1 ? 's ficam' : ' fica'} negativo
            {subsidiados.length > 1 ? 's' : ''} só depois do rateio do custo fixo:
          </strong>{' '}
          {subsidiados.map((r) => r.nome).join(', ')}.{' '}
          <strong className="text-mata-900">Não tire do cardápio.</strong> A margem de contribuição
          deles é positiva — ou seja, ajudam a pagar o aluguel e a folha. Sem eles, o mesmo custo
          fixo se espalharia sobre menos produtos e o resultado da padaria pioraria. O caminho é
          rever preço ou negociar o insumo.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Lista */}
        <div className="lg:col-span-3">
          <Card
            titulo="Resultado por produto · clique para detalhar"
            acao={
              <select className="input w-auto py-1 text-xs" value={ordem}
                      onChange={(e) => setOrdem(e.target.value as Ordem)}>
                <option value="lucro">Ordenar por lucro</option>
                <option value="receita">Ordenar por receita</option>
                <option value="margem">Ordenar por margem de contribuição</option>
                <option value="quantidade">Ordenar por quantidade</option>
              </select>
            }
          >
            {ordenados.length === 0 ? <Vazio mensagem="Sem vendas no período." /> : (
              <Tabela cabecalho={['Produto', 'Vendidos', 'Receita', 'M. contribuição', 'Lucro líquido']}>
                {ordenados.map((r) => (
                  <tr key={r.produtoId}
                      className={`linha-clicavel ${
                        detalhe?.produtoId === r.produtoId
                          ? 'bg-bela-500/15 shadow-[inset_3px_0_0_0_theme(colors.bela.500)]'
                          : ''}`}
                      onClick={() => setSelecionado(r.produtoId)}>
                    <td className="td font-medium text-mata-800">
                      {r.nome}
                      {r.origemCusto === 'REVENDA' && (
                        <span className="ml-1.5 text-[10px] font-semibold text-mata-900/40">revenda</span>
                      )}
                    </td>
                    <td className="td tabular-nums">{num(r.quantidade, 1)}</td>
                    <td className="td tabular-nums">{brl(r.receita)}</td>
                    <td className={`td whitespace-nowrap tabular-nums ${
                      r.margemContribuicao > 0 ? 'text-mata-700' : 'text-red-600'}`}>
                      {brl(r.margemContribuicao)}
                      <span className="ml-1.5 text-xs text-mata-900/40">
                        {r.margemContribuicaoPercentual.toFixed(0)}%
                      </span>
                    </td>
                    <td className={`td whitespace-nowrap tabular-nums font-semibold ${
                      r.lucroLiquido > 0 ? 'text-mata-700' : 'text-red-600'}`}>
                      {brl(r.lucroLiquido)}
                      <span className="ml-1.5 text-xs font-normal text-mata-900/40">
                        {r.margemLiquidaPercentual.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Card>
        </div>

        {/* Detalhe do selecionado */}
        <div className="space-y-6 lg:col-span-2">
          {detalhe ? (
            <>
              <Card titulo="Do preço ao lucro">
                <p className="mb-1 text-sm font-bold text-mata-900">{detalhe.nome}</p>
                <p className="mb-4 text-xs text-mata-900/50">
                  {num(detalhe.quantidade, 1)} vendidos · preço médio {brl(detalhe.precoMedio)}
                </p>

                <Cascata resultado={detalhe} />

                <div className="mt-4 space-y-1.5 border-t border-mata-900/10 pt-3 text-sm">
                  <Linha rotulo="Receita" valor={detalhe.receita} />
                  <Linha rotulo="Insumos (CMV)" valor={-detalhe.cmv} />
                  <Linha rotulo={`Taxa de recebimento (${(taxaMedia * 100).toFixed(2)}%)`} valor={-detalhe.taxas} />
                  <Linha rotulo={`Imposto (${(ALIQUOTA_SIMPLES * 100).toFixed(0)}%)`} valor={-detalhe.imposto} />
                  {detalhe.perdas > 0 && <Linha rotulo="Perdas do produto" valor={-detalhe.perdas} />}
                  <div className="flex justify-between border-t border-mata-900/10 pt-2">
                    <span className="font-semibold text-mata-800">Margem de contribuição</span>
                    <span className={`font-bold tabular-nums ${
                      detalhe.margemContribuicao > 0 ? 'text-mata-700' : 'text-red-600'}`}>
                      {brl(detalhe.margemContribuicao)}
                    </span>
                  </div>
                  <Linha rotulo="Custo fixo rateado" valor={-detalhe.custoFixoRateado} />
                  <div className="flex justify-between border-t border-mata-900/10 pt-2">
                    <span className="font-bold text-mata-900">Lucro líquido</span>
                    <span className={`text-lg font-extrabold tabular-nums ${
                      detalhe.lucroLiquido > 0 ? 'text-mata-700' : 'text-red-600'}`}>
                      {brl(detalhe.lucroLiquido)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-mata-900/55">
                    <span>Por unidade vendida</span>
                    <span className="tabular-nums">{brl(detalhe.lucroPorUnidade)}</span>
                  </div>
                </div>

                <p className="mt-3 rounded-lg bg-mata-900/5 px-3 py-2 text-[11px] text-mata-900/55">
                  Taxa, imposto e custo fixo são rateados pela participação do produto na receita
                  ({detalhe.participacaoReceita.toFixed(1)}%). É rateio, não custo medido.{' '}
                  <strong className="text-mata-900">
                    Para decidir se mantém o item no cardápio, olhe a margem de contribuição
                  </strong>{' '}
                  — enquanto ela for positiva, o produto ajuda a pagar o custo fixo.
                </p>
              </Card>

              <ComposicaoCusto produtoId={detalhe.produtoId} />
            </>
          ) : (
            <Card><Vazio mensagem="Selecione um produto na lista." /></Card>
          )}
        </div>
      </div>

      {detalhe && (
        <div className="mt-6 space-y-6">
          <Sazonalidade titulo={`Quando ${detalhe.nome} vende`} produtoId={detalhe.produtoId}
                        vendas={vendasPeriodo} />
        </div>
      )}
    </>
  )

  function ComposicaoCusto({ produtoId }: { produtoId: string }) {
    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) return null
    const custo = custoDoProduto(produto, fichas, lotes, nomeInsumo)

    if (!custo.temFicha) {
      return (
        <Card titulo="Composição do custo">
          <Vazio mensagem="Este produto não tem ficha técnica. Sem ela, não há custo para decompor." />
        </Card>
      )
    }

    const maior = Math.max(0.0001, ...custo.composicao.map((c) => c.custo))

    return (
      <Card titulo="Composição do custo unitário">
        <p className="mb-3 text-2xl font-extrabold tabular-nums text-mata-900">
          {brl(custo.custoUnitario)}
          <span className="ml-2 text-xs font-normal text-mata-900/45">por unidade vendida</span>
        </p>
        <ul className="space-y-3">
          {custo.composicao.map((c, i) => (
            <li key={c.insumoId || i}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-mata-900/70">{c.nome}</span>
                <span className="tabular-nums text-mata-900/60">
                  {brl(c.custo)} <span className="text-xs text-mata-900/40">{c.participacao.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-mata-900/8">
                <div className="h-full rounded-full bg-bela-500" style={{ width: `${(c.custo / maior) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
          O insumo do topo é onde negociar preço com o fornecedor rende mais. Mexer nos de baixo
          quase não muda o resultado.
        </p>
      </Card>
    )
  }
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  const negativo = valor < 0
  return (
    <div className="flex justify-between">
      <span className="text-mata-900/60">{rotulo}</span>
      <span className={`tabular-nums ${negativo ? 'text-red-600' : 'text-mata-800'}`}>
        {negativo ? '− ' : ''}{brl(Math.abs(valor))}
      </span>
    </div>
  )
}

/** Barra empilhada mostrando para onde vai cada real de receita do produto. */
function Cascata({ resultado }: { resultado: ResultadoProduto }) {
  const r = resultado
  const base = Math.max(r.receita, 0.01)
  const fatias = [
    { rotulo: 'Insumos', valor: r.cmv, cor: 'bg-bela-600' },
    { rotulo: 'Taxa', valor: r.taxas, cor: 'bg-bela-400' },
    { rotulo: 'Imposto', valor: r.imposto, cor: 'bg-mata-400' },
    { rotulo: 'Perdas', valor: r.perdas, cor: 'bg-red-400' },
    { rotulo: 'Custo fixo', valor: r.custoFixoRateado, cor: 'bg-mata-600' },
    { rotulo: 'Lucro', valor: Math.max(0, r.lucroLiquido), cor: 'bg-mata-800' },
  ].filter((f) => f.valor > 0)

  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-mata-900/8">
        {fatias.map((f) => (
          <div key={f.rotulo} className={f.cor} style={{ width: `${(f.valor / base) * 100}%` }}
               title={`${f.rotulo}: ${brl(f.valor)}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {fatias.map((f) => (
          <span key={f.rotulo} className="flex items-center gap-1 text-[11px] text-mata-900/55">
            <span className={`h-2 w-2 rounded-full ${f.cor}`} />
            {f.rotulo} {((f.valor / base) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  )
}

/** Três recortes de quando o produto vende: hora, dia da semana e mês. */
function Sazonalidade({ titulo, produtoId, vendas }: {
  titulo: string
  produtoId: string
  vendas: Parameters<typeof porHoraDoProduto>[0]
}) {
  const porHora = porHoraDoProduto(vendas, produtoId).filter((f) => Number(f.chave) >= 5 && Number(f.chave) <= 20)
  const porDia = porDiaSemanaDoProduto(vendas, produtoId)
  const porMes = porMesDoProduto(vendas, produtoId)

  const melhorHora = melhorFatia(porHora)
  const melhorDia = melhorFatia(porDia)
  const melhorMes = melhorFatia(porMes)

  return (
    <Card titulo={titulo}>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Destaque rotulo="Melhor horário" valor={melhorHora?.rotulo ?? '—'}
                  detalhe={melhorHora ? `${brl(melhorHora.receita)} no período` : 'sem dados'} />
        <Destaque rotulo="Melhor dia da semana" valor={melhorDia?.rotulo ?? '—'}
                  detalhe={melhorDia ? `${brl(melhorDia.receita)} acumulados` : 'sem dados'} />
        <Destaque rotulo="Melhor mês" valor={melhorMes?.rotulo ?? '—'}
                  detalhe={melhorMes ? `${brl(melhorMes.receita)} no mês` : 'sem dados'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Barras titulo="Por hora" fatias={porHora} />
        <Barras titulo="Por dia da semana" fatias={porDia} />
        <Barras titulo="Por mês" fatias={porMes} />
      </div>
    </Card>
  )
}

function Destaque({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-xl bg-mata-900/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mata-900/45">{rotulo}</p>
      <p className="mt-0.5 text-lg font-extrabold text-mata-900">{valor}</p>
      <p className="text-[11px] text-mata-900/50">{detalhe}</p>
    </div>
  )
}

function Barras({ titulo, fatias }: { titulo: string; fatias: FatiaTempo[] }) {
  const pico = Math.max(0.01, ...fatias.map((f) => f.receita))
  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-mata-900/45">{titulo}</p>
      <ul className="space-y-1.5">
        {fatias.map((f) => (
          <li key={f.chave} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-mata-900/50">
              {f.rotulo}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-mata-900/8">
              <div
                className={`h-full rounded-full ${
                  f.receita === pico ? 'bg-gradient-to-r from-bela-400 to-bela-600' : 'bg-mata-500/40'}`}
                style={{ width: `${Math.max(1, (f.receita / pico) * 100)}%` }}
                title={`${f.rotulo}: ${brl(f.receita)} · ${num(f.quantidade, 1)} vendidos`}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-mata-900/50">
              {brl(f.receita)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

