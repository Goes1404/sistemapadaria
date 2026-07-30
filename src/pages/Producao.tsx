import { useState } from 'react'
import { useStore } from '@/store'
import { saldoDoInsumo, selecionarFefo } from '@/lib/fefo'
import { dataBR, dataHoraBR, num } from '@/lib/format'
import { Aviso, Badge, Card, PageHeader, Tabela, Vazio } from '@/components/ui'
import { Modal } from '@/pages/Estoque'
import type { FichaTecnicaItem } from '@/types'

export default function Producao() {
  const { fichas, insumos, lotes, fornadas, produtos, pedidos, registrarFornada, cadastrarFicha } = useStore()
  const [fichaId, setFichaId] = useState(fichas[0]?.id ?? '')
  const [quantidade, setQuantidade] = useState('100')
  const [abrirFicha, setAbrirFicha] = useState(false)
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
        acao={<button className="btn-primary" onClick={() => setAbrirFicha(true)}>Nova ficha técnica</button>}
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
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mata-900/50">
                  Consumo previsto — lotes escolhidos por validade mais próxima
                </p>
                <ul className="space-y-2.5">
                  {previa.map((p) => (
                    <li key={p.insumoId} className={`rounded-lg border px-4 py-3 ${p.ok ? 'border-white/50 bg-white/40' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-mata-800">{nomeInsumo(p.insumoId)}</span>
                        <span className="text-sm tabular-nums text-mata-900/60">
                          {num(p.necessario, 3)} {unidade(p.insumoId)}
                          <span className="ml-2 text-xs text-mata-900/35">
                            (saldo {num(p.disponivel)} {unidade(p.insumoId)})
                          </span>
                        </span>
                      </div>
                      {p.ok ? (
                        <ul className="mt-2 space-y-1">
                          {p.consumos.map((c) => (
                            <li key={c.loteId} className="flex justify-between text-xs text-mata-900/50">
                              <span>
                                ↳ lote <span className="font-mono">{c.codigo}</span>
                                <span className="ml-1.5 text-mata-900/35">vence {dataBR(c.dataValidade)}</span>
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
                  <div className="rounded-lg border border-white/50 bg-white/40 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mata-900/50">
                      Baixas aplicadas
                    </p>
                    <ul className="space-y-1 text-xs text-mata-900/60">
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
                    <span className="text-mata-700">{produtos.find((p) => p.id === produtoId)?.nome ?? '—'}</span>
                    <span className="font-semibold tabular-nums text-mata-900">{num(qt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-white/40 pt-3 text-xs text-mata-900/50">
              Consolidado das encomendas recebidas pelo WhatsApp.
            </p>
          </Card>

          <Card
            titulo="Fichas técnicas"
            acao={
              <button onClick={() => setAbrirFicha(true)}
                      className="text-xs font-semibold text-bela-700 hover:underline">
                Cadastrar
              </button>
            }
          >
            <ul className="space-y-4">
              {fichas.map((f) => (
                <li key={f.id}>
                  <p className="text-sm font-semibold text-mata-800">{f.nome}</p>
                  <p className="mb-1.5 text-xs text-mata-900/50">Rende {f.rendimento} un</p>
                  <ul className="space-y-0.5">
                    {f.itens.map((item) => (
                      <li key={item.insumoId} className="flex justify-between text-xs text-mata-900/60">
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
                  <td className="td text-xs text-mata-900/50">{dataHoraBR(f.produzidaEm)}</td>
                  <td className="td font-medium text-mata-800">
                    {fichas.find((x) => x.id === f.fichaTecnicaId)?.nome ?? '—'}
                  </td>
                  <td className="td tabular-nums">{num(f.quantidadeProduzida)} un</td>
                  <td className="td text-mata-900/60">{f.responsavel}</td>
                  <td className="td">
                    {f.consumos.length === 0
                      ? <span className="text-xs text-mata-900/35">—</span>
                      : <Badge tom="info">{f.consumos.length} baixas</Badge>}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      </div>

      {abrirFicha && <ModalFicha onFechar={() => setAbrirFicha(false)} />}
    </>
  )

  function ModalFicha({ onFechar }: { onFechar: () => void }) {
    const [nome, setNome] = useState('')
    const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '')
    const [rendimento, setRendimento] = useState('')
    const [itens, setItens] = useState<FichaTecnicaItem[]>([])
    const [insumoSel, setInsumoSel] = useState(insumos[0]?.id ?? '')
    const [qtdSel, setQtdSel] = useState('')
    const [erro, setErro] = useState('')

    function incluirItem() {
      const q = Number(qtdSel)
      if (q <= 0) return setErro('Informe uma quantidade maior que zero.')
      if (itens.some((i) => i.insumoId === insumoSel)) return setErro('Esse insumo já está na receita.')
      setItens((atual) => [...atual, { insumoId: insumoSel, quantidade: q }])
      setQtdSel('')
      setErro('')
    }

    function salvar(e: React.FormEvent) {
      e.preventDefault()
      if (!nome.trim()) return setErro('Dê um nome à ficha.')
      if (Number(rendimento) <= 0) return setErro('O rendimento deve ser maior que zero.')
      if (itens.length === 0) return setErro('A receita precisa de pelo menos um insumo.')
      cadastrarFicha({ nome: nome.trim(), produtoId, rendimento: Number(rendimento), itens })
      onFechar()
    }

    return (
      <Modal titulo="Nova ficha técnica" onFechar={onFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Nome da ficha</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)}
                   placeholder="Pão de Queijo — fornada de 50 un" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Produto final</label>
              <select className="input" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rendimento (un)</label>
              <input className="input" type="number" min={1} value={rendimento}
                     onChange={(e) => setRendimento(e.target.value)} placeholder="50" />
            </div>
          </div>

          <div>
            <label className="label">Insumos da receita</label>
            {itens.length > 0 && (
              <ul className="mb-2.5 space-y-1.5">
                {itens.map((i) => (
                  <li key={i.insumoId}
                      className="flex items-center justify-between rounded-md bg-white/40 px-3 py-2 text-sm ring-1 ring-white/60">
                    <span className="text-mata-700">{nomeInsumo(i.insumoId)}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-mata-900/60">
                        {num(i.quantidade, 3)} {unidade(i.insumoId)}
                      </span>
                      <button type="button" onClick={() => setItens((a) => a.filter((x) => x.insumoId !== i.insumoId))}
                              className="text-mata-900/35 hover:text-red-600">×</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select className="input" value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)}>
                {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
              </select>
              <input className="input w-28" type="number" step="0.001" placeholder="Qtd"
                     value={qtdSel} onChange={(e) => setQtdSel(e.target.value)} />
              <button type="button" className="btn-ghost shrink-0" onClick={incluirItem}>+</button>
            </div>
            <p className="mt-1.5 text-xs text-mata-900/50">
              Quantidade total para o rendimento informado — não por unidade.
            </p>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar ficha</button>
          </div>
        </form>
      </Modal>
    )
  }
}
