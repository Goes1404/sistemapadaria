import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { brl, num } from '@/lib/format'
import type { FormaPagamento, ItemVenda, Pagamento } from '@/types'

const formas: { id: FormaPagamento; rotulo: string }[] = [
  { id: 'DINHEIRO', rotulo: 'Dinheiro' },
  { id: 'PIX', rotulo: 'PIX' },
  { id: 'DEBITO', rotulo: 'Débito' },
  { id: 'CREDITO', rotulo: 'Crédito' },
]

export default function PDV() {
  const { produtos, caixa, abrirCaixa, fecharCaixa, finalizarVenda, movimentarCaixa, vendas, movimentosCaixa } = useStore()
  const navigate = useNavigate()
  const [itens, setItens] = useState<ItemVenda[]>([])
  const [busca, setBusca] = useState('')
  const [pesando, setPesando] = useState<{ produtoId: string; nome: string; preco: number } | null>(null)
  const [pagando, setPagando] = useState(false)
  const [movimentando, setMovimentando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [comprovante, setComprovante] = useState<{ total: number; pagamentos: Pagamento[]; troco: number } | null>(null)

  const total = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)

  const filtrados = produtos.filter(
    (p) => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigoBarras?.includes(busca),
  )

  function adicionar(produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) return
    if (produto.porPeso) {
      setPesando({ produtoId, nome: produto.nome, preco: produto.preco })
      return
    }
    setItens((atual) => {
      const existente = atual.find((i) => i.produtoId === produtoId)
      if (existente) {
        return atual.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i))
      }
      return [...atual, { produtoId, nome: produto.nome, quantidade: 1, precoUnitario: produto.preco }]
    })
    setBusca('')
  }

  function alterarQuantidade(produtoId: string, delta: number) {
    setItens((atual) =>
      atual
        .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.round((i.quantidade + delta) * 1000) / 1000 } : i))
        .filter((i) => i.quantidade > 0))
  }

  if (!caixa.aberto) {
    return <AberturaCaixa onAbrir={abrirCaixa} onVoltar={() => navigate('/app')} />
  }

  return (
    <div className="flex h-screen flex-col bg-mata-900/5 lg:flex-row">
      {/* Catálogo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-white/50 bg-white px-5 py-3.5">
          <button onClick={() => navigate('/app')} className="text-sm text-mata-900/35 hover:text-mata-700">←</button>
          <div className="flex-1">
            <p className="text-sm font-bold text-mata-900">Frente de caixa</p>
            <p className="text-xs text-mata-900/50">{caixa.operador} · troco inicial {brl(caixa.trocoInicial)}</p>
          </div>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setMovimentando(true)}>
            Sangria / suprimento
          </button>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setFechando(true)}>
            Fechar caixa
          </button>
        </header>

        <div className="border-b border-white/50 bg-white px-5 py-3">
          <input
            autoFocus
            className="input"
            placeholder="Bipe o código de barras ou busque pelo nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtrados.length > 0) adicionar(filtrados[0].id)
            }}
          />
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => adicionar(p.id)}
              className="card flex flex-col justify-between p-4 text-left transition-shadow hover:shadow-md active:scale-[0.98]">
              <span className="text-sm font-semibold leading-snug text-mata-800">{p.nome}</span>
              <span className="mt-3 text-lg font-bold tabular-nums text-bela-700">
                {brl(p.preco)}{p.porPeso && <span className="text-xs font-normal text-mata-900/35">/kg</span>}
              </span>
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-mata-900/35">Nenhum produto encontrado.</p>
          )}
        </div>
      </div>

      {/* Carrinho */}
      <aside className="flex w-full shrink-0 flex-col border-t border-white/50 bg-white lg:w-96 lg:border-l lg:border-t-0">
        <header className="border-b border-white/50 px-5 py-3.5">
          <p className="text-sm font-bold text-mata-900">Venda atual</p>
          <p className="text-xs text-mata-900/50">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
        </header>

        <div className="flex-1 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-mata-900/35">
              Toque nos produtos ou bipe o código de barras.
            </p>
          ) : (
            <ul className="divide-y divide-white/40">
              {itens.map((i) => (
                <li key={i.produtoId} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-mata-800">{i.nome}</p>
                    <p className="text-xs text-mata-900/50">
                      {num(i.quantidade, 3)} × {brl(i.precoUnitario)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => alterarQuantidade(i.produtoId, -1)}
                            className="h-7 w-7 rounded-md bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10">−</button>
                    <button onClick={() => alterarQuantidade(i.produtoId, 1)}
                            className="h-7 w-7 rounded-md bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10">+</button>
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {brl(i.quantidade * i.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-white/50 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-mata-900/60">Total</span>
            <span className="text-3xl font-bold tabular-nums text-mata-900">{brl(total)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" disabled={itens.length === 0} onClick={() => setItens([])}>
              Cancelar
            </button>
            <button className="btn-primary flex-[2]" disabled={itens.length === 0} onClick={() => setPagando(true)}>
              Pagamento
            </button>
          </div>
        </footer>
      </aside>

      {pesando && (
        <ModalPeso
          item={pesando}
          onFechar={() => setPesando(null)}
          onConfirmar={(peso) => {
            setItens((atual) => [...atual, { produtoId: pesando.produtoId, nome: pesando.nome, quantidade: peso, precoUnitario: pesando.preco }])
            setPesando(null)
            setBusca('')
          }}
        />
      )}

      {pagando && (
        <ModalPagamento
          total={total}
          onFechar={() => setPagando(false)}
          onConfirmar={(pagamentos, troco) => {
            finalizarVenda({ itens, pagamentos, total })
            setComprovante({ total, pagamentos, troco })
            setItens([])
            setPagando(false)
          }}
        />
      )}

      {comprovante && <Comprovante dados={comprovante} onFechar={() => setComprovante(null)} />}

      {movimentando && (
        <ModalMovimento
          onFechar={() => setMovimentando(false)}
          onConfirmar={(motivo, valor, obs) => { movimentarCaixa({ motivo, valor, observacao: obs }); setMovimentando(false) }}
          resumo={{
            vendas: vendas.filter((v) => v.origem === 'PDV').length,
            sangrias: movimentosCaixa.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0),
          }}
        />
      )}

      {fechando && (
        <ModalFechamento
          onFechar={() => setFechando(false)}
          onConfirmar={() => { setFechando(false); fecharCaixa() }}
        />
      )}
    </div>
  )

  /** Conferência de gaveta: confronta o esperado com o que o operador contou. */
  function ModalFechamento({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: () => void }) {
    const [contado, setContado] = useState('')
    const [conferido, setConferido] = useState(false)

    const hoje = new Date().toDateString()
    const doDia = vendas.filter((v) => new Date(v.criadaEm).toDateString() === hoje)
    const movDia = movimentosCaixa.filter((m) => new Date(m.criadoEm).toDateString() === hoje)

    const emDinheiro = doDia
      .flatMap((v) => v.pagamentos)
      .filter((p) => p.forma === 'DINHEIRO')
      .reduce((s, p) => s + p.valor, 0)
    const emCartaoPix = doDia
      .flatMap((v) => v.pagamentos)
      .filter((p) => p.forma !== 'DINHEIRO')
      .reduce((s, p) => s + p.valor, 0)
    const sangrias = movDia.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0)
    const suprimentos = movDia.filter((m) => m.motivo === 'SUPRIMENTO').reduce((s, m) => s + m.valor, 0)

    const esperado = caixa.trocoInicial + emDinheiro + suprimentos - sangrias
    const diferenca = Math.round(((Number(contado) || 0) - esperado) * 100) / 100

    return (
      <Caixa>
        <h2 className="text-lg font-bold text-mata-900">Fechamento de caixa</h2>
        <p className="mt-0.5 text-sm text-mata-900/50">{caixa.operador} · {doDia.length} vendas no turno</p>

        <dl className="mt-5 space-y-2 rounded-lg bg-mata-900/5 p-4 text-sm">
          <Linha rotulo="Troco inicial" valor={caixa.trocoInicial} />
          <Linha rotulo="Vendas em dinheiro" valor={emDinheiro} sinal="+" />
          <Linha rotulo="Suprimentos" valor={suprimentos} sinal="+" />
          <Linha rotulo="Sangrias" valor={sangrias} sinal="−" />
          <div className="flex justify-between border-t border-white/60 pt-2">
            <dt className="font-semibold text-mata-800">Esperado em gaveta</dt>
            <dd className="text-lg font-bold tabular-nums">{brl(esperado)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-mata-900/50">
          Cartão e PIX ({brl(emCartaoPix)}) não entram na gaveta — caem direto na conta.
        </p>

        {!conferido ? (
          <>
            <div className="mt-4">
              <label className="label">Quanto há de dinheiro na gaveta?</label>
              <input autoFocus className="input text-center text-xl" type="number" step="0.01" placeholder="0,00"
                     value={contado} onChange={(e) => setContado(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter' && contado !== '') setConferido(true) }} />
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={onFechar}>Cancelar</button>
              <button className="btn-primary flex-1" disabled={contado === ''} onClick={() => setConferido(true)}>
                Conferir
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`mt-4 rounded-lg border px-4 py-4 text-center ${
              diferenca === 0 ? 'border-mata-400/40 bg-mata-500/10'
                : diferenca > 0 ? 'border-sky-200 bg-sky-50' : 'border-red-200 bg-red-50'}`}>
              <p className="text-sm font-semibold text-mata-700">
                {diferenca === 0 ? 'Caixa bateu certinho' : diferenca > 0 ? 'Sobra no caixa' : 'Falta no caixa'}
              </p>
              {diferenca !== 0 && (
                <p className={`mt-1 text-2xl font-bold tabular-nums ${diferenca > 0 ? 'text-sky-700' : 'text-red-700'}`}>
                  {diferenca > 0 ? '+' : '−'} {brl(Math.abs(diferenca))}
                </p>
              )}
              <p className="mt-1.5 text-xs text-mata-900/50">
                Contado {brl(Number(contado))} · esperado {brl(esperado)}
              </p>
            </div>
            {diferenca !== 0 && (
              <p className="mt-3 text-xs text-mata-900/50">
                A diferença fica registrada no turno para o gerente revisar.
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setConferido(false)}>Recontar</button>
              <button className="btn-primary flex-1" onClick={onConfirmar}>Encerrar turno</button>
            </div>
          </>
        )}
      </Caixa>
    )
  }
}

function Linha({ rotulo, valor, sinal }: { rotulo: string; valor: number; sinal?: '+' | '−' }) {
  return (
    <div className="flex justify-between">
      <dt className="text-mata-900/60">{rotulo}</dt>
      <dd className={`tabular-nums ${sinal === '+' ? 'text-mata-700' : sinal === '−' ? 'text-red-700' : ''}`}>
        {sinal ? `${sinal} ` : ''}{brl(valor)}
      </dd>
    </div>
  )
}

function Caixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="anima-entrada fixed inset-0 z-50 flex items-center justify-center bg-mata-900/45 p-4">
      <div className="anima-subida max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}

function ModalPeso({ item, onFechar, onConfirmar }: {
  item: { nome: string; preco: number }; onFechar: () => void; onConfirmar: (peso: number) => void
}) {
  const [peso, setPeso] = useState('')
  const valor = (Number(peso) || 0) * item.preco
  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">{item.nome}</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">{brl(item.preco)} por kg — informe o peso da balança.</p>
      <input autoFocus className="input mt-5 text-center text-2xl" type="number" step="0.001" placeholder="0,000"
             value={peso} onChange={(e) => setPeso(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter' && Number(peso) > 0) onConfirmar(Number(peso)) }} />
      <p className="mt-3 text-center text-sm text-mata-900/60">
        Total do item: <strong className="text-lg tabular-nums text-mata-900">{brl(valor)}</strong>
      </p>
      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary flex-1" disabled={Number(peso) <= 0} onClick={() => onConfirmar(Number(peso))}>
          Adicionar
        </button>
      </div>
    </Caixa>
  )
}

function ModalPagamento({ total, onFechar, onConfirmar }: {
  total: number; onFechar: () => void; onConfirmar: (pagamentos: Pagamento[], troco: number) => void
}) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [forma, setForma] = useState<FormaPagamento>('DINHEIRO')
  const [valor, setValor] = useState('')

  const pago = pagamentos.reduce((s, p) => s + p.valor, 0)
  const restante = Math.max(0, Math.round((total - pago) * 100) / 100)
  const troco = Math.max(0, Math.round((pago - total) * 100) / 100)

  function adicionar() {
    const v = Number(valor) || restante
    if (v <= 0) return
    setPagamentos((atual) => [...atual, { forma, valor: v }])
    setValor('')
  }

  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Pagamento</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">Aceita divisão entre várias formas no mesmo pedido.</p>

      <div className="mt-5 rounded-lg bg-mata-900/5 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-mata-900/60">Total da venda</span>
          <span className="font-semibold tabular-nums">{brl(total)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm">
          <span className="text-mata-900/60">Já informado</span>
          <span className="font-semibold tabular-nums text-mata-700">{brl(pago)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-white/50 pt-2">
          <span className="font-semibold text-mata-800">{troco > 0 ? 'Troco' : 'Falta'}</span>
          <span className={`text-xl font-bold tabular-nums ${troco > 0 ? 'text-sky-700' : 'text-mata-900'}`}>
            {brl(troco > 0 ? troco : restante)}
          </span>
        </div>
      </div>

      {pagamentos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {pagamentos.map((p, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-2 text-sm ring-1 ring-white/60">
              <span className="text-mata-700">{formas.find((f) => f.id === p.forma)?.rotulo}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">{brl(p.valor)}</span>
                <button onClick={() => setPagamentos((a) => a.filter((_, idx) => idx !== i))}
                        className="text-mata-900/35 hover:text-red-600">×</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {restante > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-4 gap-1.5">
            {formas.map((f) => (
              <button key={f.id} onClick={() => setForma(f.id)}
                className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors ${
                  forma === f.id ? 'bg-bela-600 text-white' : 'bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10'}`}>
                {f.rotulo}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input className="input" type="number" step="0.01" placeholder={`Restante: ${restante.toFixed(2)}`}
                   value={valor} onChange={(e) => setValor(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }} />
            <button className="btn-ghost shrink-0" onClick={adicionar}>Incluir</button>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Voltar</button>
        <button className="btn-success flex-[2]" disabled={restante > 0}
                onClick={() => onConfirmar(pagamentos, troco)}>
          Finalizar venda
        </button>
      </div>
    </Caixa>
  )
}

function Comprovante({ dados, onFechar }: {
  dados: { total: number; pagamentos: Pagamento[]; troco: number }; onFechar: () => void
}) {
  return (
    <Caixa>
      <div className="text-center">
        <p className="text-4xl">✓</p>
        <h2 className="mt-2 text-lg font-bold text-mata-900">Venda finalizada</h2>
        <p className="mt-4 text-3xl font-bold tabular-nums text-mata-900">{brl(dados.total)}</p>
        <ul className="mt-4 space-y-1 text-sm text-mata-900/60">
          {dados.pagamentos.map((p, i) => (
            <li key={i}>{formas.find((f) => f.id === p.forma)?.rotulo}: {brl(p.valor)}</li>
          ))}
        </ul>
        {dados.troco > 0 && (
          <p className="mt-3 rounded-lg bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800">
            Troco: {brl(dados.troco)}
          </p>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Sem cupom</button>
        <button className="btn-primary flex-1" onClick={onFechar}>Imprimir cupom</button>
      </div>
    </Caixa>
  )
}

function ModalMovimento({ onFechar, onConfirmar, resumo }: {
  onFechar: () => void
  onConfirmar: (motivo: 'SANGRIA' | 'SUPRIMENTO', valor: number, obs: string) => void
  resumo: { vendas: number; sangrias: number }
}) {
  const [motivo, setMotivo] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA')
  const [valor, setValor] = useState('')
  const [obs, setObs] = useState('')
  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Movimentar caixa</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">
        {resumo.vendas} vendas no turno · {brl(resumo.sangrias)} já retirados
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(['SANGRIA', 'SUPRIMENTO'] as const).map((m) => (
          <button key={m} onClick={() => setMotivo(m)}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              motivo === m ? 'bg-bela-600 text-white' : 'bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10'}`}>
            {m === 'SANGRIA' ? 'Sangria (saída)' : 'Suprimento (entrada)'}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <input className="input" type="number" step="0.01" placeholder="Valor"
               value={valor} onChange={(e) => setValor(e.target.value)} />
        <input className="input" placeholder="Observação (ex: retirada para o cofre)"
               value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary flex-1" disabled={Number(valor) <= 0}
                onClick={() => onConfirmar(motivo, Number(valor), obs || '—')}>
          Registrar
        </button>
      </div>
    </Caixa>
  )
}

function AberturaCaixa({ onAbrir, onVoltar }: {
  onAbrir: (operador: string, troco: number) => void; onVoltar: () => void
}) {
  const [operador, setOperador] = useState('Ana Beatriz Lopes')
  const [troco, setTroco] = useState('150')
  return (
    <div className="flex min-h-screen items-center justify-center bg-mata-900/5 p-6">
      <div className="w-full max-w-sm">
        <button onClick={onVoltar} className="mb-4 text-sm text-mata-900/35 hover:text-mata-700">← backoffice</button>
        <div className="card card-pad">
          <h1 className="text-xl font-bold text-mata-900">Abertura de caixa</h1>
          <p className="mt-1 text-sm text-mata-900/50">
            Informe o troco inicial. No fechamento, o sistema compara com o esperado.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Operador</label>
              <input className="input" value={operador} onChange={(e) => setOperador(e.target.value)} />
            </div>
            <div>
              <label className="label">Troco inicial</label>
              <input className="input" type="number" step="0.01" value={troco} onChange={(e) => setTroco(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={() => onAbrir(operador, Number(troco) || 0)}>
            Abrir caixa
          </button>
        </div>
      </div>
    </div>
  )
}
