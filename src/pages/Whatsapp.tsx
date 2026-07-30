import { useState } from 'react'
import { useStore } from '@/store'
import { brl, horaBR } from '@/lib/format'
import { Badge, Card, PageHeader, Vazio } from '@/components/ui'
import type { StatusPedido } from '@/types'

const rotuloStatus: Record<StatusPedido, { texto: string; tom: 'ok' | 'alerta' | 'erro' | 'neutro' }> = {
  PENDING_CONFIRMATION: { texto: 'Aguardando aceite', tom: 'alerta' },
  CONFIRMED: { texto: 'Confirmado', tom: 'ok' },
  REJECTED: { texto: 'Recusado', tom: 'erro' },
  ABORTED: { texto: 'Abandonado', tom: 'neutro' },
}

export default function Whatsapp() {
  const { pedidos, responderPedido } = useStore()
  const [aba, setAba] = useState<'painel' | 'conversa'>('painel')

  const pendentes = pedidos.filter((p) => p.status === 'PENDING_CONFIRMATION')
  const resto = pedidos.filter((p) => p.status !== 'PENDING_CONFIRMATION')

  return (
    <>
      <PageHeader
        titulo="Encomendas do WhatsApp"
        subtitulo="Os pedidos caem aqui. Ninguém precisa ficar com o celular na mão."
      />

      <nav className="mb-5 flex gap-1 rounded-lg bg-stone-200/70 p-1">
        {([['painel', 'Painel de pedidos'], ['conversa', 'Como o cliente vê']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              aba === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'painel' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo={`Aguardando aceite (${pendentes.length})`}>
            {pendentes.length === 0 ? <Vazio mensagem="Nenhum pedido pendente." /> : (
              <ul className="space-y-4">
                {pendentes.map((p) => (
                  <li key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-900">{p.cliente}</p>
                        <p className="text-xs text-stone-500">{p.telefone} · recebido {horaBR(p.recebidoEm)}</p>
                      </div>
                      <span className="text-lg font-bold tabular-nums text-stone-900">{brl(p.total)}</span>
                    </div>
                    <ul className="mt-3 space-y-1 border-t border-amber-200 pt-3 text-sm">
                      {p.itens.map((i, idx) => (
                        <li key={idx} className="flex justify-between text-stone-700">
                          <span>{i.quantidade}× {i.nome}</span>
                          <span className="tabular-nums text-stone-500">{brl(i.quantidade * i.precoUnitario)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-stone-600">Retirada às <strong>{p.retirarEm}</strong></p>
                    <div className="mt-4 flex gap-2">
                      <button className="btn-ghost flex-1 py-2" onClick={() => responderPedido(p.id, 'REJECTED')}>
                        Recusar
                      </button>
                      <button className="btn-success flex-[2] py-2" onClick={() => responderPedido(p.id, 'CONFIRMED')}>
                        Aceitar e avisar cliente
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Histórico">
            {resto.length === 0 ? <Vazio mensagem="Sem histórico." /> : (
              <ul className="space-y-3">
                {resto.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">{p.cliente}</p>
                      <p className="text-xs text-stone-500">
                        {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} · {horaBR(p.recebidoEm)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-stone-700">{brl(p.total)}</span>
                      <Badge tom={rotuloStatus[p.status].tom}>{rotuloStatus[p.status].texto}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              Carrinho parado por mais de 15 minutos vira <strong>Abandonado</strong> automaticamente
              e a sessão do cliente é reiniciada.
            </p>
          </Card>
        </div>
      ) : (
        <Conversa />
      )}
    </>
  )
}

/** Simulação do fluxo de menus fechado, para o cliente entender a experiência. */
function Conversa() {
  const mensagens = [
    { de: 'cliente', texto: 'Olá' },
    {
      de: 'bot',
      texto:
        'Olá! Aqui é a *Pão & Cia* 🥖\nEstamos abertos até as 19h.\n\nDigite o número da opção:\n\n*1* — Cardápio\n*2* — Fazer encomenda\n*3* — Horário e endereço',
    },
    { de: 'cliente', texto: '2' },
    {
      de: 'bot',
      texto: 'Perfeito! Escolha o produto:\n\n*1* — Baguete artesanal — R$ 14,00\n*2* — Pão de queijo — R$ 3,50\n*3* — Bolo de cenoura (fatia) — R$ 8,00\n*0* — Voltar',
    },
    { de: 'cliente', texto: '1' },
    { de: 'bot', texto: 'Quantas unidades de *Baguete artesanal*?' },
    { de: 'cliente', texto: '4' },
    {
      de: 'bot',
      texto: '4× Baguete artesanal = *R$ 56,00*\n\n*1* — Adicionar mais itens\n*2* — Finalizar encomenda',
    },
    { de: 'cliente', texto: '2' },
    { de: 'bot', texto: 'Qual horário deseja retirar? (ex: 17:30)' },
    { de: 'cliente', texto: '17:30' },
    {
      de: 'bot',
      texto: 'Recebemos sua encomenda! ⏳\n\nEla está *aguardando confirmação* da nossa equipe. Assim que for aceita, você recebe o aviso por aqui.',
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-[#0b141a] p-3 shadow-lg">
        <div className="mb-3 flex items-center gap-2.5 px-1 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-crosta-600 text-sm">🥖</span>
          <div>
            <p className="text-sm font-semibold text-white">Pão &amp; Cia</p>
            <p className="text-[11px] text-emerald-400">online</p>
          </div>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto px-1">
          {mensagens.map((m, i) => (
            <div key={i} className={`flex ${m.de === 'cliente' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-[13px] leading-snug ${
                m.de === 'cliente' ? 'bg-[#005c4b] text-white' : 'bg-[#202c33] text-stone-100'}`}>
                {m.texto}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Card titulo="Regras do bot">
          <ul className="space-y-3 text-sm text-stone-600">
            <li>
              <strong className="text-stone-800">Menu fechado.</strong> O cliente navega por números.
              Nada de texto livre — reduz erro e não exige IA.
            </li>
            <li>
              <strong className="text-stone-800">Validação de horário.</strong> Fora do expediente,
              o bot informa o horário de funcionamento e não abre o fluxo de encomenda.
            </li>
            <li>
              <strong className="text-stone-800">Timeout de 15 minutos.</strong> Carrinho parado é
              marcado como <code className="rounded bg-stone-100 px-1 text-xs">ABORTED</code> e a sessão reinicia.
            </li>
            <li>
              <strong className="text-stone-800">Confirmação assíncrona.</strong> O pedido nasce como{' '}
              <code className="rounded bg-stone-100 px-1 text-xs">PENDING_CONFIRMATION</code>. O cliente só
              recebe a confirmação depois que alguém aceita no painel — a padaria nunca se compromete
              com um pedido que não consegue atender.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
