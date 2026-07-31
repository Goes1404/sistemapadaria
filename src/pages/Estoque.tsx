import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { JANELA_AMARELO, classificarFarol, diasParaVencer, saldoDoInsumo } from '@/lib/fefo'
import { brl, dataBR, dataHoraBR, num } from '@/lib/format'
import { Badge, BadgeFarol, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import { XML_EXEMPLO, aplicarDePara, ehErro, lerXmlNfe } from '@/lib/nfe'
import type {
  DeParaProduto, Farol, Insumo, Lote, MotivoPerda, NotaFornecedor, Produto, Unidade,
} from '@/types'

type Aba = 'vitrine' | 'lotes' | 'insumos' | 'movimentos' | 'perdas'

/**
 * Cada aba tem seu próprio contexto e sua própria ação principal.
 *
 * Antes o cabeçalho mostrava os quatro botões o tempo todo, em qualquer aba:
 * o usuário precisava ler todos para achar o que servia ali. Agora a aba
 * escolhe o que aparece, e o botão âmbar é sempre a ação esperada naquele
 * ponto do fluxo.
 */
const SUBTITULOS: Record<Aba, string> = {
  vitrine: 'O que saiu do forno e está à venda, com a validade contada da fabricação.',
  lotes: 'Cada lote de insumo é independente — saldos não se misturam.',
  insumos: 'Saldo consolidado e ponto de reposição de cada insumo.',
  movimentos: 'Todo movimento de entrada e saída, com origem rastreável.',
  perdas: 'Quanto o desperdício custou, e de onde ele veio.',
}

export default function Estoque() {
  const {
    insumos, lotes, movimentosEstoque, cadastrarLote, cadastrarInsumo, descartarLote,
    produtos, perdasBalcao, registrarPerda, cadastrarLotes, dePara, registrarDePara,
    lotesProduto, descartarLoteProduto, fichas, custoUnitario,
  } = useStore()

  const fichasDoProduto = (produtoId: string) => fichas.find((f) => f.produtoId === produtoId)
  const [aba, setAba] = useState<Aba>('vitrine')
  const [filtro, setFiltro] = useState<Farol | 'TODOS'>('TODOS')
  const [janela, setJanela] = useState(JANELA_AMARELO)
  const [abrirLote, setAbrirLote] = useState(false)
  const [abrirInsumo, setAbrirInsumo] = useState(false)
  const [abrirPerda, setAbrirPerda] = useState(false)
  const [importando, setImportando] = useState(false)
  const [etiqueta, setEtiqueta] = useState<string | null>(null)

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
        subtitulo={SUBTITULOS[aba]}
        acao={<AcoesDaAba />}
      />

      {aba === 'lotes' && (
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(['VERMELHO', 'AMARELO', 'VERDE'] as const).map((f) => {
          const rotulos = { VERMELHO: 'Vencidos / vencem hoje', AMARELO: `Vencem em até ${janela} dias`, VERDE: 'No prazo' }
          return (
            <button
              key={f}
              onClick={() => setFiltro(filtro === f ? 'TODOS' : f)}
              className={`vidro vidro-interativo card-pad text-left transition-all ${filtro === f ? "ring-2 ring-bela-500" : "hover:-translate-y-0.5"}`}
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
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="abas">
          {([
            ['vitrine', 'Na vitrine'],
            ['lotes', 'Lotes de insumo'],
            ['insumos', 'Insumos'],
            ['movimentos', 'Movimentações'],
            ['perdas', 'Perdas'],
          ] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => setAba(id)}
              className={aba === id ? 'aba-ativa' : 'aba-inativa'}>
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

      {aba === 'vitrine' && <Vitrine />}

      {aba === 'perdas' && <Perdas />}

      {etiqueta && (
        <ModalEtiqueta loteId={etiqueta} onFechar={() => setEtiqueta(null)} />
      )}

      {abrirLote && <ModalLote onFechar={() => setAbrirLote(false)} />}
      {abrirInsumo && <ModalInsumo onFechar={() => setAbrirInsumo(false)} />}
      {abrirPerda && (
        <ModalPerda produtos={produtos} onFechar={() => setAbrirPerda(false)} onRegistrar={registrarPerda} />
      )}
      {importando && (
        <ModalImportacao
          insumos={insumos}
          dePara={dePara}
          onFechar={() => setImportando(false)}
          onRegistrarDePara={registrarDePara}
          onConfirmar={cadastrarLotes}
        />
      )}
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
    const totalBalcao = perdasBalcao.reduce((s, p) => s + p.custoEstimado, 0)

    const rotuloMotivo: Record<string, string> = {
      SOBRA_FIM_DIA: 'Sobra do fim do dia', QUEIMADO: 'Queimado', QUEBRADO: 'Quebrado',
      DEVOLUCAO: 'Devolução', CONSUMO_INTERNO: 'Consumo interno', DOACAO: 'Doação',
    }

    const porMotivo = perdasBalcao.reduce<Record<string, { quantidade: number; custo: number }>>((acc, p) => {
      const atual = acc[p.motivo] ?? { quantidade: 0, custo: 0 }
      atual.quantidade += p.quantidade
      atual.custo += p.custoEstimado
      acc[p.motivo] = atual
      return acc
    }, {})
    const maiorMotivo = Math.max(1, ...Object.values(porMotivo).map((v) => v.custo))
    const nomeProduto = (id: string) => produtos.find((x) => x.id === id)?.nome ?? '—'

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat rotulo="Perda de balcão" valor={brl(totalBalcao)} numero={totalBalcao} formatar={brl}
                detalhe="produto pronto que não vendeu" tom={totalBalcao > 0 ? 'erro' : 'ok'} />
          <Stat rotulo="Insumo descartado" valor={brl(totalDescartado)} numero={totalDescartado} formatar={brl}
                detalhe={`${descartes.length} ${descartes.length === 1 ? 'descarte' : 'descartes'}`}
                tom={totalDescartado > 0 ? 'erro' : 'ok'} />
          <Stat rotulo="Vencido na prateleira" valor={brl(totalVencido)} numero={totalVencido} formatar={brl}
                detalhe="perda certa se não agir hoje" tom={totalVencido > 0 ? 'erro' : 'ok'} />
          <Stat rotulo="Em risco" valor={brl(totalEmRisco)} numero={totalEmRisco} formatar={brl}
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Perda de balcão por motivo">
            {Object.keys(porMotivo).length === 0 ? (
              <Vazio mensagem="Nenhuma perda de produto pronto registrada." />
            ) : (
              <ul className="space-y-3.5">
                {Object.entries(porMotivo)
                  .sort(([, a], [, b]) => b.custo - a.custo)
                  .map(([motivo, v]) => (
                    <li key={motivo}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium text-mata-900/70">{rotuloMotivo[motivo] ?? motivo}</span>
                        <span className="font-semibold tabular-nums">{brl(v.custo)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-mata-900/8">
                        <div className={`h-full rounded-full ${
                          motivo === 'DOACAO' || motivo === 'CONSUMO_INTERNO' ? 'bg-mata-500' : 'bg-red-500'}`}
                          style={{ width: `${(v.custo / maiorMotivo) * 100}%` }} />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
              Sobra do fim do dia quase nunca é problema de compra — é produção mal dimensionada.
              É este número que alimenta a previsão de produção.
            </p>
          </Card>

          <Card titulo="Perdas de balcão registradas">
            {perdasBalcao.length === 0 ? <Vazio mensagem="Nada registrado." /> : (
              <ul className="space-y-3">
                {perdasBalcao.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 border-b border-mata-900/8 pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-mata-900">{nomeProduto(p.produtoId)}</p>
                      <p className="text-xs text-mata-900/50">
                        {num(p.quantidade, 3)} · {rotuloMotivo[p.motivo] ?? p.motivo} · {p.registradoPor}
                      </p>
                      {p.observacao && <p className="text-xs italic text-mata-900/40">{p.observacao}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-700">
                      {brl(p.custoEstimado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card titulo="Histórico de descartes de insumo">
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

  /**
   * O que está na vitrine agora, com a validade contada da fabricação.
   *
   * É o outro lado do controle de lote: na entrada rastreamos o insumo do
   * fornecedor; aqui rastreamos o que saiu do forno.
   */
  function Vitrine() {
    const agora = Date.now()

    const enriquecidos = lotesProduto
      .filter((l) => l.status !== 'DESCARTADO')
      .map((l) => {
        const horas = (new Date(l.validoAte).getTime() - agora) / 3_600_000
        const farol: Farol = horas <= 0 ? 'VERMELHO' : horas <= 24 ? 'AMARELO' : 'VERDE'
        return { ...l, horas, farol }
      })
      .sort((a, b) => a.horas - b.horas)

    const comSaldo = enriquecidos.filter((l) => l.quantidadeAtual > 0)
    const vencidos = comSaldo.filter((l) => l.farol === 'VERMELHO')
    const hoje = comSaldo.filter((l) => l.farol === 'AMARELO')

    const valorEmRisco = vencidos.reduce(
      (s, l) => s + l.quantidadeAtual * custoUnitario(l.produtoId), 0)

    const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—'

    function prazo(horas: number): string {
      if (horas <= 0) {
        const h = Math.abs(Math.round(horas))
        return h < 24 ? `venceu há ${h}h` : `venceu há ${Math.round(h / 24)}d`
      }
      if (horas < 24) return `vence em ${Math.round(horas)}h`
      return `vence em ${Math.round(horas / 24)}d`
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat rotulo="Vencidos na vitrine" valor={String(vencidos.length)}
                numero={vencidos.length} formatar={(n) => String(Math.round(n))}
                detalhe={vencidos.length ? `${brl(valorEmRisco)} a descartar agora` : 'nada vencido'}
                tom={vencidos.length ? 'erro' : 'ok'} />
          <Stat rotulo="Vencem em 24h" valor={String(hoje.length)}
                numero={hoje.length} formatar={(n) => String(Math.round(n))}
                detalhe="promover ou usar hoje" tom={hoje.length ? 'alerta' : 'ok'} />
          <Stat rotulo="Lotes na vitrine" valor={String(comSaldo.length)}
                numero={comSaldo.length} formatar={(n) => String(Math.round(n))}
                detalhe="produção rastreada" />
        </div>

        {vencidos.length > 0 && (
          <div className="rounded-xl border-2 border-red-400/50 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-bold text-red-800">
              {vencidos.length} lote{vencidos.length > 1 ? 's' : ''} vencido
              {vencidos.length > 1 ? 's' : ''} ainda com saldo na vitrine
            </p>
            <p className="mt-1 text-sm text-mata-900/70">
              Retire do balcão e clique em <strong>Descartar</strong>. A perda é lançada
              automaticamente no relatório, com o custo calculado pela ficha técnica.
            </p>
          </div>
        )}

        <Card titulo="Produtos prontos, por validade">
          {comSaldo.length === 0 ? (
            <Vazio icone="◉"
                   mensagem="Nada na vitrine. Registre uma fornada em Produção e o lote aparece aqui com a validade já calculada." />
          ) : (
            <Tabela cabecalho={['Produto', 'Lote', 'Saldo', 'Fabricado', 'Válido até', 'Situação', 'Ações']}>
              {comSaldo.map((l) => (
                <tr key={l.id}>
                  <td className="td font-medium text-mata-800">{nomeProduto(l.produtoId)}</td>
                  <td className="td font-mono text-xs text-mata-900/50">{l.codigo}</td>
                  <td className="td tabular-nums">{num(l.quantidadeAtual, 1)}</td>
                  <td className="td whitespace-nowrap text-xs text-mata-900/60">{dataHoraBR(l.fabricadoEm)}</td>
                  <td className="td whitespace-nowrap tabular-nums">{dataHoraBR(l.validoAte)}</td>
                  <td className="td"><BadgeFarol farol={l.farol} texto={prazo(l.horas)} /></td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEtiqueta(l.id)}
                              className="rounded-lg border border-mata-900/15 bg-white px-2.5 py-1 text-xs font-semibold text-mata-800 transition-colors hover:bg-mata-900/5">
                        Etiqueta
                      </button>
                      {l.farol === 'VERMELHO' && (
                        <button onClick={() => descartarLoteProduto(l.id)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-500/20">
                          Descartar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Card>
      </div>
    )
  }

  /** Etiqueta que vai no produto embalado. */
  function ModalEtiqueta({ loteId, onFechar }: { loteId: string; onFechar: () => void }) {
    const lote = lotesProduto.find((l) => l.id === loteId)
    const produto = produtos.find((p) => p.id === lote?.produtoId)
    if (!lote || !produto) return null

    const ficha = fichasDoProduto(produto.id)

    return (
      <Modal titulo="Etiqueta de validade" onFechar={onFechar}>
        <div className="rounded-xl border-2 border-dashed border-mata-900/25 bg-white p-5">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-mata-900/50">
            Pães e Doces Bela Vista
          </p>
          <p className="mt-2 text-center text-lg font-extrabold text-mata-900">{produto.nome}</p>

          <dl className="mt-4 space-y-1.5 border-t border-mata-900/10 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-mata-900/55">Fabricação</dt>
              <dd className="font-semibold tabular-nums">{dataHoraBR(lote.fabricadoEm)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mata-900/55">Validade</dt>
              <dd className="font-bold tabular-nums text-red-700">{dataHoraBR(lote.validoAte)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mata-900/55">Lote</dt>
              <dd className="font-mono text-xs">{lote.codigo}</dd>
            </div>
          </dl>

          {ficha && (
            <p className="mt-3 border-t border-mata-900/10 pt-3 text-[11px] leading-relaxed text-mata-900/60">
              <strong className="text-mata-900">Ingredientes:</strong>{' '}
              {ficha.itens.map((i) => nomeInsumo(i.insumoId)).join(', ')}.
            </p>
          )}
          {produto.conservacao && (
            <p className="mt-1.5 text-[11px] text-mata-900/60">
              <strong className="text-mata-900">Conservação:</strong> {produto.conservacao}.
            </p>
          )}
        </div>

        <p className="mt-3 rounded-lg bg-mata-900/5 px-3 py-2 text-xs text-mata-900/55">
          Na loja, isto sai na impressora térmica e vai colado no produto embalado. Além de
          exigência sanitária, é o que permite rastrear o lote depois de vendido.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onFechar}>Fechar</button>
          <button className="btn-primary" onClick={onFechar}>Imprimir etiqueta</button>
        </div>
      </Modal>
    )
  }

  /** Ação principal muda com a aba, para não obrigar o usuário a procurar. */
  function AcoesDaAba() {
    if (aba === 'vitrine') {
      return (
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setAbrirPerda(true)}>Registrar perda</button>
          <a className="btn-primary" href="/app/producao">Registrar fornada</a>
        </div>
      )
    }
    if (aba === 'insumos') {
      return <button className="btn-primary" onClick={() => setAbrirInsumo(true)}>Novo insumo</button>
    }
    if (aba === 'perdas') {
      return <button className="btn-primary" onClick={() => setAbrirPerda(true)}>Registrar perda</button>
    }
    if (aba === 'movimentos') {
      return <button className="btn-ghost" onClick={() => setAba('lotes')}>Ver lotes</button>
    }
    return (
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => setImportando(true)}>Importar XML da NF-e</button>
        <button className="btn-primary" onClick={() => setAbrirLote(true)}>Entrada de lote</button>
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

/** Registro de perda de produto pronto — a sobra do balcão. */
function ModalPerda({ produtos, onFechar, onRegistrar }: {
  produtos: Produto[]
  onFechar: () => void
  onRegistrar: (dados: { produtoId: string; quantidade: number; motivo: MotivoPerda; observacao?: string }) => void
}) {
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState<MotivoPerda>('SOBRA_FIM_DIA')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  const motivos: { id: MotivoPerda; rotulo: string }[] = [
    { id: 'SOBRA_FIM_DIA', rotulo: 'Sobra do fim do dia' },
    { id: 'QUEIMADO', rotulo: 'Queimado' },
    { id: 'QUEBRADO', rotulo: 'Quebrado' },
    { id: 'DEVOLUCAO', rotulo: 'Devolução' },
    { id: 'CONSUMO_INTERNO', rotulo: 'Consumo interno' },
    { id: 'DOACAO', rotulo: 'Doação' },
  ]

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (Number(quantidade) <= 0) return setErro('Informe uma quantidade maior que zero.')
    onRegistrar({ produtoId, quantidade: Number(quantidade), motivo, observacao: observacao || undefined })
    onFechar()
  }

  return (
    <Modal titulo="Registrar perda de balcão" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="label">Produto</label>
          <select className="input" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantidade</label>
            <input className="input" type="number" step="0.001" value={quantidade}
                   onChange={(e) => { setQuantidade(e.target.value); setErro('') }} />
          </div>
          <div>
            <label className="label">Motivo</label>
            <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoPerda)}>
              {motivos.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Observação (opcional)</label>
          <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)}
                 placeholder="Ex: sobra do balcão da tarde" />
        </div>
        <p className="rounded-xl bg-mata-900/5 px-4 py-3 text-xs text-mata-900/60">
          O custo é calculado pela ficha técnica no momento do registro. É esse número que revela
          se o desperdício está na compra ou na produção.
        </p>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primary">Registrar perda</button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Importação da nota do fornecedor.
 *
 * O XML preenche fornecedor, produtos, quantidades e valores. Lote e validade
 * continuam manuais — não vêm na nota, e são a base do FEFO.
 */
function ModalImportacao({ insumos, dePara, onFechar, onRegistrarDePara, onConfirmar }: {
  insumos: Insumo[]
  dePara: DeParaProduto[]
  onFechar: () => void
  onRegistrarDePara: (mapa: DeParaProduto) => void
  onConfirmar: (lotes: Omit<Lote, 'id' | 'status' | 'quantidadeAtual'>[], referencia: string) => void
}) {
  const [nota, setNota] = useState<NotaFornecedor | null>(null)
  const [erro, setErro] = useState('')
  const [linhas, setLinhas] = useState<{ insumoId: string; lote: string; validade: string; fator: string }[]>([])

  function analisar(xml: string) {
    const r = lerXmlNfe(xml)
    if (ehErro(r)) return setErro(r.erro)
    const comDePara = aplicarDePara(r, dePara)
    setNota(comDePara)
    setLinhas(comDePara.itens.map((i) => ({ insumoId: i.insumoId ?? '', lote: '', validade: '', fator: '1' })))
    setErro('')
  }

  function carregarArquivo(arquivo: File) {
    const leitor = new FileReader()
    leitor.onload = () => analisar(String(leitor.result))
    leitor.readAsText(arquivo)
  }

  const prontos = linhas.filter((l) => l.insumoId && l.lote && l.validade).length
  const podeConfirmar = nota !== null && prontos === linhas.length && linhas.length > 0

  function confirmar() {
    if (!nota) return
    const novos = linhas.map((l, i) => {
      const item = nota.itens[i]
      const fator = Number(l.fator) || 1
      const quantidade = item.quantidade * fator
      // Registra o de-para para a próxima importação não perguntar de novo.
      onRegistrarDePara({ codigoFornecedor: item.codigoFornecedor, insumoId: l.insumoId })
      return {
        insumoId: l.insumoId,
        codigo: l.lote,
        quantidadeInicial: quantidade,
        dataValidade: l.validade,
        custoUnitario: quantidade > 0 ? (item.quantidade * item.valorUnitario) / quantidade : 0,
      }
    })
    onConfirmar(novos, `NF-e ${nota.numero} — ${nota.fornecedor.razaoSocial}`)
    onFechar()
  }

  return (
    <Modal titulo="Importar XML da NF-e do fornecedor" onFechar={onFechar}>
      {!nota ? (
        <div className="space-y-4">
          <p className="text-sm text-mata-900/70">
            Numa entrega com 40 itens, digitar tudo à mão leva meia hora e erra. O XML da nota
            preenche fornecedor, produtos, quantidades e valores de uma vez.
          </p>
          <div>
            <label className="label">Arquivo XML</label>
            <input type="file" accept=".xml,text/xml,application/xml" className="input py-2"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) carregarArquivo(f) }} />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="rounded-xl bg-mata-900/5 px-4 py-3">
            <p className="text-xs text-mata-900/60">
              Sem um XML à mão? Use a nota de exemplo do Moinho São Jorge, com 4 itens.
            </p>
            <button className="btn-ghost mt-2.5 w-full py-2 text-sm" onClick={() => analisar(XML_EXEMPLO)}>
              Carregar nota de exemplo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-mata-900/5 p-4">
            <p className="text-sm font-bold text-mata-900">{nota.fornecedor.razaoSocial}</p>
            <p className="text-xs text-mata-900/55">
              NF-e {nota.numero} · {dataBR(nota.emitidaEm)} · {brl(nota.valorTotal)}
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-mata-900/35">{nota.chaveAcesso}</p>
          </div>

          <p className="text-xs text-mata-900/60">
            <strong className="text-mata-900">{prontos} de {linhas.length}</strong> itens prontos.
            Lote e validade não vêm no XML — precisam ser digitados, porque são a base do FEFO.
          </p>

          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {nota.itens.map((item, i) => (
              <li key={item.codigoFornecedor} className="rounded-xl border border-mata-900/10 bg-white/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-mata-900">{item.descricao}</p>
                    <p className="text-xs text-mata-900/50">
                      <span className="font-mono">{item.codigoFornecedor}</span> · {num(item.quantidade)} {item.unidade} ·{' '}
                      {brl(item.valorUnitario)}/un
                    </p>
                  </div>
                  {item.insumoId && (
                    <span className="shrink-0"><Badge tom="ok">de-para ok</Badge></span>
                  )}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <select className="input py-1.5 text-xs" value={linhas[i]?.insumoId ?? ''}
                          onChange={(e) => setLinhas((a) => a.map((l, idx) => idx === i ? { ...l, insumoId: e.target.value } : l))}>
                    <option value="">Associar ao insumo…</option>
                    {insumos.map((ins) => <option key={ins.id} value={ins.id}>{ins.nome}</option>)}
                  </select>
                  <input className="input py-1.5 text-xs" placeholder="Fator de conversão" type="number" step="0.01"
                         value={linhas[i]?.fator ?? '1'}
                         onChange={(e) => setLinhas((a) => a.map((l, idx) => idx === i ? { ...l, fator: e.target.value } : l))} />
                  <input className="input py-1.5 text-xs" placeholder="Nº do lote"
                         value={linhas[i]?.lote ?? ''}
                         onChange={(e) => setLinhas((a) => a.map((l, idx) => idx === i ? { ...l, lote: e.target.value } : l))} />
                  <input className="input py-1.5 text-xs" type="date"
                         value={linhas[i]?.validade ?? ''}
                         onChange={(e) => setLinhas((a) => a.map((l, idx) => idx === i ? { ...l, validade: e.target.value } : l))} />
                </div>
              </li>
            ))}
          </ul>

          <p className="rounded-xl bg-bela-500/10 px-4 py-2.5 text-xs text-bela-800">
            O fator de conversão traduz a unidade do fornecedor para a nossa: 1 saco de 25 kg
            vira 25 na unidade KG.
          </p>

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setNota(null)}>Trocar arquivo</button>
            <button className="btn-primary" disabled={!podeConfirmar} onClick={confirmar}>
              Dar entrada em {linhas.length} lotes
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
