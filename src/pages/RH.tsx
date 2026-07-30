import { useState } from 'react'
import { useStore } from '@/store'
import { dataHoraBR, horaBR } from '@/lib/format'
import { Aviso, Badge, Card, PageHeader, Tabela, Vazio } from '@/components/ui'
import { Modal } from '@/pages/Estoque'
import type { Cargo, TipoPonto } from '@/types'

const rotuloPonto: Record<TipoPonto, string> = {
  ENTRADA: 'Entrada', PAUSA_INICIO: 'Início da pausa',
  PAUSA_FIM: 'Fim da pausa', SAIDA: 'Saída',
}

export default function RH() {
  const { colaboradores, registrosPonto, resolverInconsistencia, cadastrarColaborador } = useStore()
  const [abrirNovo, setAbrirNovo] = useState(false)
  const [ajustando, setAjustando] = useState<string | null>(null)

  const inconsistentes = registrosPonto.filter((r) => r.inconsistencia)
  const nome = (id: string) => colaboradores.find((c) => c.id === id)?.nome ?? '—'

  function statusAtual(colaboradorId: string) {
    const meus = registrosPonto
      .filter((r) => r.colaboradorId === colaboradorId && !r.inconsistencia)
      .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
    const ultimo = meus[0]
    if (!ultimo || ultimo.tipo === 'SAIDA') return { texto: 'Fora', tom: 'neutro' as const }
    if (ultimo.tipo === 'PAUSA_INICIO') return { texto: 'Em pausa', tom: 'alerta' as const }
    return { texto: 'Trabalhando', tom: 'ok' as const }
  }

  return (
    <>
      <PageHeader
        titulo="Equipe"
        subtitulo="Ponto registrado com a hora do servidor — o relógio do tablet é ignorado."
        acao={<button className="btn-primary" onClick={() => setAbrirNovo(true)}>Novo colaborador</button>}
      />

      {inconsistentes.length > 0 && (
        <div className="mb-6">
          <Aviso tom="erro">
            <strong>{inconsistentes.length} turno(s) em aberto há mais de 14 horas.</strong>{' '}
            O sistema encerrou automaticamente com a flag INCONSISTÊNCIA e aguarda o ajuste do gerente.
          </Aviso>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card titulo="Quem está na loja agora">
          <ul className="space-y-3">
            {colaboradores.map((c) => {
              const s = statusAtual(c.id)
              return (
                <li key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{c.nome}</p>
                    <p className="text-xs text-stone-500">{c.cargo.toLowerCase()}</p>
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
                <li key={r.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-stone-800">{nome(r.colaboradorId)}</p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Entrada em {dataHoraBR(r.registradoEm)} sem saída correspondente.
                  </p>
                  <button className="btn-danger mt-3 w-full py-2" onClick={() => setAjustando(r.id)}>
                    Informar horário de saída
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card titulo="Registros de ponto">
          {registrosPonto.length === 0 ? <Vazio mensagem="Sem registros." /> : (
            <Tabela cabecalho={['Colaborador', 'Tipo', 'Horário', 'Situação']}>
              {[...registrosPonto]
                .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
                .slice(0, 25)
                .map((r) => (
                  <tr key={r.id}>
                    <td className="td font-medium text-stone-800">{nome(r.colaboradorId)}</td>
                    <td className="td text-stone-600">{rotuloPonto[r.tipo]}</td>
                    <td className="td tabular-nums">{dataHoraBR(r.registradoEm)}</td>
                    <td className="td">
                      {r.inconsistencia ? <Badge tom="erro">Inconsistência</Badge> : <Badge tom="ok">OK</Badge>}
                    </td>
                  </tr>
                ))}
            </Tabela>
          )}
        </Card>
      </div>

      {ajustando && (
        <ModalAjuste
          registroId={ajustando}
          onFechar={() => setAjustando(null)}
          onConfirmar={(hora) => { resolverInconsistencia(ajustando, hora); setAjustando(null) }}
        />
      )}
      {abrirNovo && <ModalColaborador onFechar={() => setAbrirNovo(false)} />}
    </>
  )

  function ModalAjuste({ registroId, onFechar, onConfirmar }: {
    registroId: string; onFechar: () => void; onConfirmar: (hora: string) => void
  }) {
    const registro = registrosPonto.find((r) => r.id === registroId)
    const [hora, setHora] = useState('18:00')
    return (
      <Modal titulo="Ajustar registro de ponto" onFechar={onFechar}>
        <p className="text-sm text-stone-600">
          <strong>{registro ? nome(registro.colaboradorId) : ''}</strong> registrou entrada às{' '}
          {registro ? horaBR(registro.registradoEm) : ''} e não registrou saída. Informe o horário real
          de encerramento do turno.
        </p>
        <div className="mt-4">
          <label className="label">Horário de saída</label>
          <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-stone-500">
          O ajuste fica registrado com o seu usuário, para auditoria.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button className="btn-primary" onClick={() => onConfirmar(hora)}>Confirmar ajuste</button>
        </div>
      </Modal>
    )
  }

  function ModalColaborador({ onFechar }: { onFechar: () => void }) {
    const [nomeNovo, setNomeNovo] = useState('')
    const [cargo, setCargo] = useState<Cargo>('ATENDENTE')
    const [pin, setPin] = useState('')
    const [erro, setErro] = useState('')

    function salvar(e: React.FormEvent) {
      e.preventDefault()
      if (!nomeNovo.trim()) return setErro('Informe o nome.')
      if (!/^\d{4,6}$/.test(pin)) return setErro('O PIN deve ter de 4 a 6 dígitos.')
      if (colaboradores.some((c) => c.pin === pin)) return setErro('Este PIN já está em uso.')
      cadastrarColaborador({ nome: nomeNovo.trim(), cargo, pin })
      onFechar()
    }

    return (
      <Modal titulo="Novo colaborador" onFechar={onFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
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
