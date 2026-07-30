import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { JANELA_AMARELO, classificarFarol, diasParaVencer, saldoDoInsumo } from '@/lib/fefo'
import { brl, dataBR, dataHoraBR, num } from '@/lib/format'
import { Badge, BadgeFarol, Card, PageHeader, Tabela, Vazio } from '@/components/ui'
import type { Farol, Unidade } from '@/types'

type Aba = 'lotes' | 'insumos' | 'movimentos'

export default function Estoque() {
  const { insumos, lotes, movimentosEstoque, cadastrarLote, cadastrarInsumo, descartarLote } = useStore()
  const [aba, setAba] = useState<Aba>('lotes')
  const [filtro, setFiltro] = useState<Farol | 'TODOS'>('TODOS')
  const [janela, setJanela] = useState(JANELA_AMARELO)
  const [abrirLote, setAbrirLote] = useState(false)
  const [abrirInsumo, setAbrirInsumo] = useState(false)

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'
  const unidade = (id: string) => insumos.find((i) => i.id === id)?.unidade ?? ''

  const enriquecidos = useMemo(
    () =>
      lotes
        .map((l) => ({ ...l, farol: classificarFarol(l.dataValidade, janela), dias: diasParaVencer(l.dataValidade) }))
        .sort((a, b) => a.dias - b.dias),
    [lotes, janela],
  )

  const visiveis = filtro === 'TODOS' ? enriquecidos : enriquecidos.filter((l) => l.farol === filtro)

  const contagem = {
    VERMELHO: enriquecidos.filter((l) => l.farol === 'VERMELHO' && l.quantidadeAtual > 0).length,
    AMARELO: enriquecidos.filter((l) => l.farol === 'AMARELO' && l.quantidadeAtual > 0).length,
    VERDE: enriquecidos.filter((l) => l.farol === 'VERDE' && l.quantidadeAtual > 0).length,
  }

  return (
    <>
      <PageHeader
        titulo="Estoque"
        subtitulo="Cada lote é uma entidade independente — saldos não se misturam."
        acao={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setAbrirInsumo(true)}>Novo insumo</button>
            <button className="btn-primary" onClick={() => setAbrirLote(true)}>Entrada de lote</button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(['VERMELHO', 'AMARELO', 'VERDE'] as const).map((f) => {
          const rotulos = { VERMELHO: 'Vencidos / vencem hoje', AMARELO: `Vencem em até ${janela} dias`, VERDE: 'No prazo' }
          return (
            <button
              key={f}
              onClick={() => setFiltro(filtro === f ? 'TODOS' : f)}
              className={`card card-pad text-left transition-all ${filtro === f ? 'ring-2 ring-crosta-500' : 'hover:border-stone-300'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{rotulos[f]}</p>
                <BadgeFarol farol={f} texto={f === 'VERMELHO' ? '🔴' : f === 'AMARELO' ? '🟡' : '🟢'} />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{contagem[f]}</p>
              <p className="mt-0.5 text-xs text-stone-500">lotes com saldo</p>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-lg bg-stone-200/70 p-1">
          {([['lotes', 'Lotes'], ['insumos', 'Insumos'], ['movimentos', 'Movimentações']] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                aba === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
              {rotulo}
            </button>
          ))}
        </nav>
        {aba === 'lotes' && (
          <label className="ml-auto flex items-center gap-2 text-xs text-stone-600">
            Alerta amarelo com
            <input type="number" min={1} max={30} value={janela}
                   onChange={(e) => setJanela(Math.max(1, Number(e.target.value)))}
                   className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm" />
            dias de antecedência
          </label>
        )}
        {filtro !== 'TODOS' && (
          <button onClick={() => setFiltro('TODOS')} className="text-xs font-semibold text-crosta-700 hover:underline">
            Limpar filtro
          </button>
        )}
      </div>

      {aba === 'lotes' && (
        <Card>
          {visiveis.length === 0 ? <Vazio mensagem="Nenhum lote nesse filtro." /> : (
            <Tabela cabecalho={['Insumo', 'Lote', 'Saldo', 'Validade', 'Situação', 'Valor', '']}>
              {visiveis.map((l) => (
                <tr key={l.id} className={l.quantidadeAtual === 0 ? 'opacity-45' : ''}>
                  <td className="td font-medium text-stone-800">{nomeInsumo(l.insumoId)}</td>
                  <td className="td font-mono text-xs text-stone-500">{l.codigo}</td>
                  <td className="td tabular-nums">
                    {num(l.quantidadeAtual)} <span className="text-xs text-stone-400">{unidade(l.insumoId)}</span>
                  </td>
                  <td className="td tabular-nums">{dataBR(l.dataValidade)}</td>
                  <td className="td">
                    {l.quantidadeAtual === 0
                      ? <Badge>Esgotado</Badge>
                      : <BadgeFarol farol={l.farol}
                          texto={l.dias < 0 ? `venceu há ${Math.abs(l.dias)}d` : l.dias === 0 ? 'vence hoje' : `em ${l.dias}d`} />}
                  </td>
                  <td className="td tabular-nums">{brl(l.quantidadeAtual * l.custoUnitario)}</td>
                  <td className="td text-right">
                    {l.quantidadeAtual > 0 && l.farol === 'VERMELHO' && (
                      <button onClick={() => descartarLote(l.id)}
                              className="text-xs font-semibold text-red-600 hover:underline">
                        Descartar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      )}

      {aba === 'insumos' && (
        <Card>
          <Tabela cabecalho={['Insumo', 'Saldo total', 'Estoque mínimo', 'Lotes ativos', 'Situação']}>
            {insumos.map((i) => {
              const saldo = saldoDoInsumo(lotes, i.id)
              const ativos = lotes.filter((l) => l.insumoId === i.id && l.quantidadeAtual > 0).length
              const abaixo = saldo < i.estoqueMinimo
              return (
                <tr key={i.id}>
                  <td className="td font-medium text-stone-800">{i.nome}</td>
                  <td className="td tabular-nums">{num(saldo)} <span className="text-xs text-stone-400">{i.unidade}</span></td>
                  <td className="td tabular-nums text-stone-500">{num(i.estoqueMinimo)} {i.unidade}</td>
                  <td className="td tabular-nums">{ativos}</td>
                  <td className="td">{abaixo ? <Badge tom="alerta">Repor</Badge> : <Badge tom="ok">Suficiente</Badge>}</td>
                </tr>
              )
            })}
          </Tabela>
        </Card>
      )}

      {aba === 'movimentos' && (
        <Card>
          {movimentosEstoque.length === 0 ? <Vazio mensagem="Sem movimentações." /> : (
            <Tabela cabecalho={['Quando', 'Insumo', 'Lote', 'Quantidade', 'Motivo', 'Referência']}>
              {movimentosEstoque.slice(0, 40).map((m) => (
                <tr key={m.id}>
                  <td className="td text-xs text-stone-500">{dataHoraBR(m.criadoEm)}</td>
                  <td className="td font-medium text-stone-800">{nomeInsumo(m.insumoId)}</td>
                  <td className="td font-mono text-xs text-stone-500">
                    {lotes.find((l) => l.id === m.loteId)?.codigo ?? '—'}
                  </td>
                  <td className={`td tabular-nums font-semibold ${m.quantidade < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {m.quantidade > 0 ? '+' : ''}{num(m.quantidade)}
                  </td>
                  <td className="td"><Badge tom={m.quantidade < 0 ? 'alerta' : 'ok'}>{m.motivo}</Badge></td>
                  <td className="td text-stone-500">{m.referencia}</td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      )}

      {abrirLote && <ModalLote onFechar={() => setAbrirLote(false)} />}
      {abrirInsumo && <ModalInsumo onFechar={() => setAbrirInsumo(false)} />}
    </>
  )

  function ModalLote({ onFechar }: { onFechar: () => void }) {
    const [insumoId, setInsumoId] = useState(insumos[0]?.id ?? '')
    const [codigo, setCodigo] = useState('')
    const [quantidade, setQuantidade] = useState('')
    const [validade, setValidade] = useState('')
    const [custo, setCusto] = useState('')
    const [erro, setErro] = useState('')

    function salvar(e: React.FormEvent) {
      e.preventDefault()
      if (!codigo.trim()) return setErro('Informe o código do lote.')
      if (Number(quantidade) <= 0) return setErro('A quantidade deve ser maior que zero.')
      if (!validade) return setErro('A data de validade é obrigatória — é ela que alimenta o farol.')
      cadastrarLote({
        insumoId, codigo: codigo.trim(), quantidadeInicial: Number(quantidade),
        dataValidade: validade, custoUnitario: Number(custo) || 0,
      })
      onFechar()
    }

    return (
      <Modal titulo="Entrada de lote" onFechar={onFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Insumo</label>
            <select className="input" value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
              {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código do lote</label>
              <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="FT-2450" />
            </div>
            <div>
              <label className="label">Quantidade</label>
              <input className="input" type="number" step="0.01" value={quantidade}
                     onChange={(e) => setQuantidade(e.target.value)} placeholder="50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Validade *</label>
              <input className="input" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
            <div>
              <label className="label">Custo unitário</label>
              <input className="input" type="number" step="0.01" value={custo}
                     onChange={(e) => setCusto(e.target.value)} placeholder="4,50" />
            </div>
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn-primary">Registrar entrada</button>
          </div>
        </form>
      </Modal>
    )
  }

  function ModalInsumo({ onFechar }: { onFechar: () => void }) {
    const [nome, setNome] = useState('')
    const [unid, setUnid] = useState<Unidade>('KG')
    const [minimo, setMinimo] = useState('')

    function salvar(e: React.FormEvent) {
      e.preventDefault()
      if (!nome.trim()) return
      cadastrarInsumo({ nome: nome.trim(), unidade: unid, estoqueMinimo: Number(minimo) || 0 })
      onFechar()
    }

    return (
      <Modal titulo="Novo insumo" onFechar={onFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Fermento químico" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unidade</label>
              <select className="input" value={unid} onChange={(e) => setUnid(e.target.value as Unidade)}>
                {(['KG', 'G', 'L', 'ML', 'UN'] as const).map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estoque mínimo</label>
              <input className="input" type="number" step="0.01" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn-primary">Cadastrar</button>
          </div>
        </form>
      </Modal>
    )
  }
}

export function Modal({ titulo, children, onFechar }: {
  titulo: string; children: React.ReactNode; onFechar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-stone-900">{titulo}</h2>
          <button onClick={onFechar} className="text-xl leading-none text-stone-400 hover:text-stone-700">×</button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
