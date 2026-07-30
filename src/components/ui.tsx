import type { ReactNode } from 'react'
import type { Farol } from '@/types'

export function PageHeader({ titulo, subtitulo, acao }: {
  titulo: string; subtitulo?: string; acao?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-stone-500">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  )
}

export function Card({ titulo, acao, children, className = '' }: {
  titulo?: string; acao?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {titulo && (
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-stone-700">{titulo}</h2>
          {acao}
        </div>
      )}
      <div className="card-pad">{children}</div>
    </section>
  )
}

const coresFarol: Record<Farol, string> = {
  VERDE: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  AMARELO: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  VERMELHO: 'bg-red-100 text-red-800 ring-red-600/20',
}

export function BadgeFarol({ farol, texto }: { farol: Farol; texto: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${coresFarol[farol]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {texto}
    </span>
  )
}

export function Badge({ children, tom = 'neutro' }: {
  children: ReactNode
  tom?: 'neutro' | 'ok' | 'alerta' | 'erro' | 'info'
}) {
  const tons = {
    neutro: 'bg-stone-100 text-stone-700 ring-stone-500/20',
    ok: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    alerta: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    erro: 'bg-red-100 text-red-800 ring-red-600/20',
    info: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tons[tom]}`}>
      {children}
    </span>
  )
}

export function Stat({ rotulo, valor, detalhe, tom = 'neutro' }: {
  rotulo: string; valor: string; detalhe?: string
  tom?: 'neutro' | 'ok' | 'alerta' | 'erro'
}) {
  const cores = {
    neutro: 'text-stone-900', ok: 'text-emerald-700',
    alerta: 'text-amber-700', erro: 'text-red-700',
  }
  return (
    <div className="card card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{rotulo}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${cores[tom]}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-stone-500">{detalhe}</p>}
    </div>
  )
}

export function Vazio({ mensagem }: { mensagem: string }) {
  return (
    <p className="py-10 text-center text-sm text-stone-400">{mensagem}</p>
  )
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-stone-200 bg-stone-50">
          <tr>{cabecalho.map((c) => <th key={c} className="th">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Aviso({ tom, children }: { tom: 'ok' | 'erro' | 'info'; children: ReactNode }) {
  const tons = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    erro: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tons[tom]}`}>{children}</div>
  )
}
