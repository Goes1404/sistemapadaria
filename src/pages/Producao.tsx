import { useState } from 'react'
import { useStore } from '@/store'
import { saldoDoInsumo, selecionarFefo } from '@/lib/fefo'
import { dataBR, dataHoraBR, num } from '@/lib/format'
import { Aviso, Badge, Card, PageHeader, Tabela, Vazio } from '@/components/ui'

export default function Producao() {
  const { fichas, insumos, lotes, fornadas, produtos, pedidos, registrarFornada } = useStore()
  const [fichaId, setFichaId] = useState(fichas[0]?.id ?? '')
  const [quantidade, setQuantidade] = useState('100')
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string; detalhe?: { insumo: string; lote: string; quantidade: number; validade: string }[] } | null>(null)

  const ficha = fichas.find((f) => f.id === fichaId)
  const qtd = Number(quantidade) || 0
  const fator = ficha ? qtd / ficha.rendimento : 0

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'
  const unidade = (id: string) => insumos.find((i) => i.id === id)?.unidade ?? ''

  /** Prévia do que o FEFO vai consumir — sem aplicar nada ainda. */
  const previa = ficha
    ? ficha.itens.map((item) => {
        const necessario = item.quantidade * fator
        const r = selecionarFefo(lotes, item.insumoId, necessario)
        return {
          insumoId: item.insumoId,
          necessario,
          disponivel: saldoDoInsumo(lotes, item.insumoId),
          ok: r.ok,
          consumos: r.consumos,
          faltando: r.faltando,
        }
      })
    : []

  const podeProduzir = previa.length > 0 && previa.every((p) => p.ok) && qtd > 0

  // Pauta de produção: consolida encomendas confirmadas do WhatsApp
  const pauta = pedidos
    .filter((p) => p.status === 'CONFIRMED' || p.status === 'PENDING_CONFIRMATION')
    .flatMap((p) => p.itens)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.produtoId] = (acc[item.produtoId] ?? 0) + item.quantidade
      return acc
    }, {})

  function produzir() {
    if (!ficha) return
    setResultado(registrarFornada(ficha.id, qtd, 'Marcos Vieira'))
  }

  return (
    <>
      <PageHeader
        titulo="Produção"
        subtitulo="Registrar uma fornada dá baixa nos insumos automaticamente, pela regra FEFO."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card titulo="Registrar fornada">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Ficha técnica</label>
                <select className="input" value={fichaId}
                        onChange={(e) => { setFichaId(e.target.value); setResultado(null) }}>
                  {fichas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quantidade produzida</label>
                <input className="input" type="number" min={1} value={quantidade}
                       onChange={(e) => { setQuantidade(e.target.value); setResultado(null) }} />
              </div>
            </div>

            {ficha && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Consumo previsto — lotes escolhidos por validade mais próxima
                </p>
                <ul className="space-y-2.5">
                  {previa.map((p) => (
                    <li key={p.insumoId} className={`rounded-lg border px-4 py-3 ${p.ok ? 'border-stone-200 bg-stone-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-stone-800">{nomeInsumo(p.insumoId)}</span>
                        <span className="text-sm tabular-nums text-stone-600">
                          {num(p.necessario, 3)} {unidade(p.insumoId)}
                          <span className="ml-2 text-xs text-stone-400">
                            (saldo {num(p.disponivel)} {unidade(p.insumoId)})
                          </span>
                        </span>
                      </div>
                      {p.ok ? (
                        <ul className="mt-2 space-y-1">
                          {p.consumos.map((c) => (
                            <li key={c.loteId} className="flex justify-between text-xs text-stone-500">
                              <span>
                                ↳ lote <span className="font-mono">{c.codigo}</span>
                                <span className="ml-1.5 text-stone-400">vence {dataBR(c.dataValidade)}</span>
                              </span>
                              <span className="tabular-nums">−{num(c.quantidade, 3)} {unidade(p.insumoId)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-xs font-semibold text-red-700">
                          Faltam {num(p.faltando, 3)} {unidade(p.insumoId)} para esta fornada.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button className="btn-primary" disabled={!podeProduzir} onClick={produzir}>
                Confirmar fornada
              </button>
              {!podeProduzir && qtd > 0 && (
                <span className="text-xs text-red-600">Estoque insuficiente — a fornada inteira seria abortada.</span>
              )}
            </div>

            {resultado && (
              <div className="mt-4 space-y-3">
                <Aviso tom={resultado.ok ? 'ok' : 'erro'}>{resultado.mensagem}</Aviso>
                {resultado.ok && resultado.detalhe && resultado.detalhe.length > 0 && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Baixas aplicadas
                    </p>
                    <ul className="space-y-1 text-xs text-stone-600">
                      {resultado.detalhe.map((d, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{d.insumo} · lote <span className="font-mono">{d.lote}</span> (vence {dataBR(d.validade)})</span>
                          <span className="tabular-nums">−{num(d.quantidade, 3)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card titulo="Pauta de produção do dia" >
            {Object.keys(pauta).length === 0 ? (
              <Vazio mensagem="Sem encomendas para produzir." />
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(pauta).map(([produtoId, qt]) => (
                  <li key={produtoId} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{produtos.find((p) => p.id === produtoId)?.nome ?? '—'}</span>
                    <span className="font-semibold tabular-nums text-stone-900">{num(qt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              Consolidado das encomendas recebidas pelo WhatsApp.
            </p>
          </Card>

          <Card titulo="Fichas técnicas">
            <ul className="space-y-4">
              {fichas.map((f) => (
                <li key={f.id}>
                  <p className="text-sm font-semibold text-stone-800">{f.nome}</p>
                  <p className="mb-1.5 text-xs text-stone-500">Rende {f.rendimento} un</p>
                  <ul className="space-y-0.5">
                    {f.itens.map((item) => (
                      <li key={item.insumoId} className="flex justify-between text-xs text-stone-600">
                        <span>{nomeInsumo(item.insumoId)}</span>
                        <span className="tabular-nums">{num(item.quantidade, 3)} {unidade(item.insumoId)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Card titulo="Últimas fornadas">
          {fornadas.length === 0 ? <Vazio mensagem="Nenhuma fornada registrada." /> : (
            <Tabela cabecalho={['Quando', 'Produto', 'Quantidade', 'Responsável', 'Lotes consumidos']}>
              {fornadas.slice(0, 15).map((f) => (
                <tr key={f.id}>
                  <td className="td text-xs text-stone-500">{dataHoraBR(f.produzidaEm)}</td>
                  <td className="td font-medium text-stone-800">
                    {fichas.find((x) => x.id === f.fichaTecnicaId)?.nome ?? '—'}
                  </td>
                  <td className="td tabular-nums">{num(f.quantidadeProduzida)} un</td>
                  <td className="td text-stone-600">{f.responsavel}</td>
                  <td className="td">
                    {f.consumos.length === 0
                      ? <span className="text-xs text-stone-400">—</span>
                      : <Badge tom="info">{f.consumos.length} baixas</Badge>}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      </div>
    </>
  )
}
