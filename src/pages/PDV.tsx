import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, PONTOS_POR_REAL } from '@/store'
import { brl, num } from '@/lib/format'
import { pulsar } from '@/lib/anima'
import { lerEtiquetaBalanca } from '@/futuro/balanca'
import { criarCobrancaPix, passarCartao, aguardarPix, type CobrancaPixSimulada } from '@/lib/pagamento'
import { EMITENTE, formatarChave } from '@/lib/fiscal'
import { Logo } from '@/components/ui'
import { QrCode } from '@/components/QrCode'
import type { Cliente, DocumentoFiscal, FormaPagamento, ItemVenda, Pagamento } from '@/types'

const formas: { id: FormaPagamento; rotulo: string }[] = [
  { id: 'DINHEIRO', rotulo: 'Dinheiro' },
  { id: 'PIX', rotulo: 'PIX' },
  { id: 'DEBITO', rotulo: 'Débito' },
  { id: 'CREDITO', rotulo: 'Crédito' },
]

/** Acima disto, o desconto exige PIN de quem tem alçada. */
const LIMITE_DESCONTO_SEM_ALCADA = 10

/**
 * Etiquetas de balança válidas, para a demonstração.
 *
 * São EAN-13 de verdade, com dígito verificador correto: prefixo 2, código do
 * produto e peso em gramas embutido. Clicar preenche a busca como se o leitor
 * tivesse bipado.
 */
const ETIQUETAS_DEMO = [
  { codigo: '2100001012502', descricao: 'Pão Francês · 1,250 kg' },
  { codigo: '2100005003803', descricao: 'Presunto · 0,380 kg' },
  { codigo: '2100013005202', descricao: 'Mortadela · 0,520 kg' },
]

export default function PDV() {
  const {
    produtos, caixa, abrirCaixa, fecharCaixa, finalizarVenda, movimentarCaixa,
    vendas, movimentosCaixa, clientes, colaboradores, saldoPontos, sefazDisponivel, alternarSefaz,
  } = useStore()
  const navigate = useNavigate()

  const [itens, setItens] = useState<ItemVenda[]>([])
  const [busca, setBusca] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [desconto, setDesconto] = useState(0)
  const [autorizadoPor, setAutorizadoPor] = useState<string | undefined>()
  const [pesando, setPesando] = useState<{ produtoId: string; nome: string; preco: number } | null>(null)
  const [pagando, setPagando] = useState(false)
  const [movimentando, setMovimentando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [descontando, setDescontando] = useState(false)
  const [avisoBalanca, setAvisoBalanca] = useState<string | null>(null)
  const [comprovante, setComprovante] = useState<{
    total: number; pagamentos: Pagamento[]; troco: number; documento: DocumentoFiscal; aviso?: string
  } | null>(null)

  const subtotal = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
  const total = Math.max(0, subtotal - desconto)
  const totalRef = useRef<HTMLSpanElement>(null)

  useEffect(() => { if (itens.length) pulsar(totalRef.current) }, [total, itens.length])
  useEffect(() => {
    if (!avisoBalanca) return
    const t = setTimeout(() => setAvisoBalanca(null), 3500)
    return () => clearTimeout(t)
  }, [avisoBalanca])

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
      const existente = atual.find((i) => i.produtoId === produtoId && !i.viaBalanca)
      if (existente) {
        return atual.map((i) =>
          i.produtoId === produtoId && !i.viaBalanca ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...atual, { produtoId, nome: produto.nome, quantidade: 1, precoUnitario: produto.preco }]
    })
    setBusca('')
  }

  /**
   * Trata o que o leitor de código de barras entrega.
   *
   * Primeiro tenta ler como etiqueta de balança — que já traz o peso dentro do
   * código. Só se não for etiqueta interna é que procura produto pelo EAN.
   */
  function processarCodigo(codigo: string): boolean {
    const etiqueta = lerEtiquetaBalanca(codigo)
    if (etiqueta) {
      const produto = produtos.find((p) => p.codigoBalanca === etiqueta.codigoInterno)
      if (!produto) {
        setAvisoBalanca(`Etiqueta lida (código ${etiqueta.codigoInterno}), mas nenhum produto está associado a ela.`)
        return true
      }
      const peso = etiqueta.pesoKg ?? 0
      setItens((atual) => [
        ...atual,
        { produtoId: produto.id, nome: produto.nome, quantidade: peso, precoUnitario: produto.preco, viaBalanca: true },
      ])
      setAvisoBalanca(`${produto.nome} — ${num(peso, 3)} kg lidos direto da etiqueta.`)
      return true
    }

    const porEan = produtos.find((p) => p.codigoBarras === codigo)
    if (porEan) { adicionar(porEan.id); return true }
    return false
  }

  function alterarQuantidade(indice: number, delta: number) {
    setItens((atual) =>
      atual
        .map((i, idx) => (idx === indice ? { ...i, quantidade: Math.round((i.quantidade + delta) * 1000) / 1000 } : i))
        .filter((i) => i.quantidade > 0))
  }

  function limpar() {
    setItens([]); setCliente(null); setDesconto(0); setAutorizadoPor(undefined)
  }

  if (!caixa.aberto) {
    return <AberturaCaixa onAbrir={abrirCaixa} onVoltar={() => navigate('/app')} />
  }

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-mata-900/10 bg-white/55 px-5 py-3.5 backdrop-blur-xl">
          <button onClick={() => navigate('/app')}
                  className="grid h-8 w-8 place-items-center rounded-lg text-mata-900/40 transition-colors hover:bg-white/70 hover:text-mata-800">←</button>
          <Logo tamanho={30} />
          <div className="flex-1">
            <p className="text-sm font-bold text-mata-900">Frente de caixa</p>
            <p className="text-xs text-mata-900/50">{caixa.operador} · troco inicial {brl(caixa.trocoInicial)}</p>
          </div>

          {/* Estado da SEFAZ: clicável, para demonstrar a contingência ao vivo. */}
          <button
            onClick={alternarSefaz}
            title="Simular queda e retorno da SEFAZ"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
              sefazDisponivel
                ? 'bg-mata-500/15 text-mata-700 ring-mata-600/25'
                : 'bg-red-500/15 text-red-700 ring-red-600/25'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sefazDisponivel ? 'bg-mata-600' : 'animate-pulse bg-red-600'}`} />
            SEFAZ {sefazDisponivel ? 'online' : 'offline'}
          </button>

          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => navigate('/kds')}>Cozinha</button>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setMovimentando(true)}>Sangria / suprimento</button>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setFechando(true)}>Fechar caixa</button>
        </header>

        <div className="border-b border-mata-900/10 bg-white/40 px-5 py-3 backdrop-blur-xl">
          <input
            autoFocus
            className="input"
            placeholder="Bipe o código de barras (produto ou etiqueta de balança) ou busque pelo nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const codigo = busca.trim()
              if (/^\d{13}$/.test(codigo) && processarCodigo(codigo)) { setBusca(''); return }
              if (filtrados.length > 0) adicionar(filtrados[0].id)
            }}
          />
          {avisoBalanca && (
            <p className="anima-entrada mt-2 rounded-lg bg-bela-500/15 px-3 py-2 text-xs font-semibold text-bela-800">
              ⚖ {avisoBalanca}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-mata-900/40">Simular etiqueta de balança:</span>
            {ETIQUETAS_DEMO.map((e) => (
              <button
                key={e.codigo}
                onClick={() => { processarCodigo(e.codigo); setBusca('') }}
                title={`Bipa o código ${e.codigo}`}
                className="rounded-md bg-mata-900/8 px-2 py-1 font-mono text-[11px] text-mata-900/60 transition-colors hover:bg-bela-500/20 hover:text-bela-800"
              >
                {e.descricao}
              </button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => adicionar(p.id)}
              className="vidro vidro-interativo flex flex-col justify-between p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.97]">
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
      <aside className="flex w-full shrink-0 flex-col border-t border-mata-900/10 bg-white/60 backdrop-blur-2xl lg:w-96 lg:border-l lg:border-t-0">
        <header className="flex items-center justify-between border-b border-mata-900/10 px-5 py-3.5">
          <div>
            <p className="text-sm font-bold text-mata-900">Venda atual</p>
            <p className="text-xs text-mata-900/50">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
          </div>
          <button onClick={() => setBuscandoCliente(true)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-bela-700 transition-colors hover:bg-white/70">
            {cliente ? 'Trocar' : '+ Cliente'}
          </button>
        </header>

        {cliente && (
          <div className="flex items-center justify-between border-b border-mata-900/10 bg-bela-500/10 px-5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-mata-900">{cliente.nome}</p>
              <p className="text-xs text-mata-900/55">
                {saldoPontos(cliente.id)} pontos · ganha {Math.floor(total * PONTOS_POR_REAL)} nesta compra
              </p>
            </div>
            <button onClick={() => setCliente(null)} className="text-mata-900/35 hover:text-red-600">×</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-mata-900/35">
              Toque nos produtos ou bipe o código de barras.
            </p>
          ) : (
            <ul className="divide-y divide-mata-900/8">
              {itens.map((i, idx) => (
                <li key={`${i.produtoId}-${idx}`} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-mata-800">
                      {i.nome}
                      {i.viaBalanca && (
                        <span className="ml-1.5 rounded bg-bela-500/20 px-1 py-0.5 text-[10px] font-bold text-bela-800">
                          balança
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-mata-900/50">{num(i.quantidade, 3)} × {brl(i.precoUnitario)}</p>
                  </div>
                  {!i.viaBalanca && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => alterarQuantidade(idx, -1)}
                              className="h-7 w-7 rounded-md bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10">−</button>
                      <button onClick={() => alterarQuantidade(idx, 1)}
                              className="h-7 w-7 rounded-md bg-mata-900/5 text-mata-900/60 hover:bg-mata-900/10">+</button>
                    </div>
                  )}
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {brl(i.quantidade * i.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-mata-900/10 p-5">
          {desconto > 0 && (
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-mata-900/55">
                Desconto{autorizadoPor && <span className="ml-1 text-bela-700">· aut. {autorizadoPor}</span>}
              </span>
              <span className="font-semibold tabular-nums text-red-600">− {brl(desconto)}</span>
            </div>
          )}
          <div className="mb-4 flex items-baseline justify-between">
            <button onClick={() => setDescontando(true)} disabled={itens.length === 0}
                    className="text-sm font-semibold text-mata-900/60 underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40">
              Total
            </button>
            <span ref={totalRef} className="text-3xl font-extrabold tabular-nums text-mata-900">{brl(total)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" disabled={itens.length === 0} onClick={limpar}>Cancelar</button>
            <button className="btn-primary flex-[2]" disabled={itens.length === 0} onClick={() => setPagando(true)}>
              Pagamento
            </button>
          </div>
        </footer>
      </aside>

      {pesando && (
        <ModalPeso item={pesando} onFechar={() => setPesando(null)}
          onConfirmar={(peso) => {
            setItens((atual) => [...atual, { produtoId: pesando.produtoId, nome: pesando.nome, quantidade: peso, precoUnitario: pesando.preco }])
            setPesando(null); setBusca('')
          }} />
      )}

      {buscandoCliente && (
        <ModalCliente clientes={clientes} saldoPontos={saldoPontos}
          onFechar={() => setBuscandoCliente(false)}
          onEscolher={(c) => { setCliente(c); setBuscandoCliente(false) }} />
      )}

      {descontando && (
        <ModalDesconto subtotal={subtotal} colaboradores={colaboradores}
          onFechar={() => setDescontando(false)}
          onAplicar={(valor, autorizador) => {
            setDesconto(valor); setAutorizadoPor(autorizador); setDescontando(false)
          }} />
      )}

      {pagando && (
        <ModalPagamento
          total={total}
          onFechar={() => setPagando(false)}
          onConfirmar={(pagamentos, troco) => {
            const r = finalizarVenda({
              itens, pagamentos, total, desconto: desconto || undefined,
              clienteId: cliente?.id, autorizadoPor,
            })
            setComprovante({ total, pagamentos, troco, documento: r.documento, aviso: r.aviso })
            limpar(); setPagando(false)
          }}
        />
      )}

      {comprovante && <Comprovante dados={comprovante} onFechar={() => setComprovante(null)} />}

      {movimentando && (
        <ModalMovimento
          colaboradores={colaboradores}
          onFechar={() => setMovimentando(false)}
          onConfirmar={(motivo, valor, obs, autorizador) => {
            movimentarCaixa({ motivo, valor, observacao: obs }, autorizador)
            setMovimentando(false)
          }}
          resumo={{
            vendas: vendas.filter((v) => v.origem === 'PDV').length,
            sangrias: movimentosCaixa.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0),
          }}
        />
      )}

      {fechando && (
        <ModalFechamento
          onFechar={() => setFechando(false)}
          onConfirmar={(contado, diferenca) => { setFechando(false); fecharCaixa(contado, diferenca) }}
        />
      )}
    </div>
  )

  function ModalFechamento({ onFechar, onConfirmar }: {
    onFechar: () => void; onConfirmar: (contado: number, diferenca: number) => void
  }) {
    const [contado, setContado] = useState('')
    const [conferido, setConferido] = useState(false)

    const hoje = new Date().toDateString()
    const doDia = vendas.filter((v) => new Date(v.criadaEm).toDateString() === hoje)
    const movDia = movimentosCaixa.filter((m) => new Date(m.criadoEm).toDateString() === hoje)

    const emDinheiro = doDia.flatMap((v) => v.pagamentos).filter((p) => p.forma === 'DINHEIRO').reduce((s, p) => s + p.valor, 0)
    const emCartaoPix = doDia.flatMap((v) => v.pagamentos).filter((p) => p.forma !== 'DINHEIRO').reduce((s, p) => s + p.valor, 0)
    const sangrias = movDia.filter((m) => m.motivo === 'SANGRIA').reduce((s, m) => s + m.valor, 0)
    const suprimentos = movDia.filter((m) => m.motivo === 'SUPRIMENTO').reduce((s, m) => s + m.valor, 0)

    const esperado = caixa.trocoInicial + emDinheiro + suprimentos - sangrias
    const diferenca = Math.round(((Number(contado) || 0) - esperado) * 100) / 100

    return (
      <Caixa>
        <h2 className="text-lg font-bold text-mata-900">Fechamento de caixa</h2>
        <p className="mt-0.5 text-sm text-mata-900/50">{caixa.operador} · {doDia.length} vendas no turno</p>

        <dl className="mt-5 space-y-2 rounded-xl bg-mata-900/5 p-4 text-sm">
          <Linha rotulo="Troco inicial" valor={caixa.trocoInicial} />
          <Linha rotulo="Vendas em dinheiro" valor={emDinheiro} sinal="+" />
          <Linha rotulo="Suprimentos" valor={suprimentos} sinal="+" />
          <Linha rotulo="Sangrias" valor={sangrias} sinal="−" />
          <div className="flex justify-between border-t border-mata-900/10 pt-2">
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
              <button className="btn-primary flex-1" disabled={contado === ''} onClick={() => setConferido(true)}>Conferir</button>
            </div>
          </>
        ) : (
          <>
            <div className={`mt-4 rounded-xl border px-4 py-4 text-center ${
              diferenca === 0 ? 'border-mata-400/40 bg-mata-500/10'
                : diferenca > 0 ? 'border-sky-300/50 bg-sky-500/10' : 'border-red-300/50 bg-red-500/10'}`}>
              <p className="text-sm font-semibold text-mata-800">
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
                A diferença fica registrada na auditoria do turno.
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setConferido(false)}>Recontar</button>
              <button className="btn-primary flex-1" onClick={() => onConfirmar(Number(contado), diferenca)}>
                Encerrar turno
              </button>
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
      <div className="anima-subida max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-vidro-alto">
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
      <p className="mt-3 rounded-lg bg-mata-900/5 px-3 py-2 text-xs text-mata-900/55">
        Com a etiqueta da balança bipada, esta tela nem aparece — o peso vem dentro do código de barras.
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

function ModalCliente({ clientes, saldoPontos, onFechar, onEscolher }: {
  clientes: Cliente[]
  saldoPontos: (id: string) => number
  onFechar: () => void
  onEscolher: (c: Cliente) => void
}) {
  const [busca, setBusca] = useState('')
  const achados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.replace(/\D/g, '').includes(busca.replace(/\D/g, '')) ||
      (busca.length > 3 && (c.cpf ?? '').includes(busca.replace(/\D/g, ''))),
  )
  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Identificar cliente</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">Por nome, telefone ou CPF.</p>
      <input autoFocus className="input mt-4" placeholder="Buscar…" value={busca}
             onChange={(e) => setBusca(e.target.value)} />
      <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
        {achados.map((c) => (
          <li key={c.id}>
            <button onClick={() => onEscolher(c)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-mata-900/5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-mata-900">{c.nome}</span>
                <span className="block text-xs text-mata-900/50">
                  {c.telefone}{c.assinatura ? ` · ${c.assinatura.plano}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-bela-700">
                {saldoPontos(c.id)} pts
              </span>
            </button>
          </li>
        ))}
        {achados.length === 0 && (
          <li className="py-8 text-center text-sm text-mata-900/35">Nenhum cliente encontrado.</li>
        )}
      </ul>
      <button className="btn-ghost mt-4 w-full" onClick={onFechar}>Fechar</button>
    </Caixa>
  )
}

/**
 * Desconto com alçada.
 *
 * Até o limite, o operador aplica sozinho. Acima, alguém com permissão libera
 * com o próprio PIN — e a auditoria guarda os dois nomes.
 */
function ModalDesconto({ subtotal, colaboradores, onFechar, onAplicar }: {
  subtotal: number
  colaboradores: { id: string; nome: string; cargo: string; pin: string }[]
  onFechar: () => void
  onAplicar: (valor: number, autorizadoPor?: string) => void
}) {
  const [percentual, setPercentual] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')

  const pct = Number(percentual) || 0
  const valor = Math.round(subtotal * (pct / 100) * 100) / 100
  const precisaAlcada = pct > LIMITE_DESCONTO_SEM_ALCADA

  function aplicar() {
    if (pct <= 0) return setErro('Informe um percentual maior que zero.')
    if (pct > 100) return setErro('Desconto não pode passar de 100%.')
    if (!precisaAlcada) return onAplicar(valor)

    const supervisor = colaboradores.find((c) => c.pin === pin && c.cargo === 'GERENTE')
    if (!supervisor) return setErro('PIN sem alçada para este desconto.')
    onAplicar(valor, supervisor.nome)
  }

  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Desconto</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">Subtotal de {brl(subtotal)}.</p>

      <div className="mt-4">
        <label className="label">Percentual</label>
        <input autoFocus className="input text-center text-xl" type="number" step="1" placeholder="0"
               value={percentual} onChange={(e) => { setPercentual(e.target.value); setErro('') }} />
      </div>

      {pct > 0 && (
        <p className="mt-3 text-center text-sm text-mata-900/60">
          Desconto de <strong className="text-mata-900">{brl(valor)}</strong> · novo total{' '}
          <strong className="text-mata-900">{brl(subtotal - valor)}</strong>
        </p>
      )}

      {precisaAlcada && (
        <div className="mt-4 rounded-xl border border-bela-400/40 bg-bela-500/10 p-4">
          <p className="text-xs font-semibold text-bela-800">
            Acima de {LIMITE_DESCONTO_SEM_ALCADA}% exige autorização de gerente.
          </p>
          <input className="input mt-2.5 text-center tracking-[0.4em]" inputMode="numeric" maxLength={6}
                 placeholder="PIN" value={pin}
                 onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErro('') }} />
          <p className="mt-2 text-[11px] text-mata-900/50">PIN de gerente na demo: 4567</p>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary flex-1" onClick={aplicar}>Aplicar</button>
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
  const [processando, setProcessando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [pix, setPix] = useState<CobrancaPixSimulada | null>(null)

  const pago = pagamentos.reduce((s, p) => s + p.valor, 0)
  const restante = Math.max(0, Math.round((total - pago) * 100) / 100)
  const troco = Math.max(0, Math.round((pago - total) * 100) / 100)

  async function incluir() {
    const v = Number(valor) || restante
    if (v <= 0) return
    setErro('')

    if (forma === 'DINHEIRO') {
      setPagamentos((atual) => [...atual, { forma, valor: v }])
      setValor('')
      return
    }

    if (forma === 'PIX') {
      const cobranca = criarCobrancaPix(v)
      setPix(cobranca)
      setProcessando('Aguardando o cliente pagar…')
      const r = await aguardarPix()
      setProcessando(null)
      setPix(null)
      if (r.pago) {
        setPagamentos((atual) => [...atual, { forma, valor: v, nsu: cobranca.txid }])
        setValor('')
      }
      return
    }

    setProcessando('Aproxime, insira ou passe o cartão…')
    const r = await passarCartao(v, forma === 'DEBITO' ? 'DEBITO' : 'CREDITO')
    setProcessando(null)
    if (!r.aprovada) return setErro(r.motivoRecusa ?? 'Transação não aprovada.')
    setPagamentos((atual) => [...atual, { forma, valor: v, nsu: r.nsu, bandeira: r.bandeira }])
    setValor('')
  }

  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Pagamento</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">Aceita divisão entre várias formas no mesmo pedido.</p>

      <div className="mt-5 rounded-xl bg-mata-900/5 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-mata-900/60">Total da venda</span>
          <span className="font-semibold tabular-nums">{brl(total)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm">
          <span className="text-mata-900/60">Já informado</span>
          <span className="font-semibold tabular-nums text-mata-700">{brl(pago)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-mata-900/10 pt-2">
          <span className="font-semibold text-mata-800">{troco > 0 ? 'Troco' : 'Falta'}</span>
          <span className={`text-xl font-bold tabular-nums ${troco > 0 ? 'text-sky-700' : 'text-mata-900'}`}>
            {brl(troco > 0 ? troco : restante)}
          </span>
        </div>
      </div>

      {pagamentos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {pagamentos.map((p, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-sm ring-1 ring-mata-900/10">
              <span className="text-mata-900/70">
                {formas.find((f) => f.id === p.forma)?.rotulo}
                {p.nsu && <span className="ml-1.5 font-mono text-[10px] text-mata-900/40">NSU {p.nsu}</span>}
                {p.bandeira && <span className="ml-1.5 text-[10px] text-mata-900/40">{p.bandeira}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">{brl(p.valor)}</span>
                <button onClick={() => setPagamentos((a) => a.filter((_, idx) => idx !== i))}
                        className="text-mata-900/35 hover:text-red-600">×</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {pix && (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-mata-900/10 bg-white p-4">
          <QrCode valor={pix.brCode} tamanho={168} />
          <p className="mt-2 text-xs font-semibold text-mata-900">{brl(pix.valor)}</p>
          <p className="text-[11px] text-mata-900/50">Cliente aponta a câmera do app do banco</p>
        </div>
      )}

      {processando && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-bela-400/40 bg-bela-500/10 px-4 py-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-bela-500" />
          <span className="text-sm font-semibold text-bela-800">{processando}</span>
        </div>
      )}

      {erro && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {restante > 0 && !processando && (
        <div className="mt-4">
          <div className="grid grid-cols-4 gap-1.5">
            {formas.map((f) => (
              <button key={f.id} onClick={() => setForma(f.id)}
                className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors ${
                  forma === f.id ? 'bg-bela-500 text-mata-900' : 'bg-mata-900/8 text-mata-900/60 hover:bg-mata-900/15'}`}>
                {f.rotulo}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input className="input" type="number" step="0.01" placeholder={`Restante: ${restante.toFixed(2)}`}
                   value={valor} onChange={(e) => setValor(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') void incluir() }} />
            <button className="btn-ghost shrink-0" onClick={() => void incluir()}>
              {forma === 'DINHEIRO' ? 'Incluir' : forma === 'PIX' ? 'Gerar QR' : 'Pinpad'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar} disabled={!!processando}>Voltar</button>
        <button className="btn-success flex-[2]" disabled={restante > 0 || !!processando}
                onClick={() => onConfirmar(pagamentos, troco)}>
          Finalizar venda
        </button>
      </div>
    </Caixa>
  )
}

/** Cupom com os dados fiscais e o QR de consulta — o DANFE-NFC-e simplificado. */
function Comprovante({ dados, onFechar }: {
  dados: { total: number; pagamentos: Pagamento[]; troco: number; documento: DocumentoFiscal; aviso?: string }
  onFechar: () => void
}) {
  const d = dados.documento
  return (
    <Caixa>
      <div className="text-center">
        <p className={`text-4xl ${d.status === 'REJEITADO' ? 'text-red-600' : 'text-mata-600'}`}>
          {d.status === 'REJEITADO' ? '✕' : '✓'}
        </p>
        <h2 className="mt-2 text-lg font-bold text-mata-900">
          {d.status === 'REJEITADO' ? 'Documento rejeitado' : 'Venda finalizada'}
        </h2>
        <p className="mt-4 text-3xl font-extrabold tabular-nums text-mata-900">{brl(dados.total)}</p>
        <ul className="mt-3 space-y-1 text-sm text-mata-900/60">
          {dados.pagamentos.map((p, i) => (
            <li key={i}>{formas.find((f) => f.id === p.forma)?.rotulo}: {brl(p.valor)}</li>
          ))}
        </ul>
        {dados.troco > 0 && (
          <p className="mt-3 rounded-lg bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-800">
            Troco: {brl(dados.troco)}
          </p>
        )}
      </div>

      {dados.aviso && (
        <p className="mt-4 rounded-xl border border-bela-400/40 bg-bela-500/10 px-4 py-3 text-xs font-semibold text-bela-800">
          {dados.aviso}
        </p>
      )}

      {d.status !== 'REJEITADO' && (
        <div className="mt-5 rounded-xl border border-mata-900/10 bg-white p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-mata-900/50">
            NFC-e · série {d.serie} · nº {d.numero}
          </p>
          <p className="text-[10px] text-mata-900/40">{EMITENTE.razaoSocial} — {EMITENTE.regime}</p>
          <div className="my-3 flex justify-center">
            <QrCode valor={d.urlConsulta} tamanho={140} />
          </div>
          <p className="break-all font-mono text-[10px] leading-relaxed text-mata-900/60">
            {formatarChave(d.chaveAcesso)}
          </p>
          <p className={`mt-2 text-[11px] font-bold ${d.contingencia ? 'text-bela-700' : 'text-mata-700'}`}>
            {d.contingencia ? 'EMITIDA EM CONTINGÊNCIA' : `Autorizada · protocolo ${d.protocolo}`}
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Sem cupom</button>
        <button className="btn-primary flex-1" onClick={onFechar}>Imprimir cupom</button>
      </div>
    </Caixa>
  )
}

function ModalMovimento({ onFechar, onConfirmar, resumo, colaboradores }: {
  onFechar: () => void
  onConfirmar: (motivo: 'SANGRIA' | 'SUPRIMENTO', valor: number, obs: string, autorizadoPor?: string) => void
  resumo: { vendas: number; sangrias: number }
  colaboradores: { nome: string; cargo: string; pin: string }[]
}) {
  const [motivo, setMotivo] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA')
  const [valor, setValor] = useState('')
  const [obs, setObs] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')

  // Sangria tira dinheiro do caixa: sempre exige alçada.
  const precisaAlcada = motivo === 'SANGRIA'

  function confirmar() {
    if (Number(valor) <= 0) return setErro('Informe um valor maior que zero.')
    if (!precisaAlcada) return onConfirmar(motivo, Number(valor), obs || '—')
    const supervisor = colaboradores.find((c) => c.pin === pin && c.cargo === 'GERENTE')
    if (!supervisor) return setErro('Sangria exige PIN de gerente.')
    onConfirmar(motivo, Number(valor), obs || '—', supervisor.nome)
  }

  return (
    <Caixa>
      <h2 className="text-lg font-bold text-mata-900">Movimentar caixa</h2>
      <p className="mt-0.5 text-sm text-mata-900/50">
        {resumo.vendas} vendas no turno · {brl(resumo.sangrias)} já retirados
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(['SANGRIA', 'SUPRIMENTO'] as const).map((m) => (
          <button key={m} onClick={() => { setMotivo(m); setErro('') }}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              motivo === m ? 'bg-bela-500 text-mata-900' : 'bg-mata-900/8 text-mata-900/60 hover:bg-mata-900/15'}`}>
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

      {precisaAlcada && (
        <div className="mt-4 rounded-xl border border-bela-400/40 bg-bela-500/10 p-4">
          <p className="text-xs font-semibold text-bela-800">Sangria exige autorização de gerente.</p>
          <input className="input mt-2.5 text-center tracking-[0.4em]" inputMode="numeric" maxLength={6}
                 placeholder="PIN" value={pin}
                 onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErro('') }} />
          <p className="mt-2 text-[11px] text-mata-900/50">PIN de gerente na demo: 4567</p>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-5 flex gap-2">
        <button className="btn-ghost flex-1" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary flex-1" onClick={confirmar}>Registrar</button>
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
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={onVoltar} className="mb-4 text-sm text-mata-900/40 hover:text-mata-800">← backoffice</button>
        <div className="vidro card-pad">
          <h1 className="text-xl font-extrabold text-mata-900">Abertura de caixa</h1>
          <p className="mt-1 text-sm text-mata-900/55">
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
