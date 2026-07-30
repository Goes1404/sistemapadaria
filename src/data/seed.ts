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
  Venda,
} from '@/types'

/** Data-base fixa da demo, para o farol de validade ser sempre previsível. */
export const hoje = new Date()

function emDias(dias: number): string {
  const d = new Date(hoje)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
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
  { id: 'p1', nome: 'Pão Francês (kg)', preco: 18.9, porPeso: true, codigoBarras: '7891000001' },
  { id: 'p2', nome: 'Pão de Queijo (un)', preco: 3.5, porPeso: false, codigoBarras: '7891000002' },
  { id: 'p3', nome: 'Bolo de Cenoura (fatia)', preco: 8.0, porPeso: false, codigoBarras: '7891000003' },
  { id: 'p4', nome: 'Sonho de Creme', preco: 6.5, porPeso: false, codigoBarras: '7891000004' },
  { id: 'p5', nome: 'Presunto Fatiado (kg)', preco: 54.9, porPeso: true, codigoBarras: '7891000005' },
  { id: 'p6', nome: 'Café Expresso', preco: 5.0, porPeso: false, codigoBarras: '7891000006' },
  { id: 'p7', nome: 'Misto Quente', preco: 12.0, porPeso: false, codigoBarras: '7891000007' },
  { id: 'p8', nome: 'Suco de Laranja 300ml', preco: 9.5, porPeso: false, codigoBarras: '7891000008' },
  { id: 'p9', nome: 'Baguete Artesanal', preco: 14.0, porPeso: false, codigoBarras: '7891000009' },
  { id: 'p10', nome: 'Croissant', preco: 9.0, porPeso: false, codigoBarras: '7891000010' },
  { id: 'p11', nome: 'Torta Salgada (fatia)', preco: 11.5, porPeso: false, codigoBarras: '7891000011' },
  { id: 'p12', nome: 'Água Mineral 500ml', preco: 4.0, porPeso: false, codigoBarras: '7891000012' },
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
  { id: 'c1', nome: 'Marcos Vieira', cargo: 'PADEIRO', pin: '1234', ativo: true },
  { id: 'c2', nome: 'Ana Beatriz Lopes', cargo: 'ATENDENTE', pin: '2345', ativo: true },
  { id: 'c3', nome: 'Rafael Nunes', cargo: 'ESTOQUISTA', pin: '3456', ativo: true },
  { id: 'c4', nome: 'Juliana Prado', cargo: 'GERENTE', pin: '4567', ativo: true },
  { id: 'c5', nome: 'Carlos Eduardo Reis', cargo: 'ATENDENTE', pin: '5678', ativo: true },
]

export const registrosPonto: RegistroPonto[] = [
  { id: 'rp1', colaboradorId: 'c1', tipo: 'ENTRADA', registradoEm: horasAtras(16), inconsistencia: true },
  { id: 'rp2', colaboradorId: 'c2', tipo: 'ENTRADA', registradoEm: horasAtras(5) },
  { id: 'rp3', colaboradorId: 'c2', tipo: 'PAUSA_INICIO', registradoEm: horasAtras(2) },
  { id: 'rp4', colaboradorId: 'c2', tipo: 'PAUSA_FIM', registradoEm: horasAtras(1) },
  { id: 'rp5', colaboradorId: 'c3', tipo: 'ENTRADA', registradoEm: horasAtras(7) },
  { id: 'rp6', colaboradorId: 'c3', tipo: 'SAIDA', registradoEm: horasAtras(1) },
  { id: 'rp7', colaboradorId: 'c4', tipo: 'ENTRADA', registradoEm: horasAtras(4) },
]

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
    total: 56.0, retirarEm: '17:30', status: 'PENDING_CONFIRMATION', recebidoEm: horasAtras(0.4),
  },
  {
    id: 'w2', cliente: 'Escritório Andrade', telefone: '(11) 99654-0021',
    itens: [
      { produtoId: 'p2', nome: 'Pão de Queijo (un)', quantidade: 30, precoUnitario: 3.5 },
      { produtoId: 'p6', nome: 'Café Expresso', quantidade: 10, precoUnitario: 5.0 },
    ],
    total: 155.0, retirarEm: '08:00', status: 'PENDING_CONFIRMATION', recebidoEm: horasAtras(0.9),
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
