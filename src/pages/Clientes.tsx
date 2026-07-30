import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { brl, dataBR, num } from '@/lib/format'
import { Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import { Modal } from '@/pages/Estoque'
import type { Cliente } from '@/types'

type Aba = 'clientes' | 'clube' | 'campanhas'

export default function Clientes() {
  const { clientes, todasVendas, saldoPontos, resgatarPontos, cadastrarCliente, produtos } = useStore()
  const [aba, setAba] = useState<Aba>('clientes')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [resgatando, setResgatando] = useState<Cliente | null>(null)

  /** Consolida o histórico de compra por cliente. */
  const resumos = useMemo(() => {
    const mapa = new Map<string, { gasto: number; compras: number; ultima?: string }>()
    for (const v of todasVendas) {
      if (!v.clienteId) continue
      const atual = mapa.get(v.clienteId) ?? { gasto: 0, compras: 0 }
      atual.gasto += v.total
      atual.compras += 1
      if (!atual.ultima || v.criadaEm > atual.ultima) atual.ultima = v.criadaEm
      mapa.set(v.clienteId, atual)
    }
    return mapa
  }, [todasVendas])

  const visiveis = clientes.filter(
    (c) => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca),
  )

  const assinantes = clientes.filter((c) => c.assinatura)
  const receitaRecorrente = assinantes
    .filter((c) => c.assinatura?.status === 'ATIVA')
    .reduce((s, c) => s + (c.assinatura?.valorMensal ?? 0), 0)
  const pontosEmCirculacao = clientes.reduce((s, c) => s + saldoPontos(c.id), 0)

  const hoje = new Date()
  const aniversariantes = clientes.filter((c) => {
    if (!c.nascimento) return false
    const d = new Date(`${c.nascimento}T00:00:00`)
    return d.getMonth() === hoje.getMonth()
  })

  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—'

  return (
    <>
      <PageHeader
        titulo="Clientes"
        subtitulo="Quem compra, quanto compra e quem assina o clube do pão."
        acao={<button className="btn-primary" onClick={() => setNovo(true)}>Novo cliente</button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Clientes cadastrados" valor={String(clientes.length)}
              numero={clientes.length} formatar={(n) => String(Math.round(n))} detalhe="base ativa" />
        <Stat rotulo="Assinantes do clube" valor={String(assinantes.length)}
              numero={assinantes.length} formatar={(n) => String(Math.round(n))}
              detalhe="demanda conhecida com antecedência" tom="ok" />
        <Stat rotulo="Receita recorrente" valor={brl(receitaRecorrente)}
              numero={receitaRecorrente} formatar={brl} detalhe="por mês, garantida" tom="ok" />
        <Stat rotulo="Pontos em circulação" valor={num(pontosEmCirculacao)}
              numero={pontosEmCirculacao} formatar={(n) => num(Math.round(n))}
              detalhe="passivo de fidelidade" tom="alerta" />
      </div>

      <nav className="mb-4 flex gap-1 rounded-lg bg-mata-900/8 p-1">
        {([['clientes', 'Base'], ['clube', 'Clube do pão'], ['campanhas', 'Campanhas']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              aba === id ? 'bg-white text-mata-900 shadow-sm' : 'text-mata-900/60 hover:text-mata-900'}`}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'clientes' && (
        <Card acao={
          <input className="input w-56 py-1.5 text-xs" placeholder="Buscar por nome ou telefone…"
                 value={busca} onChange={(e) => setBusca(e.target.value)} />
        } titulo="Base de clientes">
          {visiveis.length === 0 ? <Vazio mensagem="Nenhum cliente encontrado." /> : (
            <Tabela cabecalho={['Cliente', 'Contato', 'Compras', 'Total gasto', 'Pontos', '']}>
              {visiveis.map((c) => {
                const r = resumos.get(c.id)
                return (
                  <tr key={c.id}>
                    <td className="td">
                      <span className="font-medium text-mata-800">{c.nome}</span>
                      {c.assinatura && (
                        <span className="ml-2"><Badge tom="ok">clube</Badge></span>
                      )}
                    </td>
                    <td className="td text-mata-900/60">{c.telefone}</td>
                    <td className="td tabular-nums">{r?.compras ?? 0}</td>
                    <td className="td tabular-nums">{brl(r?.gasto ?? 0)}</td>
                    <td className="td tabular-nums font-semibold text-bela-700">{num(saldoPontos(c.id))}</td>
                    <td className="td text-right">
                      {saldoPontos(c.id) > 0 && (
                        <button onClick={() => setResgatando(c)}
                                className="text-xs font-semibold text-bela-700 hover:underline">Resgatar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Tabela>
          )}
        </Card>
      )}

      {aba === 'clube' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Assinaturas ativas">
            {assinantes.length === 0 ? <Vazio mensagem="Nenhuma assinatura." /> : (
              <ul className="space-y-4">
                {assinantes.map((c) => (
                  <li key={c.id} className="rounded-xl border border-mata-900/10 bg-white/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-mata-900">{c.nome}</p>
                        <p className="text-xs text-mata-900/55">{c.assinatura?.plano}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-mata-900">{brl(c.assinatura?.valorMensal ?? 0)}</p>
                        <p className="text-[11px] text-mata-900/45">por mês</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 border-t border-mata-900/10 pt-2.5 text-sm">
                      {c.assinatura?.itens.map((i) => (
                        <li key={i.produtoId} className="flex justify-between text-mata-900/70">
                          <span>{nomeProduto(i.produtoId)}</span>
                          <span className="tabular-nums">{num(i.quantidade, 3)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Por que assinatura importa">
            <div className="space-y-4 text-sm text-mata-900/70">
              <p>
                Padaria é um dos poucos varejos onde assinatura funciona naturalmente, porque o
                consumo é diário.
              </p>
              <p>
                O ganho maior não é nem a <strong className="text-mata-900">receita recorrente</strong> de{' '}
                {brl(receitaRecorrente)} por mês. É a <strong className="text-mata-900">demanda conhecida
                com antecedência</strong>: essas quantidades entram direto na pauta de produção do padeiro,
                em vez de virar chute.
              </p>
              <p>
                Quando o cliente viaja, ele pausa em vez de cancelar — e a produção já não conta com ele
                naquela semana.
              </p>
            </div>
            <div className="mt-4 rounded-xl bg-mata-900/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-mata-900/50">Entregas de amanhã</p>
              <ul className="mt-2 space-y-1 text-sm">
                {assinantes
                  .filter((c) => c.assinatura?.status === 'ATIVA')
                  .flatMap((c) => c.assinatura!.itens)
                  .reduce<{ produtoId: string; quantidade: number }[]>((acc, item) => {
                    const existente = acc.find((a) => a.produtoId === item.produtoId)
                    if (existente) existente.quantidade += item.quantidade
                    else acc.push({ ...item })
                    return acc
                  }, [])
                  .map((i) => (
                    <li key={i.produtoId} className="flex justify-between text-mata-900/70">
                      <span>{nomeProduto(i.produtoId)}</span>
                      <span className="font-semibold tabular-nums text-mata-900">{num(i.quantidade, 3)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      {aba === 'campanhas' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo={`Aniversariantes do mês (${aniversariantes.length})`}>
            {aniversariantes.length === 0 ? <Vazio mensagem="Ninguém faz aniversário este mês." /> : (
              <ul className="space-y-2.5">
                {aniversariantes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-mata-900">{c.nome}</p>
                      <p className="text-xs text-mata-900/50">{dataBR(c.nascimento!)}</p>
                    </div>
                    <Badge tom={c.aceitaContato ? 'ok' : 'neutro'}>
                      {c.aceitaContato ? 'pode contatar' : 'sem consentimento'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/50">
              A mensagem sai pelo WhatsApp que já está integrado. Quem não deu consentimento não entra
              no disparo — exigência de LGPD, não detalhe.
            </p>
          </Card>

          <Card titulo="Segmentos disponíveis">
            <ul className="space-y-3 text-sm">
              {[
                { nome: 'Aniversariantes do mês', qtd: aniversariantes.length, uso: 'Cupom de brinde no dia' },
                { nome: 'Assinantes do clube', qtd: assinantes.length, uso: 'Avisos de pausa e renovação' },
                { nome: 'Sem comprar há 30 dias', qtd: 0, uso: 'Reativação — precisa de histórico real' },
                { nome: 'Maiores gastos', qtd: clientes.length, uso: 'Lançamentos e degustação' },
              ].map((s) => (
                <li key={s.nome} className="flex items-center justify-between gap-3 border-b border-mata-900/8 pb-3 last:border-0">
                  <div>
                    <p className="font-semibold text-mata-900">{s.nome}</p>
                    <p className="text-xs text-mata-900/50">{s.uso}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-mata-900/60">{s.qtd}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {novo && <ModalCliente onFechar={() => setNovo(false)} onSalvar={cadastrarCliente} />}
      {resgatando && (
        <ModalResgate cliente={resgatando} saldo={saldoPontos(resgatando.id)}
          onFechar={() => setResgatando(null)}
          onResgatar={(pontos) => {
            const r = resgatarPontos(resgatando.id, pontos)
            if (r.ok) setResgatando(null)
            return r
          }} />
      )}
    </>
  )
}

function ModalCliente({ onFechar, onSalvar }: {
  onFechar: () => void
  onSalvar: (dados: Omit<Cliente, 'id' | 'criadoEm'>) => Cliente
}) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [aceita, setAceita] = useState(true)
  const [erro, setErro] = useState('')

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Informe o nome.')
    if (telefone.replace(/\D/g, '').length < 10) return setErro('Telefone incompleto.')
    onSalvar({
      nome: nome.trim(), telefone, cpf: cpf || undefined,
      nascimento: nascimento || undefined, aceitaContato: aceita,
    })
    onFechar()
  }

  return (
    <Modal titulo="Novo cliente" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                   placeholder="(11) 90000-0000" />
          </div>
          <div>
            <label className="label">CPF (opcional)</label>
            <input className="input" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div>
          <label className="label">Nascimento (opcional)</label>
          <input className="input" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
        </div>
        <label className="flex items-start gap-2.5 rounded-xl bg-mata-900/5 p-3 text-sm">
          <input type="checkbox" checked={aceita} onChange={(e) => setAceita(e.target.checked)}
                 className="mt-0.5 h-4 w-4 accent-bela-600" />
          <span className="text-mata-900/70">
            Aceita receber contato por WhatsApp.
            <span className="block text-xs text-mata-900/50">
              Sem este consentimento o cliente não entra em campanha — exigência de LGPD.
            </span>
          </span>
        </label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primary">Cadastrar</button>
        </div>
      </form>
    </Modal>
  )
}

function ModalResgate({ cliente, saldo, onFechar, onResgatar }: {
  cliente: Cliente
  saldo: number
  onFechar: () => void
  onResgatar: (pontos: number) => { ok: boolean; erro?: string }
}) {
  const [pontos, setPontos] = useState('')
  const [erro, setErro] = useState('')

  return (
    <Modal titulo="Resgatar pontos" onFechar={onFechar}>
      <p className="text-sm text-mata-900/70">
        <strong className="text-mata-900">{cliente.nome}</strong> tem{' '}
        <strong className="text-bela-700">{num(saldo)} pontos</strong> disponíveis.
      </p>
      <div className="mt-4">
        <label className="label">Quantos pontos resgatar</label>
        <input autoFocus className="input text-center text-xl" type="number" value={pontos}
               onChange={(e) => { setPontos(e.target.value); setErro('') }} />
      </div>
      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" onClick={() => {
          const r = onResgatar(Number(pontos) || 0)
          if (!r.ok) setErro(r.erro ?? 'Não foi possível resgatar.')
        }}>Resgatar</button>
      </div>
    </Modal>
  )
}
