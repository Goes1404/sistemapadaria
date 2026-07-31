import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import * as seed from '@/data/seed'
import { selecionarFefo } from '@/lib/fefo'
import { uid } from '@/lib/format'
import { emitirDocumento, transmitirContingencia } from '@/lib/fiscal'
import { calcularHashMarcacao, proximoTipo } from '@/lib/ponto'
import { custoDoProduto } from '@/lib/custos'
import type {
  AjustePonto,
  Caixa,
  Cliente,
  Colaborador,
  CustoOperacional,
  DeParaProduto,
  DocumentoFiscal,
  EventoAuditoria,
  FichaTecnica,
  Fornada,
  Insumo,
  Lote,
  MotivoPerda,
  MovimentoCaixa,
  MovimentoEstoque,
  MovimentoFidelidade,
  PedidoCozinha,
  PedidoWhatsapp,
  PerdaBalcao,
  Produto,
  RegistroPonto,
  StatusPedido,
  StatusPreparo,
  TipoPonto,
  Venda,
} from '@/types'

interface ResultadoFornada {
  ok: boolean
  mensagem: string
  detalhe?: { insumo: string; lote: string; quantidade: number; validade: string }[]
}

interface ResultadoPonto {
  ok: boolean
  mensagem: string
  colaborador?: Colaborador
  /** Comprovante que o trabalhador tem direito de receber a cada marcação. */
  comprovante?: { nsr: number; hash: string; registradoEm: string; tipo: TipoPonto }
}

/** Pontos de fidelidade por real gasto. */
export const PONTOS_POR_REAL = 1

interface Estado {
  insumos: Insumo[]
  lotes: Lote[]
  movimentosEstoque: MovimentoEstoque[]
  produtos: Produto[]
  fichas: FichaTecnica[]
  fornadas: Fornada[]
  colaboradores: Colaborador[]
  registrosPonto: RegistroPonto[]
  ajustesPonto: AjustePonto[]
  vendas: Venda[]
  /** Vendas de hoje mais o histórico gerado — base do BI. */
  todasVendas: Venda[]
  caixa: Caixa
  movimentosCaixa: MovimentoCaixa[]
  pedidos: PedidoWhatsapp[]
  clientes: Cliente[]
  movimentosFidelidade: MovimentoFidelidade[]
  perdasBalcao: PerdaBalcao[]
  documentosFiscais: DocumentoFiscal[]
  pedidosCozinha: PedidoCozinha[]
  eventosAuditoria: EventoAuditoria[]
  dePara: DeParaProduto[]
  custosOperacionais: CustoOperacional[]
  usuario: string | null
  /** Estado simulado da SEFAZ, para demonstrar contingência. */
  sefazDisponivel: boolean

  entrar: (nome: string) => void
  sair: () => void
  auditar: (evento: Omit<EventoAuditoria, 'id' | 'quando'>) => void

  cadastrarInsumo: (dados: Omit<Insumo, 'id'>) => void
  cadastrarLote: (dados: Omit<Lote, 'id' | 'status' | 'quantidadeAtual'>) => void
  cadastrarLotes: (lotes: Omit<Lote, 'id' | 'status' | 'quantidadeAtual'>[], referencia: string) => void
  descartarLote: (loteId: string) => void
  registrarDePara: (mapa: DeParaProduto) => void

  registrarFornada: (fichaId: string, quantidade: number, responsavel: string) => ResultadoFornada
  cadastrarFicha: (dados: Omit<FichaTecnica, 'id'>) => void
  registrarPerda: (dados: { produtoId: string; quantidade: number; motivo: MotivoPerda; observacao?: string }) => void
  custoUnitario: (produtoId: string) => number

  baterPonto: (pin: string) => ResultadoPonto
  ajustarPonto: (ajuste: Omit<AjustePonto, 'id' | 'ajustadoEm' | 'ajustadoPor'>) => void
  cadastrarColaborador: (dados: Omit<Colaborador, 'id' | 'ativo'>) => void

  finalizarVenda: (venda: {
    itens: Venda['itens']
    pagamentos: Venda['pagamentos']
    total: number
    desconto?: number
    clienteId?: string
    autorizadoPor?: string
  }) => { venda: Venda; documento: DocumentoFiscal; aviso?: string }
  abrirCaixa: (operador: string, troco: number) => void
  fecharCaixa: (contado: number, diferenca: number) => void
  movimentarCaixa: (mov: Omit<MovimentoCaixa, 'id' | 'criadoEm'>, autorizadoPor?: string) => void
  alternarSefaz: () => void

  cadastrarCliente: (dados: Omit<Cliente, 'id' | 'criadoEm'>) => Cliente
  saldoPontos: (clienteId: string) => number
  resgatarPontos: (clienteId: string, pontos: number) => { ok: boolean; erro?: string }

  responderPedido: (id: string, status: StatusPedido) => void
  atualizarPreparo: (pedidoId: string, status: StatusPreparo) => void
}

const Ctx = createContext<Estado | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<Insumo[]>(seed.insumos)
  const [lotes, setLotes] = useState<Lote[]>(seed.lotes)
  const [movimentosEstoque, setMovEstoque] = useState<MovimentoEstoque[]>(seed.movimentosEstoque)
  const [produtos] = useState<Produto[]>(seed.produtos)
  const [fichas, setFichas] = useState<FichaTecnica[]>(seed.fichas)
  const [fornadas, setFornadas] = useState<Fornada[]>(seed.fornadasIniciais as Fornada[])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(seed.colaboradores)
  const [registrosPonto, setRegistros] = useState<RegistroPonto[]>(seed.registrosPonto)
  const [ajustesPonto, setAjustes] = useState<AjustePonto[]>([])
  const [vendas, setVendas] = useState<Venda[]>(seed.vendas)
  const [caixa, setCaixa] = useState<Caixa>(seed.caixaInicial)
  const [movimentosCaixa, setMovCaixa] = useState<MovimentoCaixa[]>(seed.movimentosCaixa)
  const [pedidos, setPedidos] = useState<PedidoWhatsapp[]>(seed.pedidosWhatsapp)
  const [clientes, setClientes] = useState<Cliente[]>(seed.clientes)
  const [movimentosFidelidade, setMovFidelidade] = useState<MovimentoFidelidade[]>(seed.movimentosFidelidade)
  const [perdasBalcao, setPerdas] = useState<PerdaBalcao[]>(seed.perdasBalcao)
  const [documentosFiscais, setDocumentos] = useState<DocumentoFiscal[]>([])
  const [pedidosCozinha, setPedidosCozinha] = useState<PedidoCozinha[]>(seed.pedidosCozinha)
  const [eventosAuditoria, setEventos] = useState<EventoAuditoria[]>(seed.eventosAuditoria)
  const [dePara, setDePara] = useState<DeParaProduto[]>(seed.deParaInicial)
  const [usuario, setUsuario] = useState<string | null>(null)
  const [sefazDisponivel, setSefaz] = useState(true)
  const [proximoNumeroNfce, setProximoNumero] = useState(4712)
  const [proximaSenha, setProximaSenha] = useState(44)

  const nomeInsumo = (id: string) => insumos.find((i) => i.id === id)?.nome ?? '—'

  function registrarEvento(evento: Omit<EventoAuditoria, 'id' | 'quando'>) {
    setEventos((atual) => [{ ...evento, id: uid(), quando: new Date().toISOString() }, ...atual])
  }

  const valor = useMemo<Estado>(() => {
    const custoUnitario = (produtoId: string) => {
      const produto = produtos.find((p) => p.id === produtoId)
      if (!produto) return 0
      return custoDoProduto(produto, fichas, lotes, nomeInsumo).custoUnitario
    }

    return {
      insumos, lotes, movimentosEstoque, produtos, fichas, fornadas,
      colaboradores, registrosPonto, ajustesPonto, vendas,
      todasVendas: [...vendas, ...seed.historicoVendas],
      caixa, movimentosCaixa, pedidos, clientes, movimentosFidelidade,
      perdasBalcao, documentosFiscais, pedidosCozinha, eventosAuditoria,
      dePara, custosOperacionais: seed.custosOperacionais, usuario, sefazDisponivel,

      entrar: (nome) => {
        setUsuario(nome)
        registrarEvento({ ator: nome, acao: 'LOGIN', entidade: 'Sessão', detalhe: 'Acesso ao backoffice', terminal: 'BACKOFFICE' })
      },
      sair: () => setUsuario(null),
      auditar: registrarEvento,

      cadastrarInsumo: (dados) => setInsumos((atual) => [...atual, { ...dados, id: uid() }]),

      cadastrarLote: (dados) => {
        const lote: Lote = { ...dados, id: uid(), quantidadeAtual: dados.quantidadeInicial, status: 'ATIVO' }
        setLotes((atual) => [...atual, lote])
        setMovEstoque((atual) => [
          { id: uid(), loteId: lote.id, insumoId: lote.insumoId, quantidade: lote.quantidadeInicial,
            motivo: 'ENTRADA', referencia: `Lote ${lote.codigo}`, criadoEm: new Date().toISOString() },
          ...atual,
        ])
        registrarEvento({
          ator: usuario ?? 'Sistema', acao: 'ESTOQUE_ENTRADA', entidade: 'Lote',
          detalhe: `${nomeInsumo(lote.insumoId)} — lote ${lote.codigo}, ${lote.quantidadeInicial}`,
          terminal: 'BACKOFFICE',
        })
      },

      /** Entrada em bloco, usada pela importação do XML da nota do fornecedor. */
      cadastrarLotes: (novos, referencia) => {
        const criados: Lote[] = novos.map((d) => ({
          ...d, id: uid(), quantidadeAtual: d.quantidadeInicial, status: 'ATIVO' as const,
        }))
        setLotes((atual) => [...atual, ...criados])
        setMovEstoque((atual) => [
          ...criados.map((l) => ({
            id: uid(), loteId: l.id, insumoId: l.insumoId, quantidade: l.quantidadeInicial,
            motivo: 'ENTRADA' as const, referencia, criadoEm: new Date().toISOString(),
          })),
          ...atual,
        ])
        registrarEvento({
          ator: usuario ?? 'Sistema', acao: 'NOTA_IMPORTADA', entidade: 'NotaFornecedor',
          detalhe: `${referencia} — ${criados.length} lotes criados`, terminal: 'BACKOFFICE',
        })
      },

      registrarDePara: (mapa) =>
        setDePara((atual) => [...atual.filter((d) => d.codigoFornecedor !== mapa.codigoFornecedor), mapa]),

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
        registrarEvento({
          ator: usuario ?? 'Sistema', acao: 'LOTE_DESCARTADO', entidade: 'Lote',
          detalhe: `${nomeInsumo(lote.insumoId)} — lote ${lote.codigo}, ${lote.quantidadeAtual} descartados`,
          terminal: 'BACKOFFICE',
        })
      },

      /**
       * Espelha a transação do backend: calcula o consumo de todos os insumos da
       * ficha via FEFO e só aplica se TODOS forem atendidos.
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
            detalhe.push({ insumo: insumo?.nome ?? '—', lote: c.codigo, quantidade: c.quantidade, validade: c.dataValidade })
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
        registrarEvento({
          ator: responsavel, acao: 'FORNADA_REGISTRADA', entidade: 'Fornada',
          detalhe: `${quantidade} un de ${ficha.nome}`, terminal: 'BACKOFFICE',
        })
        return { ok: true, mensagem: `Fornada registrada: ${quantidade} un de ${ficha.nome}.`, detalhe }
      },

      cadastrarFicha: (dados) => setFichas((atual) => [...atual, { ...dados, id: uid() }]),

      registrarPerda: ({ produtoId, quantidade, motivo, observacao }) => {
        const produto = produtos.find((p) => p.id === produtoId)
        const perda: PerdaBalcao = {
          id: uid(), produtoId, quantidade, motivo,
          custoEstimado: quantidade * custoUnitario(produtoId),
          registradoPor: usuario ?? 'Operador',
          registradoEm: new Date().toISOString(),
          observacao,
        }
        setPerdas((atual) => [perda, ...atual])
        registrarEvento({
          ator: perda.registradoPor, acao: 'PERDA_REGISTRADA', entidade: 'PerdaBalcao',
          detalhe: `${quantidade} de ${produto?.nome ?? '—'} — ${motivo.toLowerCase().replace(/_/g, ' ')}`,
          terminal: 'BACKOFFICE',
        })
      },

      custoUnitario,

      /**
       * Marcação de ponto.
       *
       * A marcação é imutável e entra na cadeia de hash. O comprovante devolvido
       * é o que o trabalhador tem direito de receber a cada registro.
       */
      baterPonto: (pin) => {
        const colaborador = colaboradores.find((c) => c.pin === pin && c.ativo)
        if (!colaborador) return { ok: false, mensagem: 'PIN não reconhecido.' }

        const meus = registrosPonto
          .filter((r) => r.colaboradorId === colaborador.id && !r.inconsistencia)
          .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))

        const tipo = proximoTipo(meus[0])
        const ultimoNsr = registrosPonto.reduce((m, r) => Math.max(m, r.nsr), 0)
        const hashAnterior =
          registrosPonto.find((r) => r.nsr === ultimoNsr)?.hash ?? '00000000'
        const nsr = ultimoNsr + 1
        const registradoEm = new Date().toISOString() // no backend: NOW() do servidor
        const hash = calcularHashMarcacao(nsr, colaborador.id, tipo, registradoEm, hashAnterior)

        setRegistros((atual) => [
          { id: uid(), colaboradorId: colaborador.id, tipo, registradoEm, nsr, hash, hashAnterior },
          ...atual,
        ])

        const rotulo: Record<TipoPonto, string> = {
          ENTRADA: 'Entrada', PAUSA_INICIO: 'Início do intervalo',
          PAUSA_FIM: 'Fim do intervalo', SAIDA: 'Saída',
        }
        return {
          ok: true,
          mensagem: `${rotulo[tipo]} registrada`,
          colaborador,
          comprovante: { nsr, hash, registradoEm, tipo },
        }
      },

      /** Ajuste NUNCA sobrescreve: registra um evento que aponta para o original. */
      ajustarPonto: (dados) => {
        const ajuste: AjustePonto = {
          ...dados, id: uid(),
          ajustadoPor: usuario ?? 'Gerente',
          ajustadoEm: new Date().toISOString(),
        }
        setAjustes((atual) => [ajuste, ...atual])
        // O original permanece; só some da lista de pendências.
        setRegistros((atual) =>
          atual.map((r) => (r.id === dados.marcacaoOriginalId ? { ...r, inconsistencia: false } : r)))
        registrarEvento({
          ator: ajuste.ajustadoPor, acao: 'PONTO_AJUSTADO', entidade: 'RegistroPonto',
          detalhe: `${ajuste.tipo.toLowerCase()} — ${ajuste.justificativa}`, terminal: 'BACKOFFICE',
        })
      },

      cadastrarColaborador: (dados) =>
        setColaboradores((atual) => [...atual, { ...dados, id: uid(), ativo: true }]),

      /**
       * Fecha a venda: grava, emite o documento fiscal, acumula fidelidade e
       * manda para a cozinha o que precisa de preparo.
       */
      finalizarVenda: ({ itens, pagamentos, total, desconto, clienteId, autorizadoPor }) => {
        const numero = proximoNumeroNfce
        const { documento, aviso } = emitirDocumento(uid(), itens, total, numero, { disponivel: sefazDisponivel })
        setProximoNumero(numero + 1)

        const venda: Venda = {
          id: uid(), itens, pagamentos, total, desconto, clienteId,
          criadaEm: new Date().toISOString(), origem: 'PDV',
          documentoFiscalId: documento.id,
        }

        setVendas((atual) => [venda, ...atual])
        setDocumentos((atual) => [{ ...documento, vendaId: venda.id }, ...atual])

        if (clienteId) {
          const pontos = Math.floor(total * PONTOS_POR_REAL)
          setMovFidelidade((atual) => [
            { id: uid(), clienteId, tipo: 'ACUMULO', pontos, vendaId: venda.id, criadoEm: new Date().toISOString() },
            ...atual,
          ])
        }

        // Itens que exigem preparo entram na fila da cozinha.
        const paraCozinha = itens.filter((i) =>
          ['p6', 'p7', 'p8', 'p11'].includes(i.produtoId))
        if (paraCozinha.length > 0) {
          const senha = String(proximaSenha).padStart(3, '0')
          setProximaSenha(proximaSenha + 1)
          setPedidosCozinha((atual) => [
            {
              id: uid(), senha, origem: 'PDV', status: 'AGUARDANDO',
              recebidoEm: new Date().toISOString(),
              itens: paraCozinha.map((i) => ({ nome: i.nome, quantidade: i.quantidade })),
            },
            ...atual,
          ])
        }

        registrarEvento({
          ator: caixa.operador, acao: 'VENDA_FINALIZADA', entidade: 'Venda',
          detalhe: `${itens.length} itens — R$ ${total.toFixed(2)}${desconto ? ` (desconto R$ ${desconto.toFixed(2)})` : ''}`,
          autorizadoPor, terminal: 'PDV',
        })
        if (desconto && desconto > 0) {
          registrarEvento({
            ator: caixa.operador, acao: 'DESCONTO_CONCEDIDO', entidade: 'Venda',
            detalhe: `R$ ${desconto.toFixed(2)} sobre R$ ${(total + desconto).toFixed(2)}`,
            autorizadoPor, terminal: 'PDV',
          })
        }

        return { venda, documento, aviso }
      },

      abrirCaixa: (operador, troco) => {
        setCaixa({ aberto: true, operador, trocoInicial: troco, abertoEm: new Date().toISOString() })
        registrarEvento({
          ator: operador, acao: 'CAIXA_ABERTO', entidade: 'Caixa',
          detalhe: `Troco inicial de R$ ${troco.toFixed(2)}`, terminal: 'PDV',
        })
      },

      fecharCaixa: (contado, diferenca) => {
        registrarEvento({
          ator: caixa.operador, acao: 'CAIXA_FECHADO', entidade: 'Caixa',
          detalhe: `Contado R$ ${contado.toFixed(2)}${
            diferenca === 0 ? ' — sem diferença' : ` — ${diferenca > 0 ? 'sobra' : 'falta'} de R$ ${Math.abs(diferenca).toFixed(2)}`}`,
          terminal: 'PDV',
        })
        setCaixa((c) => ({ ...c, aberto: false }))
      },

      movimentarCaixa: (mov, autorizadoPor) => {
        setMovCaixa((atual) => [{ ...mov, id: uid(), criadoEm: new Date().toISOString() }, ...atual])
        registrarEvento({
          ator: caixa.operador, acao: mov.motivo === 'SANGRIA' ? 'SANGRIA' : 'SUPRIMENTO',
          entidade: 'Caixa', detalhe: `R$ ${mov.valor.toFixed(2)} — ${mov.observacao}`,
          autorizadoPor, terminal: 'PDV',
        })
      },

      /** Liga e desliga a SEFAZ, para demonstrar a contingência ao vivo. */
      alternarSefaz: () => {
        setSefaz((atual) => {
          const volta = !atual
          if (volta) setDocumentos((docs) => transmitirContingencia(docs))
          return volta
        })
      },

      cadastrarCliente: (dados) => {
        const cliente: Cliente = { ...dados, id: uid(), criadoEm: new Date().toISOString() }
        setClientes((atual) => [...atual, cliente])
        return cliente
      },

      saldoPontos: (clienteId) =>
        movimentosFidelidade
          .filter((m) => m.clienteId === clienteId)
          .reduce((s, m) => s + m.pontos, 0),

      resgatarPontos: (clienteId, pontos) => {
        const saldo = movimentosFidelidade
          .filter((m) => m.clienteId === clienteId)
          .reduce((s, m) => s + m.pontos, 0)
        if (pontos > saldo) return { ok: false, erro: `Saldo insuficiente: ${saldo} pontos disponíveis.` }
        setMovFidelidade((atual) => [
          { id: uid(), clienteId, tipo: 'RESGATE', pontos: -pontos, criadoEm: new Date().toISOString() },
          ...atual,
        ])
        return { ok: true }
      },

      responderPedido: (id, status) => {
        setPedidos((atual) => atual.map((p) => (p.id === id ? { ...p, status } : p)))
        const pedido = pedidos.find((p) => p.id === id)
        if (status === 'CONFIRMED' && pedido) {
          const senha = String(proximaSenha).padStart(3, '0')
          setProximaSenha(proximaSenha + 1)
          setPedidosCozinha((atual) => [
            {
              id: uid(), senha, origem: 'WHATSAPP', status: 'AGUARDANDO',
              recebidoEm: new Date().toISOString(), prometidoPara: pedido.retirarEm,
              itens: pedido.itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade })),
            },
            ...atual,
          ])
        }
        registrarEvento({
          ator: usuario ?? 'Atendente', acao: 'PEDIDO_RESPONDIDO', entidade: 'PedidoWhatsapp',
          detalhe: `${pedido?.cliente ?? id} — ${status === 'CONFIRMED' ? 'aceito' : 'recusado'}`,
          terminal: 'BACKOFFICE',
        })
      },

      atualizarPreparo: (pedidoId, status) =>
        setPedidosCozinha((atual) => atual.map((p) => (p.id === pedidoId ? { ...p, status } : p))),
    }
  }, [insumos, lotes, movimentosEstoque, produtos, fichas, fornadas, colaboradores,
      registrosPonto, ajustesPonto, vendas, caixa, movimentosCaixa, pedidos, clientes,
      movimentosFidelidade, perdasBalcao, documentosFiscais, pedidosCozinha,
      eventosAuditoria, dePara, usuario, sefazDisponivel, proximoNumeroNfce, proximaSenha])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useStore(): Estado {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
