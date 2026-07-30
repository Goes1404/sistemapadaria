import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import * as seed from '@/data/seed'
import { selecionarFefo } from '@/lib/fefo'
import { uid } from '@/lib/format'
import type {
  Caixa,
  Colaborador,
  FichaTecnica,
  Fornada,
  Insumo,
  Lote,
  MovimentoCaixa,
  MovimentoEstoque,
  PedidoWhatsapp,
  Produto,
  RegistroPonto,
  StatusPedido,
  TipoPonto,
  Venda,
} from '@/types'

interface ResultadoFornada {
  ok: boolean
  mensagem: string
  detalhe?: { insumo: string; lote: string; quantidade: number; validade: string }[]
}

interface Estado {
  insumos: Insumo[]
  lotes: Lote[]
  movimentosEstoque: MovimentoEstoque[]
  produtos: Produto[]
  fichas: FichaTecnica[]
  fornadas: Fornada[]
  colaboradores: Colaborador[]
  registrosPonto: RegistroPonto[]
  vendas: Venda[]
  caixa: Caixa
  movimentosCaixa: MovimentoCaixa[]
  pedidos: PedidoWhatsapp[]
  usuario: string | null

  entrar: (nome: string) => void
  sair: () => void
  cadastrarInsumo: (dados: Omit<Insumo, 'id'>) => void
  cadastrarLote: (dados: Omit<Lote, 'id' | 'status' | 'quantidadeAtual'>) => void
  descartarLote: (loteId: string) => void
  registrarFornada: (fichaId: string, quantidade: number, responsavel: string) => ResultadoFornada
  baterPonto: (pin: string) => { ok: boolean; mensagem: string; colaborador?: Colaborador }
  resolverInconsistencia: (registroId: string, novaHora: string) => void
  cadastrarColaborador: (dados: Omit<Colaborador, 'id' | 'ativo'>) => void
  finalizarVenda: (venda: Omit<Venda, 'id' | 'criadaEm' | 'origem'>) => void
  abrirCaixa: (operador: string, troco: number) => void
  fecharCaixa: () => void
  movimentarCaixa: (mov: Omit<MovimentoCaixa, 'id' | 'criadoEm'>) => void
  responderPedido: (id: string, status: StatusPedido) => void
}

const Ctx = createContext<Estado | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<Insumo[]>(seed.insumos)
  const [lotes, setLotes] = useState<Lote[]>(seed.lotes)
  const [movimentosEstoque, setMovEstoque] = useState<MovimentoEstoque[]>(seed.movimentosEstoque)
  const [produtos] = useState<Produto[]>(seed.produtos)
  const [fichas] = useState<FichaTecnica[]>(seed.fichas)
  const [fornadas, setFornadas] = useState<Fornada[]>(seed.fornadasIniciais as Fornada[])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(seed.colaboradores)
  const [registrosPonto, setRegistros] = useState<RegistroPonto[]>(seed.registrosPonto)
  const [vendas, setVendas] = useState<Venda[]>(seed.vendas)
  const [caixa, setCaixa] = useState<Caixa>(seed.caixaInicial)
  const [movimentosCaixa, setMovCaixa] = useState<MovimentoCaixa[]>(seed.movimentosCaixa)
  const [pedidos, setPedidos] = useState<PedidoWhatsapp[]>(seed.pedidosWhatsapp)
  const [usuario, setUsuario] = useState<string | null>(null)

  const valor = useMemo<Estado>(() => ({
    insumos, lotes, movimentosEstoque, produtos, fichas, fornadas,
    colaboradores, registrosPonto, vendas, caixa, movimentosCaixa, pedidos, usuario,

    entrar: (nome) => setUsuario(nome),
    sair: () => setUsuario(null),

    cadastrarInsumo: (dados) =>
      setInsumos((atual) => [...atual, { ...dados, id: uid() }]),

    cadastrarLote: (dados) => {
      const lote: Lote = { ...dados, id: uid(), quantidadeAtual: dados.quantidadeInicial, status: 'ATIVO' }
      setLotes((atual) => [...atual, lote])
      setMovEstoque((atual) => [
        { id: uid(), loteId: lote.id, insumoId: lote.insumoId, quantidade: lote.quantidadeInicial,
          motivo: 'ENTRADA', referencia: `Lote ${lote.codigo}`, criadoEm: new Date().toISOString() },
        ...atual,
      ])
    },

    descartarLote: (loteId) => {
      const lote = lotes.find((l) => l.id === loteId)
      if (!lote || lote.quantidadeAtual <= 0) return
      setLotes((atual) =>
        atual.map((l) => (l.id === loteId ? { ...l, quantidadeAtual: 0, status: 'ESGOTADO' as const } : l)))
      setMovEstoque((atual) => [
        { id: uid(), loteId, insumoId: lote.insumoId, quantidade: -lote.quantidadeAtual,
          motivo: 'DESCARTE', referencia: `Descarte do lote ${lote.codigo}`, criadoEm: new Date().toISOString() },
        ...atual,
      ])
    },

    /**
     * Espelha a transação do backend: calcula o consumo de todos os insumos da
     * ficha via FEFO e só aplica se TODOS forem atendidos. Falta de um insumo
     * aborta a fornada inteira, sem baixa parcial.
     */
    registrarFornada: (fichaId, quantidade, responsavel) => {
      const ficha = fichas.find((f) => f.id === fichaId)
      if (!ficha) return { ok: false, mensagem: 'Ficha técnica não encontrada.' }

      const fator = quantidade / ficha.rendimento
      let trabalho = [...lotes]
      const consumos: { loteId: string; insumoId: string; quantidade: number }[] = []
      const detalhe: ResultadoFornada['detalhe'] = []

      for (const item of ficha.itens) {
        const necessario = item.quantidade * fator
        const r = selecionarFefo(trabalho, item.insumoId, necessario)
        const insumo = insumos.find((i) => i.id === item.insumoId)
        if (!r.ok) {
          return {
            ok: false,
            mensagem: `Estoque insuficiente de ${insumo?.nome ?? 'insumo'}: faltam ${r.faltando.toFixed(2)} ${insumo?.unidade ?? ''}. Nenhuma baixa foi feita.`,
          }
        }
        for (const c of r.consumos) {
          trabalho = trabalho.map((l) =>
            l.id === c.loteId
              ? {
                  ...l,
                  quantidadeAtual: l.quantidadeAtual - c.quantidade,
                  status: l.quantidadeAtual - c.quantidade <= 0.0000001 ? ('ESGOTADO' as const) : l.status,
                }
              : l)
          consumos.push({ loteId: c.loteId, insumoId: c.insumoId, quantidade: c.quantidade })
          detalhe.push({
            insumo: insumo?.nome ?? '—',
            lote: c.codigo,
            quantidade: c.quantidade,
            validade: c.dataValidade,
          })
        }
      }

      const fornada: Fornada = {
        id: uid(), fichaTecnicaId: fichaId, quantidadeProduzida: quantidade,
        responsavel, produzidaEm: new Date().toISOString(), consumos,
      }
      setLotes(trabalho)
      setFornadas((atual) => [fornada, ...atual])
      setMovEstoque((atual) => [
        ...consumos.map((c) => ({
          id: uid(), loteId: c.loteId, insumoId: c.insumoId, quantidade: -c.quantidade,
          motivo: 'PRODUCAO' as const, referencia: `Fornada ${ficha.nome}`, criadoEm: new Date().toISOString(),
        })),
        ...atual,
      ])
      return { ok: true, mensagem: `Fornada registrada: ${quantidade} un de ${ficha.nome}.`, detalhe }
    },

    /** Máquina de estados do ponto: bloqueia dupla entrada e saída sem entrada. */
    baterPonto: (pin) => {
      const colaborador = colaboradores.find((c) => c.pin === pin && c.ativo)
      if (!colaborador) return { ok: false, mensagem: 'PIN não reconhecido.' }

      const meus = registrosPonto
        .filter((r) => r.colaboradorId === colaborador.id && !r.inconsistencia)
        .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
      const ultimo = meus[0]

      let proximo: TipoPonto
      if (!ultimo || ultimo.tipo === 'SAIDA') proximo = 'ENTRADA'
      else if (ultimo.tipo === 'ENTRADA') proximo = 'PAUSA_INICIO'
      else if (ultimo.tipo === 'PAUSA_INICIO') proximo = 'PAUSA_FIM'
      else proximo = 'SAIDA'

      const registro: RegistroPonto = {
        id: uid(),
        colaboradorId: colaborador.id,
        tipo: proximo,
        registradoEm: new Date().toISOString(), // no backend: NOW() do servidor
      }
      setRegistros((atual) => [registro, ...atual])
      const rotulo: Record<TipoPonto, string> = {
        ENTRADA: 'Entrada', PAUSA_INICIO: 'Início da pausa',
        PAUSA_FIM: 'Fim da pausa', SAIDA: 'Saída',
      }
      return { ok: true, mensagem: `${rotulo[proximo]} registrada`, colaborador }
    },

    resolverInconsistencia: (registroId, novaHora) =>
      setRegistros((atual) =>
        atual.map((r) => {
          if (r.id !== registroId) return r
          const base = new Date(r.registradoEm)
          const [h, m] = novaHora.split(':').map(Number)
          base.setHours(h, m, 0, 0)
          return { ...r, tipo: 'SAIDA' as const, registradoEm: base.toISOString(), inconsistencia: false }
        })),

    cadastrarColaborador: (dados) =>
      setColaboradores((atual) => [...atual, { ...dados, id: uid(), ativo: true }]),

    finalizarVenda: (venda) =>
      setVendas((atual) => [
        { ...venda, id: uid(), criadaEm: new Date().toISOString(), origem: 'PDV' },
        ...atual,
      ]),

    abrirCaixa: (operador, troco) =>
      setCaixa({ aberto: true, operador, trocoInicial: troco, abertoEm: new Date().toISOString() }),

    fecharCaixa: () => setCaixa((c) => ({ ...c, aberto: false })),

    movimentarCaixa: (mov) =>
      setMovCaixa((atual) => [{ ...mov, id: uid(), criadoEm: new Date().toISOString() }, ...atual]),

    responderPedido: (id, status) =>
      setPedidos((atual) => atual.map((p) => (p.id === id ? { ...p, status } : p))),
  }), [insumos, lotes, movimentosEstoque, produtos, fichas, fornadas, colaboradores,
       registrosPonto, vendas, caixa, movimentosCaixa, pedidos, usuario])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useStore(): Estado {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
