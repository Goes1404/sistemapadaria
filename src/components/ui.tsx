import type { ReactNode } from 'react'
import { useBrilho, useContador } from '@/lib/anima'
import type { Farol } from '@/types'

export function PageHeader({ titulo, subtitulo, acao }: {
  titulo: string; subtitulo?: string; acao?: ReactNode
}) {
  return (
    <header data-anima className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-mata-900 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-mata-900/55">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  )
}

/** Painel de vidro com brilho especular seguindo o cursor. */
export function Vidro({ children, className = '', interativo = true, anima = true }: {
  children: ReactNode; className?: string; interativo?: boolean; anima?: boolean
}) {
  const ref = useBrilho<HTMLDivElement>()
  return (
    <div
      ref={interativo ? ref : undefined}
      {...(anima ? { 'data-anima': '' } : {})}
      className={`vidro ${interativo ? 'vidro-interativo' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function Card({ titulo, acao, children, className = '' }: {
  titulo?: string; acao?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <Vidro className={className}>
      {titulo && (
        <div className="flex items-center justify-between border-b border-white/50 px-5 py-3.5">
          <h2 className="text-sm font-bold text-mata-900">{titulo}</h2>
          {acao}
        </div>
      )}
      <div className="card-pad">{children}</div>
    </Vidro>
  )
}

const coresFarol: Record<Farol, string> = {
  VERDE: 'bg-mata-500/15 text-mata-700 ring-mata-600/25',
  AMARELO: 'bg-bela-500/20 text-bela-800 ring-bela-600/30',
  VERMELHO: 'bg-red-500/15 text-red-700 ring-red-600/25',
}

export function BadgeFarol({ farol, texto }: { farol: Farol; texto: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset backdrop-blur-sm ${coresFarol[farol]}`}>
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
    neutro: 'bg-mata-900/8 text-mata-800 ring-mata-900/15',
    ok: 'bg-mata-500/15 text-mata-700 ring-mata-600/25',
    alerta: 'bg-bela-500/20 text-bela-800 ring-bela-600/30',
    erro: 'bg-red-500/15 text-red-700 ring-red-600/25',
    info: 'bg-sky-500/15 text-sky-800 ring-sky-600/25',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset backdrop-blur-sm ${tons[tom]}`}>
      {children}
    </span>
  )
}

export function Stat({ rotulo, valor, detalhe, tom = 'neutro', numero, formatar }: {
  rotulo: string; valor: string; detalhe?: string
  tom?: 'neutro' | 'ok' | 'alerta' | 'erro'
  /** Passe `numero` + `formatar` para o valor subir contando via GSAP. */
  numero?: number
  formatar?: (n: number) => string
}) {
  const cores = {
    neutro: 'text-mata-900', ok: 'text-mata-600',
    alerta: 'text-bela-700', erro: 'text-red-600',
  }
  const contador = useContador<HTMLParagraphElement>(numero ?? 0, formatar ?? ((n) => String(n)))

  return (
    <Vidro className="card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-mata-900/50">{rotulo}</p>
      {numero !== undefined && formatar ? (
        <p ref={contador} className={`mt-2 text-3xl font-extrabold tabular-nums ${cores[tom]}`}>
          {formatar(numero)}
        </p>
      ) : (
        <p className={`mt-2 text-3xl font-extrabold tabular-nums ${cores[tom]}`}>{valor}</p>
      )}
      {detalhe && <p className="mt-1 text-xs text-mata-900/50">{detalhe}</p>}
    </Vidro>
  )
}

export function Vazio({ mensagem, icone = '·' }: { mensagem: string; icone?: string }) {
  return (
    <div className="py-10 text-center">
      <span className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-mata-900/5 text-lg text-mata-900/30">
        {icone}
      </span>
      <p className="mx-auto max-w-xs text-sm text-mata-900/40">{mensagem}</p>
    </div>
  )
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-white/50 bg-white/30">
          <tr>{cabecalho.map((c) => <th key={c} className="th">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/40 [&>tr]:transition-colors [&>tr:hover]:bg-white/40">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Aviso({ tom, children }: { tom: 'ok' | 'erro' | 'info'; children: ReactNode }) {
  const tons = {
    ok: 'border-mata-400/40 bg-mata-500/10 text-mata-800',
    erro: 'border-red-400/40 bg-red-500/10 text-red-800',
    info: 'border-sky-400/40 bg-sky-500/10 text-sky-900',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${tons[tom]}`}>{children}</div>
  )
}

/** Marca da padaria — círculo com montanha, nas cores da logo. */
export function Logo({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <circle cx="32" cy="32" r="31" fill="#0f0f0f" />
      <circle cx="32" cy="32" r="28" fill="#f5a623" />
      <circle cx="32" cy="32" r="24.5" fill="#0f0f0f" />
      <circle cx="32" cy="32" r="22" fill="#fffaed" />
      <circle cx="32" cy="34" r="15" fill="#f5a623" />
      <path
        d="M14 40l9-12 5.5 7L34 26l6 8.5L44 30l6 10z"
        fill="#1f4a2c"
      />
      <path d="M23 28l3.2 4.3h-6.4zM34 26l3.4 4.6h-6.8z" fill="#fffaed" />
      <rect x="12" y="40" width="40" height="3" rx="1.5" fill="#1f4a2c" />
    </svg>
  )
}
