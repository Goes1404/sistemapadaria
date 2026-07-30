/**
 * Esqueleto dos módulos da v1 real.
 *
 * Nada aqui está ligado à interface, e é de propósito: ainda não é hora do
 * front-end desses módulos. São contratos de domínio — tipos e portas — para
 * que a implementação futura seja preenchimento, não desenho do zero.
 *
 * Como usar quando a hora chegar:
 *
 *   1. Escolha o módulo pelo docs/MELHORIAS.md (a priorização está lá).
 *   2. O backend implementa a porta correspondente (ex.: `EmissorFiscal`).
 *   3. O front consome a porta, não o provedor concreto — trocar de provedor
 *      de NFC-e, de TEF ou de PSP de PIX não deve tocar em tela.
 *   4. Só então crie a tela.
 *
 * Por que os tipos vivem em `src/` e não em `docs/`: aqui eles são conferidos
 * pelo compilador. Contrato que não compila é prosa, e prosa envelhece sem
 * ninguém perceber. Como nada é importado pela aplicação, o bundle não cresce.
 */

// Bloqueadores legais
export type * from './fiscal'
export type * from './pontoLegal'

// Operação diária
export * from './balanca' // exporta funções reais, não só tipos
export type * from './compras'
export type * from './pagamentos'
export type * from './dispositivos'
export type * from './producaoAvancada'

// Plataforma e crescimento
export type * from './plataforma'
export type * from './fidelidade'
export type * from './bi'
