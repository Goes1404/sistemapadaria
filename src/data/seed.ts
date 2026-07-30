import { calcularHashMarcacao } from '@/lib/ponto'
import type {
  Caixa,
  Colaborador,
  FichaTecnica,
  Insumo,
  Lote,
  MovimentoCaixa,
  MovimentoEstoque,
  PedidoWhatsapp,
  Produto,
  RegistroPonto,
  TipoPonto,
  Venda,
  Cliente,
  MovimentoFidelidade,
  PerdaBalcao,
  PedidoCozinha,
  DeParaProduto,
  EventoAuditoria,
} from '@/types'

/** Data-base fixa da demo, para o farol de validade ser sempre previsível. */
export const hoje = new Date()

function emDias(dias: number): string {
  const d = new Date(hoje)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function minutosAtras(minutos: number): string {
  return new Date(hoje.getTime() - minutos * 60_000).toISOString()
}

function horasAtras(horas: number): string {
  const d = new Date(hoje)
  d.setHours(d.getHours() - horas)
  return d.toISOString()
}

export const insumos: Insumo[] = [
  { id: 'i1', nome: 'Farinha de Trigo', unidade: 'KG', estoqueMinimo: 20 },
  { id: 'i2', nome: 'Fermento Biológico', unidade: 'G', estoqueMinimo: 500 },
  { id: 'i3', nome: 'Sal Refinado', unidade: 'KG', estoqueMinimo: 5 },
  { id: 'i4', nome: 'Manteiga sem Sal', unidade: 'KG', estoqueMinimo: 8 },
  { id: 'i5', nome: 'Leite Integral', unidade: 'L', estoqueMinimo: 15 },
  { id: 'i6', nome: 'Ovos', unidade: 'UN', estoqueMinimo: 60 },
  { id: 'i7', nome: 'Açúcar Refinado', unidade: 'KG', estoqueMinimo: 10 },
  { id: 'i8', nome: 'Presunto Fatiado', unidade: 'KG', estoqueMinimo: 3 },
]

export const lotes: Lote[] = [
  // Farinha — três lotes, validades distintas: demonstra FEFO ao vivo
  { id: 'l1', insumoId: 'i1', codigo: 'FT-2417', quantidadeInicial: 25, quantidadeAtual: 12, dataValidade: emDias(2), custoUnitario: 4.2, status: 'ATIVO' },
  { id: 'l2', insumoId: 'i1', codigo: 'FT-2431', quantidadeInicial: 50, quantidadeAtual: 50, dataValidade: emDias(45), custoUnitario: 4.35, status: 'ATIVO' },
  { id: 'l3', insumoId: 'i1', codigo: 'FT-2440', quantidadeInicial: 50, quantidadeAtual: 50, dataValidade: emDias(90), custoUnitario: 4.5, status: 'ATIVO' },

  { id: 'l4', insumoId: 'i2', codigo: 'FB-881', quantidadeInicial: 2000, quantidadeAtual: 1400, dataValidade: emDias(20), custoUnitario: 0.03, status: 'ATIVO' },
  { id: 'l5', insumoId: 'i3', codigo: 'SL-102', quantidadeInicial: 20, quantidadeAtual: 18, dataValidade: emDias(300), custoUnitario: 2.1, status: 'ATIVO' },

  // Manteiga — um lote vencido (vermelho) e um saudável
  { id: 'l6', insumoId: 'i4', codigo: 'MT-559', quantidadeInicial: 10, quantidadeAtual: 4, dataValidade: emDias(-1), custoUnitario: 38.9, status: 'ATIVO' },
  { id: 'l7', insumoId: 'i4', codigo: 'MT-563', quantidadeInicial: 12, quantidadeAtual: 12, dataValidade: emDias(25), custoUnitario: 39.5, status: 'ATIVO' },

  // Leite — vence hoje (vermelho)
  { id: 'l8', insumoId: 'i5', codigo: 'LT-770', quantidadeInicial: 30, quantidadeAtual: 9, dataValidade: emDias(0), custoUnitario: 4.8, status: 'ATIVO' },
  { id: 'l9', insumoId: 'i5', codigo: 'LT-774', quantidadeInicial: 40, quantidadeAtual: 40, dataValidade: emDias(12), custoUnitario: 4.9, status: 'ATIVO' },

  { id: 'l10', insumoId: 'i6', codigo: 'OV-311', quantidadeInicial: 360, quantidadeAtual: 210, dataValidade: emDias(3), custoUnitario: 0.75, status: 'ATIVO' },
  { id: 'l11', insumoId: 'i7', codigo: 'AC-208', quantidadeInicial: 25, quantidadeAtual: 22, dataValidade: emDias(180), custoUnitario: 3.6, status: 'ATIVO' },
  { id: 'l12', insumoId: 'i8', codigo: 'PR-045', quantidadeInicial: 8, quantidadeAtual: 2.4, dataValidade: emDias(1), custoUnitario: 32.0, status: 'ATIVO' },
]

export const produtos: Produto[] = [
  { id: 'p1', nome: 'Pão Francês (kg)', preco: 18.9, porPeso: true, codigoBarras: '7891000001', codigoBalanca: '100001',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p2', nome: 'Pão de Queijo (un)', preco: 3.5, porPeso: false, codigoBarras: '7891000002',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p3', nome: 'Bolo de Cenoura (fatia)', preco: 8.0, porPeso: false, codigoBarras: '7891000003',
    fiscal: { ncm: '19052000', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p4', nome: 'Sonho de Creme', preco: 6.5, porPeso: false, codigoBarras: '7891000004',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p5', nome: 'Presunto Fatiado (kg)', preco: 54.9, porPeso: true, codigoBarras: '7891000005', codigoBalanca: '100005',
    fiscal: { ncm: '16024900', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p6', nome: 'Café Expresso', preco: 5.0, porPeso: false, codigoBarras: '7891000006',
    fiscal: { ncm: '21011100', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p7', nome: 'Misto Quente', preco: 12.0, porPeso: false, codigoBarras: '7891000007',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p8', nome: 'Suco de Laranja 300ml', preco: 9.5, porPeso: false, codigoBarras: '7891000008',
    fiscal: { ncm: '20091100', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p9', nome: 'Baguete Artesanal', preco: 14.0, porPeso: false, codigoBarras: '7891000009',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p10', nome: 'Croissant', preco: 9.0, porPeso: false, codigoBarras: '7891000010',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p11', nome: 'Torta Salgada (fatia)', preco: 11.5, porPeso: false, codigoBarras: '7891000011',
    fiscal: { ncm: '19059090', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p12', nome: 'Água Mineral 500ml', preco: 4.0, porPeso: false, codigoBarras: '7891000012',
    fiscal: { ncm: '22011000', cfop: '5102', origem: '0', csosn: '102' } },
  { id: 'p13', nome: 'Mortadela Fatiada (kg)', preco: 39.9, porPeso: true, codigoBarras: '7891000013', codigoBalanca: '100013',
    fiscal: { ncm: '16024900', cfop: '5102', origem: '0', csosn: '102' } },
]

export const fichas: FichaTecnica[] = [
  {
    id: 'f1',
    produtoId: 'p1',
    nome: 'Pão Francês — fornada de 100 un',
    rendimento: 100,
    itens: [
      { insumoId: 'i1', quantidade: 6 },
      { insumoId: 'i2', quantidade: 60 },
      { insumoId: 'i3', quantidade: 0.12 },
    ],
  },
  {
    id: 'f2',
    produtoId: 'p3',
    nome: 'Bolo de Cenoura — 1 bolo (12 fatias)',
    rendimento: 12,
    itens: [
      { insumoId: 'i1', quantidade: 0.5 },
      { insumoId: 'i6', quantidade: 4 },
      { insumoId: 'i7', quantidade: 0.4 },
      { insumoId: 'i5', quantidade: 0.2 },
    ],
  },
  {
    id: 'f3',
    produtoId: 'p10',
    nome: 'Croissant — fornada de 40 un',
    rendimento: 40,
    itens: [
      { insumoId: 'i1', quantidade: 3 },
      { insumoId: 'i4', quantidade: 1.5 },
      { insumoId: 'i2', quantidade: 30 },
    ],
  },
]

export const colaboradores: Colaborador[] = [
  { id: 'c1', nome: 'Marcos Vieira', cargo: 'PADEIRO', pin: '1234', ativo: true, cpf: '32145678901' },
  { id: 'c2', nome: 'Ana Beatriz Lopes', cargo: 'ATENDENTE', pin: '2345', ativo: true, cpf: '45678912302' },
  { id: 'c3', nome: 'Rafael Nunes', cargo: 'ESTOQUISTA', pin: '3456', ativo: true, cpf: '78912345603' },
  { id: 'c4', nome: 'Juliana Prado', cargo: 'GERENTE', pin: '4567', ativo: true, cpf: '15975348604' },
  { id: 'c5', nome: 'Carlos Eduardo Reis', cargo: 'ATENDENTE', pin: '5678', ativo: true, cpf: '25836914705' },
]

/**
 * Marcações de ponto com NSR e cadeia de hash.
 *
 * Construídas em ordem cronológica para o encadeamento fechar — é o mesmo que
 * o terminal faz a cada marcação real.
 */
function construirMarcacoes(
  brutas: { colaboradorId: string; tipo: TipoPonto; horasAtras: number; inconsistencia?: boolean }[],
): RegistroPonto[] {
  const ordenadas = [...brutas].sort((a, b) => b.horasAtras - a.horasAtras)
  const saida: RegistroPonto[] = []
  let hashAnterior = '00000000'

  ordenadas.forEach((b, i) => {
    const nsr = i + 1
    const registradoEm = horasAtras(b.horasAtras)
    const hash = calcularHashMarcacao(nsr, b.colaboradorId, b.tipo, registradoEm, hashAnterior)
    saida.push({
      id: `rp${nsr}`,
      colaboradorId: b.colaboradorId,
      tipo: b.tipo,
      registradoEm,
      nsr,
      hash,
      hashAnterior,
      ...(b.inconsistencia ? { inconsistencia: true } : {}),
    })
    hashAnterior = hash
  })

  return saida
}

export const registrosPonto: RegistroPonto[] = construirMarcacoes([
  { colaboradorId: 'c1', tipo: 'ENTRADA', horasAtras: 16, inconsistencia: true },
  { colaboradorId: 'c2', tipo: 'ENTRADA', horasAtras: 5 },
  { colaboradorId: 'c2', tipo: 'PAUSA_INICIO', horasAtras: 2 },
  { colaboradorId: 'c2', tipo: 'PAUSA_FIM', horasAtras: 1 },
  { colaboradorId: 'c3', tipo: 'ENTRADA', horasAtras: 7 },
  { colaboradorId: 'c3', tipo: 'SAIDA', horasAtras: 1 },
  { colaboradorId: 'c4', tipo: 'ENTRADA', horasAtras: 4 },
])

export const vendas: Venda[] = [
  {
    id: 'v1', origem: 'PDV', criadaEm: horasAtras(4), total: 47.4,
    itens: [
      { produtoId: 'p1', nome: 'Pão Francês (kg)', quantidade: 1.2, precoUnitario: 18.9 },
      { produtoId: 'p6', nome: 'Café Expresso', quantidade: 2, precoUnitario: 5.0 },
      { produtoId: 'p7', nome: 'Misto Quente', quantidade: 1, precoUnitario: 12.0 },
    ],
    pagamentos: [{ forma: 'PIX', valor: 47.4 }],
  },
  {
    id: 'v2', origem: 'PDV', criadaEm: horasAtras(3), total: 28.0,
    itens: [
      { produtoId: 'p3', nome: 'Bolo de Cenoura (fatia)', quantidade: 2, precoUnitario: 8.0 },
      { produtoId: 'p12', nome: 'Água Mineral 500ml', quantidade: 3, precoUnitario: 4.0 },
    ],
    pagamentos: [{ forma: 'DINHEIRO', valor: 10.0 }, { forma: 'DEBITO', valor: 18.0 }],
  },
  {
    id: 'v3', origem: 'WHATSAPP', criadaEm: horasAtras(2), total: 96.0,
    itens: [{ produtoId: 'p9', nome: 'Baguete Artesanal', quantidade: 6, precoUnitario: 14.0 },
            { produtoId: 'p10', nome: 'Croissant', quantidade: 1, precoUnitario: 9.0 }],
    pagamentos: [{ forma: 'PIX', valor: 96.0 }],
  },
  {
    id: 'v4', origem: 'PDV', criadaEm: horasAtras(1), total: 63.9,
    itens: [
      { produtoId: 'p5', nome: 'Presunto Fatiado (kg)', quantidade: 0.5, precoUnitario: 54.9 },
      { produtoId: 'p2', nome: 'Pão de Queijo (un)', quantidade: 8, precoUnitario: 3.5 },
      { produtoId: 'p12', nome: 'Água Mineral 500ml', quantidade: 2, precoUnitario: 4.0 },
    ],
    pagamentos: [{ forma: 'CREDITO', valor: 63.9 }],
  },
]

export const movimentosCaixa: MovimentoCaixa[] = [
  { id: 'mc1', motivo: 'SANGRIA', valor: 200, observacao: 'Retirada para o cofre', criadoEm: horasAtras(3) },
  { id: 'mc2', motivo: 'SUPRIMENTO', valor: 50, observacao: 'Reforço de troco', criadoEm: horasAtras(2) },
]

export const pedidosWhatsapp: PedidoWhatsapp[] = [
  {
    id: 'w1', cliente: 'Dona Marlene', telefone: '(11) 98812-4410',
    itens: [{ produtoId: 'p9', nome: 'Baguete Artesanal', quantidade: 4, precoUnitario: 14.0 }],
    total: 56.0, retirarEm: '17:30', status: 'PENDING_CONFIRMATION', recebidoEm: minutosAtras(24),
  },
  {
    id: 'w2', cliente: 'Escritório Andrade', telefone: '(11) 99654-0021',
    itens: [
      { produtoId: 'p2', nome: 'Pão de Queijo (un)', quantidade: 30, precoUnitario: 3.5 },
      { produtoId: 'p6', nome: 'Café Expresso', quantidade: 10, precoUnitario: 5.0 },
    ],
    total: 155.0, retirarEm: '08:00', status: 'PENDING_CONFIRMATION', recebidoEm: minutosAtras(54),
  },
  {
    id: 'w3', cliente: 'Sr. Toninho', telefone: '(11) 97001-8834',
    itens: [{ produtoId: 'p3', nome: 'Bolo de Cenoura (fatia)', quantidade: 12, precoUnitario: 8.0 }],
    total: 96.0, retirarEm: '15:00', status: 'CONFIRMED', recebidoEm: horasAtras(3),
  },
  {
    id: 'w4', cliente: 'Paula Ribeiro', telefone: '(11) 98220-7745',
    itens: [{ produtoId: 'p10', nome: 'Croissant', quantidade: 6, precoUnitario: 9.0 }],
    total: 54.0, retirarEm: '—', status: 'ABORTED', recebidoEm: horasAtras(5),
  },
]

export const movimentosEstoque: MovimentoEstoque[] = [
  { id: 'me1', loteId: 'l1', insumoId: 'i1', quantidade: 25, motivo: 'ENTRADA', referencia: 'NF 4471', criadoEm: horasAtras(72) },
  { id: 'me2', loteId: 'l1', insumoId: 'i1', quantidade: -13, motivo: 'PRODUCAO', referencia: 'Fornada #218', criadoEm: horasAtras(28) },
  { id: 'me3', loteId: 'l8', insumoId: 'i5', quantidade: -21, motivo: 'PRODUCAO', referencia: 'Fornada #219', criadoEm: horasAtras(26) },
  { id: 'me4', loteId: 'l12', insumoId: 'i8', quantidade: -5.6, motivo: 'VENDA', referencia: 'Vendas do dia', criadoEm: horasAtras(6) },
]

export const fornadasIniciais = [
  { id: 'fo1', fichaTecnicaId: 'f1', quantidadeProduzida: 200, responsavel: 'Marcos Vieira', produzidaEm: horasAtras(28), consumos: [] },
  { id: 'fo2', fichaTecnicaId: 'f2', quantidadeProduzida: 24, responsavel: 'Marcos Vieira', produzidaEm: horasAtras(26), consumos: [] },
]

export const caixaInicial: Caixa = {
  aberto: true,
  operador: 'Ana Beatriz Lopes',
  trocoInicial: 150,
  abertoEm: horasAtras(6),
}

// ---------------------------------------------------------------------------
// Clientes e fidelidade
// ---------------------------------------------------------------------------

export const clientes: Cliente[] = [
  {
    id: 'cl1', nome: 'Dona Marlene Souza', telefone: '(11) 98812-4410', cpf: '11122233344',
    nascimento: '1958-08-02', aceitaContato: true, criadoEm: emDias(-420),
    assinatura: {
      plano: 'Clube do Pão — diário', frequencia: 'DIARIA', valorMensal: 189.9, status: 'ATIVA',
      itens: [{ produtoId: 'p1', quantidade: 0.5 }, { produtoId: 'p12', quantidade: 1 }],
    },
  },
  { id: 'cl2', nome: 'Escritório Andrade', telefone: '(11) 99654-0021', cpf: '55566677788',
    aceitaContato: true, criadoEm: emDias(-310),
    assinatura: {
      plano: 'Clube do Pão — dias úteis', frequencia: 'DIAS_UTEIS', valorMensal: 640.0, status: 'ATIVA',
      itens: [{ produtoId: 'p2', quantidade: 30 }, { produtoId: 'p6', quantidade: 10 }],
    },
  },
  { id: 'cl3', nome: 'Sr. Toninho Barros', telefone: '(11) 97001-8834', cpf: '99988877766',
    nascimento: '1965-07-31', aceitaContato: true, criadoEm: emDias(-260) },
  { id: 'cl4', nome: 'Paula Ribeiro', telefone: '(11) 98220-7745',
    nascimento: '1990-11-14', aceitaContato: true, criadoEm: emDias(-95) },
  { id: 'cl5', nome: 'Ricardo Menezes', telefone: '(11) 96543-2210', cpf: '12312312312',
    aceitaContato: false, criadoEm: emDias(-180) },
  { id: 'cl6', nome: 'Cláudia Ferraz', telefone: '(11) 99870-1122',
    nascimento: '1982-07-30', aceitaContato: true, criadoEm: emDias(-40) },
]

export const movimentosFidelidade: MovimentoFidelidade[] = [
  { id: 'mf1', clienteId: 'cl1', tipo: 'ACUMULO', pontos: 890, criadoEm: emDias(-30) },
  { id: 'mf2', clienteId: 'cl2', tipo: 'ACUMULO', pontos: 2140, criadoEm: emDias(-25) },
  { id: 'mf3', clienteId: 'cl3', tipo: 'ACUMULO', pontos: 430, criadoEm: emDias(-20) },
  { id: 'mf4', clienteId: 'cl1', tipo: 'RESGATE', pontos: -300, criadoEm: emDias(-8) },
  { id: 'mf5', clienteId: 'cl4', tipo: 'ACUMULO', pontos: 155, criadoEm: emDias(-60) },
  { id: 'mf6', clienteId: 'cl6', tipo: 'ACUMULO', pontos: 210, criadoEm: emDias(-5) },
]

// ---------------------------------------------------------------------------
// Perdas de balcão
// ---------------------------------------------------------------------------

export const perdasBalcao: PerdaBalcao[] = [
  { id: 'pb1', produtoId: 'p1', quantidade: 3.2, motivo: 'SOBRA_FIM_DIA', custoEstimado: 18.7,
    registradoPor: 'Ana Beatriz Lopes', registradoEm: horasAtras(20), observacao: 'Sobra do balcão' },
  { id: 'pb2', produtoId: 'p10', quantidade: 6, motivo: 'QUEIMADO', custoEstimado: 21.4,
    registradoPor: 'Marcos Vieira', registradoEm: horasAtras(26), observacao: 'Forno passou do ponto' },
  { id: 'pb3', produtoId: 'p3', quantidade: 4, motivo: 'SOBRA_FIM_DIA', custoEstimado: 12.9,
    registradoPor: 'Carlos Eduardo Reis', registradoEm: horasAtras(44) },
  { id: 'pb4', produtoId: 'p2', quantidade: 12, motivo: 'CONSUMO_INTERNO', custoEstimado: 9.6,
    registradoPor: 'Juliana Prado', registradoEm: horasAtras(48), observacao: 'Café da equipe' },
  { id: 'pb5', produtoId: 'p9', quantidade: 5, motivo: 'DOACAO', custoEstimado: 17.5,
    registradoPor: 'Juliana Prado', registradoEm: horasAtras(68), observacao: 'Doação à paróquia' },
]

// ---------------------------------------------------------------------------
// KDS
// ---------------------------------------------------------------------------

export const pedidosCozinha: PedidoCozinha[] = [
  // Tempos escalonados de propósito: um tranquilo, um em atenção, um atrasado.
  { id: 'k1', senha: '042', origem: 'PDV', status: 'EM_PREPARO', recebidoEm: minutosAtras(8),
    itens: [{ nome: 'Misto Quente', quantidade: 2 }, { nome: 'Café Expresso', quantidade: 2, observacao: 'sem açúcar' }] },
  { id: 'k2', senha: '043', origem: 'PDV', status: 'AGUARDANDO', recebidoEm: minutosAtras(2),
    itens: [{ nome: 'Torta Salgada (fatia)', quantidade: 1 }, { nome: 'Suco de Laranja 300ml', quantidade: 1 }] },
  { id: 'k3', senha: '039', origem: 'WHATSAPP', status: 'AGUARDANDO', recebidoEm: minutosAtras(15),
    prometidoPara: '17:30',
    itens: [{ nome: 'Baguete Artesanal', quantidade: 4, observacao: 'bem assada' }] },
  { id: 'k4', senha: '041', origem: 'PDV', status: 'PRONTO', recebidoEm: minutosAtras(11),
    itens: [{ nome: 'Croissant', quantidade: 3 }] },
]

// ---------------------------------------------------------------------------
// De-para de produtos do fornecedor
// ---------------------------------------------------------------------------

/** Aprendido em importações anteriores. FAR-25KG já é conhecido; os outros não. */
export const deParaInicial: DeParaProduto[] = [
  { codigoFornecedor: 'FAR-25KG', insumoId: 'i1' },
  { codigoFornecedor: 'ACU-REF', insumoId: 'i7' },
]

// ---------------------------------------------------------------------------
// Histórico para o BI
// ---------------------------------------------------------------------------

/**
 * Gera 21 dias de vendas com padrão realista de padaria.
 *
 * Dois picos (manhã e fim de tarde), sábado mais forte, domingo mais fraco.
 * Sem esse formato, o gráfico por faixa de horário não ensinaria nada — e é
 * justamente ele que mostra onde dimensionar equipe e fornada.
 */
function gerarHistorico(): Venda[] {
  // Gerador determinístico: a demo precisa ser igual a cada recarga.
  let semente = 20260730
  const aleatorio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }

  const cardapio = produtos.filter((p) => !p.porPeso)
  const pesoHora: Record<number, number> = {
    6: 0.7, 7: 1.6, 8: 1.9, 9: 1.2, 10: 0.8, 11: 0.9, 12: 1.0,
    13: 0.7, 14: 0.5, 15: 0.7, 16: 1.1, 17: 1.7, 18: 1.8, 19: 0.9,
  }
  const pesoDiaSemana = [0.6, 0.95, 0.95, 1.0, 1.05, 1.15, 1.45] // dom→sáb

  const historico: Venda[] = []
  let contador = 0

  for (let diasAtras = 21; diasAtras >= 1; diasAtras--) {
    const dia = new Date(hoje)
    dia.setDate(dia.getDate() - diasAtras)
    const fator = pesoDiaSemana[dia.getDay()]

    for (const [horaTexto, peso] of Object.entries(pesoHora)) {
      const hora = Number(horaTexto)
      const quantos = Math.round(peso * fator * 6 * (0.75 + aleatorio() * 0.5))

      for (let n = 0; n < quantos; n++) {
        const momento = new Date(dia)
        momento.setHours(hora, Math.floor(aleatorio() * 60), 0, 0)

        const qtdItens = 1 + Math.floor(aleatorio() * 3)
        const itens = Array.from({ length: qtdItens }, () => {
          const produto = cardapio[Math.floor(aleatorio() * cardapio.length)]
          return {
            produtoId: produto.id,
            nome: produto.nome,
            quantidade: 1 + Math.floor(aleatorio() * 3),
            precoUnitario: produto.preco,
          }
        })

        const total = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
        const sorteio = aleatorio()
        const forma: Venda['pagamentos'][number]['forma'] =
          sorteio < 0.38 ? 'PIX' : sorteio < 0.62 ? 'DEBITO' : sorteio < 0.82 ? 'CREDITO' : 'DINHEIRO'

        historico.push({
          id: `h${++contador}`,
          origem: aleatorio() < 0.12 ? 'WHATSAPP' : 'PDV',
          criadaEm: momento.toISOString(),
          itens,
          total,
          pagamentos: [{ forma, valor: total }],
        })
      }
    }
  }

  return historico
}

export const historicoVendas: Venda[] = gerarHistorico()

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export const eventosAuditoria: EventoAuditoria[] = [
  { id: 'ev1', quando: horasAtras(6), ator: 'Ana Beatriz Lopes', acao: 'CAIXA_ABERTO',
    entidade: 'Caixa', detalhe: 'Troco inicial de R$ 150,00', terminal: 'PDV' },
  { id: 'ev2', quando: horasAtras(3), ator: 'Ana Beatriz Lopes', acao: 'SANGRIA',
    entidade: 'Caixa', detalhe: 'R$ 200,00 — retirada para o cofre',
    autorizadoPor: 'Juliana Prado', terminal: 'PDV' },
  { id: 'ev3', quando: horasAtras(2.4), ator: 'Carlos Eduardo Reis', acao: 'DESCONTO_CONCEDIDO',
    entidade: 'Venda', detalhe: 'Desconto de 15% em pão do dia anterior',
    autorizadoPor: 'Juliana Prado', terminal: 'PDV' },
  { id: 'ev4', quando: horasAtras(28), ator: 'Marcos Vieira', acao: 'FORNADA_REGISTRADA',
    entidade: 'Fornada', detalhe: '200 un de Pão Francês', terminal: 'BACKOFFICE' },
  { id: 'ev5', quando: horasAtras(20), ator: 'Ana Beatriz Lopes', acao: 'PERDA_REGISTRADA',
    entidade: 'PerdaBalcao', detalhe: '3,2 kg de Pão Francês — sobra do balcão', terminal: 'PDV' },
]
