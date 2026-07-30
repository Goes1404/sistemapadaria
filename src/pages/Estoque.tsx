import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { JANELA_AMARELO, classificarFarol, diasParaVencer, saldoDoInsumo } from '@/lib/fefo'
import { brl, dataBR, dataHoraBR, num } from '@/lib/format'
import { Badge, BadgeFarol, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import type { Farol, Unidade } from '@/types'

type Aba = 'lotes' | 'insumos' | 'movimentos' | 'perdas'

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
              className={`card card-pad text-left transition-all ${filtro === f ? 'ring-2 ring-bela-500' : 'hover:border-white/60'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-mata-900/50">{rotulos[f]}</p>
                <BadgeFarol farol={f} texto={f === 'VERMELHO' ? '🔴' : f === 'AMARELO' ? '🟡' : '🟢'} />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{contagem[f]}</p>
              <p className="mt-0.5 text-xs text-mata-900/50">lotes com saldo</p>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-lg bg-mata-900/8 p-1">
          {([['lotes', 'Lotes'], ['insumos', 'Insumos'], ['movimentos', 'Movimentações'], ['perdas', 'Perdas']] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                aba === id ? 'bg-white text-mata-900 shadow-sm' : 'text-mata-900/60 hover:text-mata-900'}`}>
              {rotulo}
            </button>
          ))}
        </nav>
        {aba === 'lotes' && (
          <label className="ml-auto flex items-center gap-2 text-xs text-mata-900/60">
            Alerta amarelo com
            <input type="number" min={1} max={30} value={janela}
                   onChange={(e) => setJanela(Math.max(1, Number(e.target.value)))}
                   className="w-16 rounded-md border border-white/60 px-2 py-1 text-sm" />
            dias de antecedência
          </label>
        )}
        {filtro !== 'TODOS' && (
          <button onClick={() => setFiltro('TODOS')} className="text-xs font-semibold text-bela-700 hover:underline">
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
                  <td className="td font-medium text-mata-800">{nomeInsumo(l.insumoId)}</td>
                  <td className="td font-mono text-xs text-mata-900/50">{l.codigo}</td>
                  <td className="td tabular-nums">
                    {num(l.quantidadeAtual)} <span className="text-xs text-mata-900/35">{unidade(l.insumoId)}</span>
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
                  <td className="td font-medium text-mata-800">{i.nome}</td>
                  <td className="td tabular-nums">{num(saldo)} <span className="text-xs text-mata-900/35">{i.unidade}</span></td>
                  <td className="td tabular-nums text-mata-900/50">{num(i.estoqueMinimo)} {i.unidade}</td>
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
                  <td className="td text-xs text-mata-900/50">{dataHoraBR(m.criadoEm)}</td>
                  <td className="td font-medium text-mata-800">{nomeInsumo(m.insumoId)}</td>
                  <td className="td font-mono text-xs text-mata-900/50">
                    {lotes.find((l) => l.id === m.loteId)?.codigo ?? '—'}
                  </td>
                  <td className={`td tabular-nums font-semibold ${m.quantidade < 0 ? 'text-red-600' : 'text-mata-700'}`}>
                    {m.quantidade > 0 ? '+' : ''}{num(m.quantidade)}
                  </td>
                  <td className="td"><Badge tom={m.quantidade < 0 ? 'alerta' : 'ok'}>{m.motivo}</Badge></td>
                  <td className="td text-mata-900/50">{m.referencia}</td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      )}

      {aba === 'perdas' && <Perdas />}

      {abrirLote && <ModalLote onFechar={() => setAbrirLote(false)} />}
      {abrirInsumo && <ModalInsumo onFechar={() => setAbrirInsumo(false)} />}
    </>
  )

  /**
   * Perdas por vencimento — o número que justifica o sistema.
   * Junta o que já foi descartado com o que ainda está em risco na prateleira.
   */
  function Perdas() {
    const descartes = movimentosEstoque
      .filter((m) => m.motivo === 'DESCARTE' || m.motivo === 'PERDA')
      .map((m) => {
        const lote = lotes.find((l) => l.id === m.loteId)
        return {
          ...m,
          codigo: lote?.codigo ?? '—',
          validade: lote?.dataValidade ?? '',
          custo: Math.abs(m.quantidade) * (lote?.custoUnitario ?? 0),
        }
      })

    const totalDescartado = descartes.reduce((s, d) => s + d.custo, 0)

    const emRisco = enriquecidos.filter((l) => l.quantidadeAtual > 0 && l.farol !== 'VERDE')
    const totalVencido = emRisco
      .filter((l) => l.farol === 'VERMELHO')
      .reduce((s, l) => s + l.quantidadeAtual * l.custoUnitario, 0)
    const totalEmRisco = emRisco
      .filter((l) => l.farol === 'AMARELO')
      .reduce((s, l) => s + l.quantidadeAtual * l.custoUnitario, 0)

    const porInsumo = emRisco.reduce<Record<string, number>>((acc, l) => {
      acc[l.insumoId] = (acc[l.insumoId] ?? 0) + l.quantidadeAtual * l.custoUnitario
      return acc
    }, {})
    const maior = Math.max(1, ...Object.values(porInsumo))

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat rotulo="Já descartado" valor={brl(totalDescartado)}
                detalhe={`${descartes.length} ${descartes.length === 1 ? 'descarte' : 'descartes'}`}
                tom={totalDescartado > 0 ? 'erro' : 'ok'} />
          <Stat rotulo="Vencido na prateleira" valor={brl(totalVencido)}
                detalhe="perda certa se não agir hoje" tom={totalVencido > 0 ? 'erro' : 'ok'} />
          <Stat rotulo="Em risco" valor={brl(totalEmRisco)}
                detalhe={`vence em até ${janela} dias`} tom={totalEmRisco > 0 ? 'alerta' : 'ok'} />
        </div>

        <Card titulo="Onde o dinheiro está em risco">
          {Object.keys(porInsumo).length === 0 ? (
            <Vazio mensagem="Nenhum insumo em risco de vencimento." />
          ) : (
            <ul className="space-y-3.5">
              {Object.entries(porInsumo)
                .sort(([, a], [, b]) => b - a)
                .map(([insumoId, valor]) => (
                  <li key={insumoId}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-mata-700">{nomeInsumo(insumoId)}</span>
                      <span className="font-semibold tabular-nums">{brl(valor)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-mata-900/5">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${(valor / maior) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-4 border-t border-white/40 pt-3 text-xs text-mata-900/50">
            Priorize promoção ou uso em produção pelos itens do topo — é onde o desconto dói menos
            que o descarte.
          </p>
        </Card>

        <Card titulo="Histórico de descartes">
          {descartes.length === 0 ? (
            <Vazio mensagem="Nenhum descarte registrado ainda. Descarte um lote vencido na aba Lotes para ver o registro aqui." />
          ) : (
            <Tabela cabecalho={['Quando', 'Insumo', 'Lote', 'Quantidade', 'Prejuízo']}>
              {descartes.map((d) => (
                <tr key={d.id}>
                  <td className="td text-xs text-mata-900/50">{dataHoraBR(d.criadoEm)}</td>
                  <td className="td font-medium text-mata-800">{nomeInsumo(d.insumoId)}</td>
                  <td className="td font-mono text-xs text-mata-900/50">{d.codigo}</td>
                  <td className="td tabular-nums">
                    {num(Math.abs(d.quantidade), 3)} {unidade(d.insumoId)}
                  </td>
                  <td className="td text-right font-semibold tabular-nums text-red-700">{brl(d.custo)}</td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      </div>
    )
  }

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
    <div className="anima-entrada fixed inset-0 z-50 flex items-center justify-center bg-mata-900/45 p-4"
         onClick={onFechar}>
      <div className="anima-subida max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-white/50 px-5 py-4">
          <h2 className="font-semibold text-mata-900">{titulo}</h2>
          <button onClick={onFechar} className="text-xl leading-none text-mata-900/35 hover:text-mata-700">×</button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
