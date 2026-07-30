import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { brl, num } from '@/lib/format'
import { curvaAbc, indicadores, vendaPorHora, custoDoProduto } from '@/lib/custos'
import { Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 14, rotulo: '14 dias' },
  { dias: 21, rotulo: '21 dias' },
] as const

export default function Bi() {
  const { todasVendas, perdasBalcao, produtos, fichas, lotes, insumos, custoUnitario } = useStore()
  const [dias, setDias] = useState<number>(14)

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'

  const { atual, anterior, porHora, abc } = useMemo(() => {
    const agora = Date.now()
    const janela = dias * 86_400_000

    const noPeriodo = (inicioAtras: number, fimAtras: number) =>
      todasVendas.filter((v) => {
        const t = new Date(v.criadaEm).getTime()
        return t >= agora - inicioAtras && t < agora - fimAtras
      })

    const vendasAtual = noPeriodo(janela, 0)
    const vendasAnterior = noPeriodo(janela * 2, janela)

    const perdasAtual = perdasBalcao.filter(
      (p) => new Date(p.registradoEm).getTime() >= agora - janela,
    )

    const margemDe = (produtoId: string) => {
      const produto = produtos.find((p) => p.id === produtoId)
      if (!produto) return 0
      return custoDoProduto(produto, fichas, lotes, nomeInsumo).margemPercentual
    }

    return {
      atual: indicadores(vendasAtual, perdasAtual, custoUnitario),
      anterior: indicadores(vendasAnterior, [], custoUnitario),
      porHora: vendaPorHora(vendasAtual),
      abc: curvaAbc(vendasAtual, produtos, margemDe),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, todasVendas, perdasBalcao, produtos, fichas, lotes])

  const variacao = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0)
  const varFaturamento = variacao(atual.faturamento, anterior.faturamento)
  const varTicket = variacao(atual.ticketMedio, anterior.ticketMedio)

  const horasAtivas = porHora.filter((h) => h.faturamento > 0)
  const pico = Math.max(1, ...horasAtivas.map((h) => h.faturamento))

  const porClasse = (classe: 'A' | 'B' | 'C') => abc.filter((i) => i.classe === classe)

  return (
    <>
      <PageHeader
        titulo="Inteligência do negócio"
        subtitulo="O painel do dia mostra o agora. Aqui está a tendência."
        acao={
          <div className="flex gap-1 rounded-lg bg-mata-900/8 p-1">
            {PERIODOS.map((p) => (
              <button key={p.dias} onClick={() => setDias(p.dias)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  dias === p.dias ? 'bg-white text-mata-900 shadow-sm' : 'text-mata-900/60 hover:text-mata-900'}`}>
                {p.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Faturamento" valor={brl(atual.faturamento)} numero={atual.faturamento} formatar={brl}
              detalhe={`${varFaturamento >= 0 ? '+' : ''}${varFaturamento.toFixed(1)}% vs. período anterior`}
              tom={varFaturamento >= 0 ? 'ok' : 'erro'} />
        <Stat rotulo="Ticket médio" valor={brl(atual.ticketMedio)} numero={atual.ticketMedio} formatar={brl}
              detalhe={`${varTicket >= 0 ? '+' : ''}${varTicket.toFixed(1)}% · ${atual.itensPorPedido.toFixed(1)} itens/pedido`}
              tom={varTicket >= 0 ? 'ok' : 'alerta'} />
        <Stat rotulo="Margem bruta"
              valor={atual.coberturaFicha < 5 ? '—' : `${atual.margemPercentual.toFixed(1)}%`}
              detalhe={
                atual.coberturaFicha < 5
                  ? 'sem ficha técnica suficiente para calcular'
                  : `sobre ${atual.coberturaFicha.toFixed(0)}% do faturamento · CMV ${brl(atual.cmv)}`
              }
              tom={atual.coberturaFicha < 40 ? 'alerta' : atual.margemPercentual > 50 ? 'ok' : 'alerta'} />
        <Stat rotulo="Perdas" valor={`${atual.perdaPercentual.toFixed(1)}%`}
              numero={atual.perdaPercentual} formatar={(n) => `${n.toFixed(1)}%`}
              detalhe={`${brl(atual.custoPerdas)} do faturamento`}
              tom={atual.perdaPercentual > 3 ? 'erro' : 'ok'} />
      </div>

      <div className="mt-6">
        <Card titulo="Venda por faixa de horário">
          {horasAtivas.length === 0 ? <Vazio mensagem="Sem vendas no período." /> : (
            <>
              <div className="flex h-56 items-stretch gap-1.5">
                {porHora
                  .filter((h) => h.hora >= 5 && h.hora <= 20)
                  .map((h) => {
                    const altura = (h.faturamento / pico) * 100
                    const forte = altura > 70
                    return (
                      <div key={h.hora} className="group flex flex-1 flex-col">
                        {/* A coluna ocupa toda a altura; a barra cresce a partir do rodapé. */}
                        <div className="flex flex-1 flex-col justify-end">
                          <span className="mb-1 text-center text-[10px] font-semibold tabular-nums text-transparent transition-colors group-hover:text-mata-900/70">
                            {brl(h.faturamento)}
                          </span>
                          <div
                            className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${
                              forte ? 'bg-gradient-to-t from-bela-600 to-bela-400' : 'bg-mata-500/40'}`}
                            style={{ height: `${Math.max(2, altura)}%` }}
                            title={`${h.hora}h — ${brl(h.faturamento)} em ${h.pedidos} pedidos`}
                          />
                        </div>
                        <span className="mt-1.5 text-center text-[10px] tabular-nums text-mata-900/45">{h.hora}h</span>
                      </div>
                    )
                  })}
              </div>
              <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
                As duas barras douradas são os picos da padaria — manhã e fim de tarde. É esta curva
                que diz onde alocar equipe e a que horas tirar fornada, as duas maiores alavancas de
                custo da operação.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {(['A', 'B', 'C'] as const).map((classe) => {
          const itens = porClasse(classe)
          const faturamento = itens.reduce((s, i) => s + i.faturamento, 0)
          const descricao = {
            A: 'Carregam o faturamento. Nunca podem faltar.',
            B: 'Giro intermediário. Reposição regular.',
            C: 'Cauda longa. Reveja se ocupam prateleira à toa.',
          }[classe]
          const tom = { A: 'ok', B: 'alerta', C: 'neutro' } as const

          return (
            <Card key={classe} titulo={`Classe ${classe} — ${itens.length} produtos`}>
              <p className="mb-3 text-2xl font-extrabold tabular-nums text-mata-900">{brl(faturamento)}</p>
              <ul className="space-y-2">
                {itens.slice(0, 6).map((i) => (
                  <li key={i.produtoId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-mata-900/70">{i.nome}</span>
                    <span className="shrink-0 tabular-nums text-mata-900/50">{i.participacao.toFixed(1)}%</span>
                  </li>
                ))}
                {itens.length === 0 && <li className="py-4 text-center text-xs text-mata-900/35">—</li>}
              </ul>
              <p className="mt-3 border-t border-mata-900/10 pt-2.5 text-xs text-mata-900/55">
                <Badge tom={tom[classe]}>{classe}</Badge> <span className="ml-1">{descricao}</span>
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mt-6">
        <Card titulo="Curva ABC detalhada">
          {abc.length === 0 ? <Vazio mensagem="Sem dados no período." /> : (
            <Tabela cabecalho={['Produto', 'Classe', 'Vendidos', 'Faturamento', '% do total', 'Acumulado', 'Margem']}>
              {abc.map((i) => (
                <tr key={i.produtoId}>
                  <td className="td font-medium text-mata-800">{i.nome}</td>
                  <td className="td">
                    <Badge tom={i.classe === 'A' ? 'ok' : i.classe === 'B' ? 'alerta' : 'neutro'}>{i.classe}</Badge>
                  </td>
                  <td className="td tabular-nums">{num(i.quantidade)}</td>
                  <td className="td tabular-nums">{brl(i.faturamento)}</td>
                  <td className="td tabular-nums">{i.participacao.toFixed(1)}%</td>
                  <td className="td tabular-nums text-mata-900/50">{i.participacaoAcumulada.toFixed(1)}%</td>
                  <td className={`td tabular-nums font-semibold ${
                    i.margemPercentual === 0 ? 'text-mata-900/35'
                      : i.margemPercentual > 50 ? 'text-mata-700' : 'text-bela-700'}`}>
                    {i.margemPercentual === 0 ? 'sem ficha' : `${i.margemPercentual.toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      </div>

      <p className="mt-4 rounded-xl bg-bela-500/10 px-4 py-3 text-xs text-bela-800">
        <strong>Sobre a margem:</strong> só entram no cálculo os produtos com ficha técnica
        cadastrada — hoje {atual.coberturaFicha.toFixed(0)}% do faturamento. Produto sem ficha
        entraria com custo zero e inflaria o resultado. Cadastrar as fichas restantes é o que
        transforma este número em algo em que dá para confiar.
      </p>
    </>
  )
}
