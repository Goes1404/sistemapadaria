import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { dataHoraBR, horaBR } from '@/lib/format'
import {
  apurarDia, gerarAfd, marcacoesEfetivas, rotuloPonto, verificarIntegridade,
} from '@/lib/ponto'
import { Aviso, Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import { Modal } from '@/pages/Estoque'
import type { Cargo, RegistroPonto } from '@/types'

type Aba = 'equipe' | 'marcacoes' | 'apuracao' | 'integridade'

export default function RH() {
  const { colaboradores, registrosPonto, ajustesPonto, ajustarPonto, cadastrarColaborador } = useStore()
  const [aba, setAba] = useState<Aba>('equipe')
  const [abrirNovo, setAbrirNovo] = useState(false)
  const [ajustando, setAjustando] = useState<RegistroPonto | null>(null)

  const inconsistentes = registrosPonto.filter((r) => r.inconsistencia)
  const nome = (id: string) => colaboradores.find((c) => c.id === id)?.nome ?? '—'

  const efetivas = useMemo(
    () => marcacoesEfetivas(registrosPonto, ajustesPonto),
    [registrosPonto, ajustesPonto],
  )

  const quebras = useMemo(
    () => verificarIntegridade(registrosPonto.filter((r) => r.nsr > 0)),
    [registrosPonto],
  )

  /** Apuração por colaborador e por dia, sobre as marcações já ajustadas. */
  const apuracoes = useMemo(() => {
    const porChave = new Map<string, RegistroPonto[]>()
    for (const m of efetivas) {
      const data = m.registradoEm.slice(0, 10)
      const chave = `${m.colaboradorId}|${data}`
      porChave.set(chave, [...(porChave.get(chave) ?? []), m])
    }
    return [...porChave.entries()]
      .map(([chave, marcacoes]) => {
        const [colaboradorId, data] = chave.split('|')
        return apurarDia(marcacoes, data, colaboradorId)
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [efetivas])

  function statusAtual(colaboradorId: string) {
    const meus = efetivas
      .filter((r) => r.colaboradorId === colaboradorId)
      .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
    const ultimo = meus[0]
    if (!ultimo || ultimo.tipo === 'SAIDA') return { texto: 'Fora', tom: 'neutro' as const }
    if (ultimo.tipo === 'PAUSA_INICIO') return { texto: 'Em intervalo', tom: 'alerta' as const }
    return { texto: 'Trabalhando', tom: 'ok' as const }
  }

  function baixarAfd() {
    const datas = registrosPonto.map((r) => r.registradoEm).sort()
    const conteudo = gerarAfd(
      registrosPonto.filter((r) => r.nsr > 0),
      colaboradores,
      datas[0] ?? new Date().toISOString(),
      datas[datas.length - 1] ?? new Date().toISOString(),
    )
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AFD_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        titulo="Equipe"
        subtitulo="Marcações registradas com a hora do servidor, imutáveis e encadeadas por hash."
        acao={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={baixarAfd}>Baixar AFD</button>
            <button className="btn-primary" onClick={() => setAbrirNovo(true)}>Novo colaborador</button>
          </div>
        }
      />

      {inconsistentes.length > 0 && (
        <div className="mb-6">
          <Aviso tom="erro">
            <strong>{inconsistentes.length} turno(s) em aberto há mais de 14 horas.</strong>{' '}
            O sistema marcou como inconsistência e aguarda o ajuste do gerente. A marcação original
            permanece intacta — o ajuste entra como registro à parte.
          </Aviso>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat rotulo="Marcações na série" valor={String(registrosPonto.filter((r) => r.nsr > 0).length)}
              numero={registrosPonto.filter((r) => r.nsr > 0).length} formatar={(n) => String(Math.round(n))}
              detalhe="numeradas por NSR" />
        <Stat rotulo="Ajustes do gerente" valor={String(ajustesPonto.length)}
              numero={ajustesPonto.length} formatar={(n) => String(Math.round(n))}
              detalhe="registros à parte, nada sobrescrito"
              tom={ajustesPonto.length > 0 ? 'alerta' : 'neutro'} />
        <Stat rotulo="Integridade da cadeia"
              valor={quebras.length === 0 ? 'Íntegra' : `${quebras.length} quebra(s)`}
              detalhe="hash encadeado entre marcações"
              tom={quebras.length === 0 ? 'ok' : 'erro'} />
      </div>

      <nav className="mb-4 flex flex-wrap gap-1 rounded-lg bg-mata-900/8 p-1">
        {([['equipe', 'Equipe'], ['marcacoes', 'Marcações'], ['apuracao', 'Apuração'], ['integridade', 'Integridade']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              aba === id ? 'bg-white text-mata-900 shadow-sm' : 'text-mata-900/60 hover:text-mata-900'}`}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'equipe' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Quem está na loja agora">
            <ul className="space-y-3">
              {colaboradores.map((c) => {
                const s = statusAtual(c.id)
                return (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-mata-900">{c.nome}</p>
                      <p className="text-xs text-mata-900/50">{c.cargo.toLowerCase()} · PIN {c.pin}</p>
                    </div>
                    <Badge tom={s.tom}>{s.texto}</Badge>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card titulo="Inconsistências a resolver">
            {inconsistentes.length === 0 ? <Vazio mensagem="Nenhuma pendência." /> : (
              <ul className="space-y-3">
                {inconsistentes.map((r) => (
                  <li key={r.id} className="rounded-xl border border-red-300/50 bg-red-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-mata-900">{nome(r.colaboradorId)}</p>
                    <p className="mt-0.5 text-xs text-mata-900/60">
                      Entrada em {dataHoraBR(r.registradoEm)} sem saída correspondente · NSR {r.nsr}
                    </p>
                    <button className="btn-danger mt-3 w-full py-2" onClick={() => setAjustando(r)}>
                      Registrar ajuste
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {aba === 'marcacoes' && (
        <div className="space-y-6">
          <Card titulo="Marcações registradas">
            <Tabela cabecalho={['NSR', 'Colaborador', 'Tipo', 'Horário', 'Hash', 'Situação']}>
              {[...registrosPonto]
                .filter((r) => r.nsr > 0)
                .sort((a, b) => b.nsr - a.nsr)
                .map((r) => (
                  <tr key={r.id}>
                    <td className="td font-mono text-xs text-mata-900/50">{r.nsr}</td>
                    <td className="td font-medium text-mata-800">{nome(r.colaboradorId)}</td>
                    <td className="td text-mata-900/60">{rotuloPonto[r.tipo]}</td>
                    <td className="td tabular-nums">{dataHoraBR(r.registradoEm)}</td>
                    <td className="td font-mono text-[11px] text-mata-900/40">{r.hash}</td>
                    <td className="td">
                      {r.inconsistencia ? <Badge tom="erro">Inconsistência</Badge> : <Badge tom="ok">OK</Badge>}
                    </td>
                  </tr>
                ))}
            </Tabela>
          </Card>

          {ajustesPonto.length > 0 && (
            <Card titulo="Ajustes do gerente">
              <Tabela cabecalho={['Quando', 'Colaborador', 'Tipo', 'Para', 'Justificativa', 'Por']}>
                {ajustesPonto.map((a) => (
                  <tr key={a.id}>
                    <td className="td text-xs text-mata-900/50">{dataHoraBR(a.ajustadoEm)}</td>
                    <td className="td font-medium text-mata-800">{nome(a.colaboradorId)}</td>
                    <td className="td"><Badge tom="alerta">{a.tipo}</Badge></td>
                    <td className="td tabular-nums">{horaBR(a.valorNovo)}</td>
                    <td className="td text-mata-900/70">{a.justificativa}</td>
                    <td className="td text-xs text-mata-900/60">{a.ajustadoPor}</td>
                  </tr>
                ))}
              </Tabela>
              <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
                O ajuste não altera a marcação original — ele a acompanha. A tabela acima continua
                mostrando o que foi efetivamente registrado no terminal.
              </p>
            </Card>
          )}
        </div>
      )}

      {aba === 'apuracao' && (
        <Card titulo="Apuração por dia">
          {apuracoes.length === 0 ? <Vazio mensagem="Sem marcações para apurar." /> : (
            <Tabela cabecalho={['Data', 'Colaborador', 'Entrada', 'Saída', 'Intervalo', 'Horas', 'Saldo', 'Situação']}>
              {apuracoes.map((a, i) => (
                <tr key={`${a.colaboradorId}-${a.data}-${i}`}>
                  <td className="td tabular-nums text-xs text-mata-900/60">
                    {a.data.split('-').reverse().join('/')}
                  </td>
                  <td className="td font-medium text-mata-800">{nome(a.colaboradorId)}</td>
                  <td className="td tabular-nums">{a.entrada ? horaBR(a.entrada) : '—'}</td>
                  <td className="td tabular-nums">{a.saida ? horaBR(a.saida) : '—'}</td>
                  <td className="td tabular-nums">{a.intervaloMinutos > 0 ? `${a.intervaloMinutos} min` : '—'}</td>
                  <td className="td tabular-nums font-semibold">{a.horasTrabalhadas.toFixed(2)}h</td>
                  <td className={`td tabular-nums ${a.extras > 0 ? 'font-semibold text-mata-700' : 'text-mata-900/35'}`}>
                    {a.extras > 0 ? `+${a.extras.toFixed(2)}h` : a.atrasoMinutos > 0 ? `−${a.atrasoMinutos}min` : '—'}
                  </td>
                  <td className="td">
                    {a.observacoes.length === 0
                      ? <Badge tom="ok">Regular</Badge>
                      : <span title={a.observacoes.join(' · ')}><Badge tom="erro">{a.observacoes[0]}</Badge></span>}
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
          <p className="mt-4 border-t border-mata-900/10 pt-3 text-xs text-mata-900/55">
            Tolerância de 10 minutos para mais ou para menos antes de virar hora extra ou atraso.
            Intervalo abaixo de 60 min é sinalizado.
          </p>
        </Card>
      )}

      {aba === 'integridade' && (
        <div className="space-y-6">
          <Card titulo="Verificação da cadeia de hash">
            {quebras.length === 0 ? (
              <div className="rounded-xl border border-mata-400/40 bg-mata-500/10 p-5 text-center">
                <p className="text-3xl text-mata-600">✓</p>
                <p className="mt-2 font-bold text-mata-900">Série íntegra</p>
                <p className="mt-1 text-sm text-mata-900/60">
                  Todas as {registrosPonto.filter((r) => r.nsr > 0).length} marcações conferem com o
                  próprio hash e apontam corretamente para a anterior.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {quebras.map((q, i) => (
                  <li key={i} className="rounded-xl border border-red-300/50 bg-red-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-red-800">NSR {q.nsr}</p>
                    <p className="text-xs text-mata-900/70">{q.motivo}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Como funciona">
            <div className="space-y-3 text-sm text-mata-900/70">
              <p>
                Cada marcação carrega o hash da anterior. Alterar um registro no meio da série quebra
                a cadeia a partir dali, e a verificação aponta exatamente em qual NSR.
              </p>
              <p>
                É isso que dá <strong className="text-mata-900">não-repúdio</strong> ao ponto: não
                basta o sistema dizer que o registro é verdadeiro; ele precisa provar que não foi
                mexido depois.
              </p>
              <p>
                O botão <strong className="text-mata-900">Baixar AFD</strong> gera o arquivo que a
                fiscalização pede, com cabeçalho, marcações numeradas e trailer.
              </p>
              <p className="rounded-xl bg-bela-500/10 px-4 py-3 text-xs text-bela-800">
                <strong>No protótipo</strong>, o hash é FNV-1a — determinístico e suficiente para
                demonstrar o encadeamento. Na versão de produção use SHA-256: a FNV não resiste a
                colisão proposital e não serviria como prova. O layout do AFD também precisa ser
                conferido contra a portaria vigente.
              </p>
            </div>
          </Card>
        </div>
      )}

      {ajustando && (
        <ModalAjuste
          registro={ajustando}
          nomeColaborador={nome(ajustando.colaboradorId)}
          onFechar={() => setAjustando(null)}
          onConfirmar={(hora, justificativa) => {
            const base = new Date(ajustando.registradoEm)
            const [h, m] = hora.split(':').map(Number)
            base.setHours(h, m, 0, 0)
            ajustarPonto({
              marcacaoOriginalId: ajustando.id,
              colaboradorId: ajustando.colaboradorId,
              tipo: 'INCLUSAO',
              tipoPonto: 'SAIDA',
              valorNovo: base.toISOString(),
              justificativa,
            })
            setAjustando(null)
          }}
        />
      )}
      {abrirNovo && <ModalColaborador onFechar={() => setAbrirNovo(false)} />}
    </>
  )

  function ModalAjuste({ registro, nomeColaborador, onFechar, onConfirmar }: {
    registro: RegistroPonto
    nomeColaborador: string
    onFechar: () => void
    onConfirmar: (hora: string, justificativa: string) => void
  }) {
    const [hora, setHora] = useState('18:00')
    const [justificativa, setJustificativa] = useState('')
    const [erro, setErro] = useState('')

    return (
      <Modal titulo="Registrar ajuste de ponto" onFechar={onFechar}>
        <p className="text-sm text-mata-900/70">
          <strong className="text-mata-900">{nomeColaborador}</strong> registrou entrada às{' '}
          {horaBR(registro.registradoEm)} (NSR {registro.nsr}) e não registrou saída.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Horário real de saída</label>
            <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div>
            <label className="label">Justificativa</label>
            <input className="input" value={justificativa}
                   onChange={(e) => { setJustificativa(e.target.value); setErro('') }}
                   placeholder="Ex: esqueceu de bater a saída, confirmado com o colaborador" />
          </div>
        </div>

        <p className="mt-3 rounded-xl bg-mata-900/5 px-4 py-3 text-xs text-mata-900/60">
          A marcação original <strong className="text-mata-900">não será alterada</strong>. Este ajuste
          entra como registro à parte, com o seu nome e a justificativa, e aparece na auditoria.
        </p>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button className="btn-primary" onClick={() => {
            if (justificativa.trim().length < 5) return setErro('A justificativa é obrigatória.')
            onConfirmar(hora, justificativa.trim())
          }}>Registrar ajuste</button>
        </div>
      </Modal>
    )
  }

  function ModalColaborador({ onFechar }: { onFechar: () => void }) {
    const [nomeNovo, setNomeNovo] = useState('')
    const [cargo, setCargo] = useState<Cargo>('ATENDENTE')
    const [pin, setPin] = useState('')
    const [cpf, setCpf] = useState('')
    const [erro, setErro] = useState('')

    function salvar(e: React.FormEvent) {
      e.preventDefault()
      if (!nomeNovo.trim()) return setErro('Informe o nome.')
      if (!/^\d{4,6}$/.test(pin)) return setErro('O PIN deve ter de 4 a 6 dígitos.')
      if (colaboradores.some((c) => c.pin === pin)) return setErro('Este PIN já está em uso.')
      if (cpf.replace(/\D/g, '').length !== 11) return setErro('CPF é obrigatório para o AFD.')
      cadastrarColaborador({ nome: nomeNovo.trim(), cargo, pin, cpf: cpf.replace(/\D/g, '') })
      onFechar()
    }

    return (
      <Modal titulo="Novo colaborador" onFechar={onFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
          </div>
          <div>
            <label className="label">CPF</label>
            <input className="input" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                   maxLength={11} placeholder="Necessário para o arquivo de fiscalização" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cargo</label>
              <select className="input" value={cargo} onChange={(e) => setCargo(e.target.value as Cargo)}>
                {(['GERENTE', 'PADEIRO', 'ATENDENTE', 'ESTOQUISTA'] as const).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PIN (4 a 6 dígitos)</label>
              <input className="input" inputMode="numeric" maxLength={6} value={pin}
                     onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn-primary">Cadastrar</button>
          </div>
        </form>
      </Modal>
    )
  }
}
