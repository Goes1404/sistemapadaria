import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { dataHoraBR } from '@/lib/format'
import { Badge, Card, PageHeader, Stat, Tabela, Vazio } from '@/components/ui'
import type { AcaoAuditada } from '@/types'

/** Ações que envolvem dinheiro ou alteram registro — as que uma investigação procura. */
const SENSIVEIS: AcaoAuditada[] = [
  'VENDA_CANCELADA', 'DESCONTO_CONCEDIDO', 'SANGRIA', 'LOTE_DESCARTADO', 'PONTO_AJUSTADO',
]

const rotulos: Record<AcaoAuditada, string> = {
  VENDA_FINALIZADA: 'Venda finalizada',
  VENDA_CANCELADA: 'Venda cancelada',
  DESCONTO_CONCEDIDO: 'Desconto concedido',
  SANGRIA: 'Sangria',
  SUPRIMENTO: 'Suprimento',
  CAIXA_ABERTO: 'Caixa aberto',
  CAIXA_FECHADO: 'Caixa fechado',
  LOTE_DESCARTADO: 'Lote descartado',
  ESTOQUE_ENTRADA: 'Entrada de estoque',
  PERDA_REGISTRADA: 'Perda registrada',
  PONTO_AJUSTADO: 'Ponto ajustado',
  FORNADA_REGISTRADA: 'Fornada registrada',
  PEDIDO_RESPONDIDO: 'Pedido respondido',
  NOTA_IMPORTADA: 'Nota importada',
  LOGIN: 'Acesso ao sistema',
}

export default function Auditoria() {
  const { eventosAuditoria } = useStore()
  const [filtroAtor, setFiltroAtor] = useState('')
  const [soSensiveis, setSoSensiveis] = useState(false)

  const atores = useMemo(
    () => [...new Set(eventosAuditoria.map((e) => e.ator))].sort(),
    [eventosAuditoria],
  )

  const visiveis = eventosAuditoria.filter(
    (e) =>
      (!filtroAtor || e.ator === filtroAtor) &&
      (!soSensiveis || SENSIVEIS.includes(e.acao)),
  )

  const sensiveis = eventosAuditoria.filter((e) => SENSIVEIS.includes(e.acao)).length
  const comAlcada = eventosAuditoria.filter((e) => e.autorizadoPor).length

  return (
    <>
      <PageHeader
        titulo="Auditoria"
        subtitulo="Quem fez o quê, quando e com autorização de quem."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat rotulo="Eventos registrados" valor={String(eventosAuditoria.length)}
              numero={eventosAuditoria.length} formatar={(n) => String(Math.round(n))}
              detalhe="tudo que altera dinheiro ou registro" />
        <Stat rotulo="Ações sensíveis" valor={String(sensiveis)}
              numero={sensiveis} formatar={(n) => String(Math.round(n))}
              detalhe="cancelamento, desconto, sangria, ajuste"
              tom={sensiveis > 0 ? 'alerta' : 'ok'} />
        <Stat rotulo="Com autorização de alçada" valor={String(comAlcada)}
              numero={comAlcada} formatar={(n) => String(Math.round(n))}
              detalhe="liberadas por supervisor" tom="ok" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input w-auto py-2 text-sm" value={filtroAtor}
                onChange={(e) => setFiltroAtor(e.target.value)}>
          <option value="">Todos os usuários</option>
          {atores.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-mata-900/70">
          <input type="checkbox" checked={soSensiveis} onChange={(e) => setSoSensiveis(e.target.checked)}
                 className="h-4 w-4 accent-bela-600" />
          Só ações sensíveis
        </label>
        {(filtroAtor || soSensiveis) && (
          <button onClick={() => { setFiltroAtor(''); setSoSensiveis(false) }}
                  className="text-xs font-semibold text-bela-700 hover:underline">Limpar filtros</button>
        )}
        <span className="ml-auto text-xs text-mata-900/45">{visiveis.length} eventos</span>
      </div>

      <Card>
        {visiveis.length === 0 ? <Vazio mensagem="Nenhum evento com esses filtros." /> : (
          <Tabela cabecalho={['Quando', 'Usuário', 'Ação', 'Detalhe', 'Autorizado por', 'Origem']}>
            {visiveis.map((e) => (
              <tr key={e.id}>
                <td className="td whitespace-nowrap text-xs text-mata-900/50">{dataHoraBR(e.quando)}</td>
                <td className="td font-medium text-mata-800">{e.ator}</td>
                <td className="td">
                  <Badge tom={SENSIVEIS.includes(e.acao) ? 'alerta' : 'neutro'}>{rotulos[e.acao]}</Badge>
                </td>
                <td className="td text-mata-900/70">{e.detalhe}</td>
                <td className="td">
                  {e.autorizadoPor
                    ? <span className="text-xs font-semibold text-bela-700">{e.autorizadoPor}</span>
                    : <span className="text-xs text-mata-900/30">—</span>}
                </td>
                <td className="td text-xs text-mata-900/50">{e.terminal}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Card>

      <div className="mt-6">
        <Card titulo="Por que isso existe">
          <div className="space-y-3 text-sm text-mata-900/70">
            <p>
              Sem trilha de auditoria, qualquer investigação de furto interno morre na primeira
              pergunta: <em>&ldquo;quem cancelou essa venda?&rdquo;</em>
            </p>
            <p>
              O registro é gravado no mesmo momento da ação, junto com quem autorizou quando houve
              alçada. Sangria e desconto acima de 10% exigem PIN de gerente — e os dois nomes ficam
              guardados, o de quem pediu e o de quem liberou.
            </p>
            <p>
              Este módulo é barato quando nasce com o sistema e caro quando é enxertado depois:
              enxertar exige tocar todos os pontos de escrita, e você nunca tem certeza de que pegou
              todos.
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
