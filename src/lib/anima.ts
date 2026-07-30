import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'

/** Respeita a preferência do sistema — acessibilidade antes de enfeite. */
export const movimentoReduzido = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Entrada em cascata dos elementos marcados com `data-anima` dentro do container.
 * Recalcula quando `chave` muda — é o que faz a troca de tela reanimar.
 */
export function useRevelar<T extends HTMLElement>(chave?: unknown): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current || movimentoReduzido()) return
    const alvos = ref.current.querySelectorAll('[data-anima]')
    if (alvos.length === 0) return

    const ctx = gsap.context(() => {
      gsap.from(alvos, {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.055,
        clearProps: 'transform,opacity',
      })
    }, ref)

    return () => ctx.revert()
  }, [chave])

  return ref
}

/**
 * Brilho especular que segue o cursor, no estilo do material de vidro da Apple.
 * Usa quickTo para escrever direto na CSS var, sem re-render do React.
 */
export function useBrilho<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || movimentoReduzido()) return

    const paraX = gsap.quickTo(el, '--bx', { duration: 0.5, ease: 'power2.out' })
    const paraY = gsap.quickTo(el, '--by', { duration: 0.5, ease: 'power2.out' })

    // Valores sem unidade: o CSS converte com calc(var(--bx) * 1%).
    function mover(e: PointerEvent) {
      const r = el!.getBoundingClientRect()
      paraX(((e.clientX - r.left) / r.width) * 100)
      paraY(((e.clientY - r.top) / r.height) * 100)
    }

    el.addEventListener('pointermove', mover)
    return () => el.removeEventListener('pointermove', mover)
  }, [])

  return ref
}

/** Conta o número até o valor final. Para dinheiro, use `formatar`. */
export function useContador<T extends HTMLElement>(
  valor: number,
  formatar: (n: number) => string,
): RefObject<T> {
  const ref = useRef<T>(null)
  const anterior = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (movimentoReduzido()) {
      el.textContent = formatar(valor)
      anterior.current = valor
      return
    }

    const alvo = { n: anterior.current }
    const tween = gsap.to(alvo, {
      n: valor,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = formatar(alvo.n) },
      onComplete: () => { anterior.current = valor },
    })
    return () => { tween.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return ref
}

/** Pulso de destaque — usado quando um valor muda por ação do usuário. */
export function pulsar(el: Element | null) {
  if (!el || movimentoReduzido()) return
  gsap.fromTo(el,
    { scale: 1 },
    { scale: 1.06, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' })
}

/** Entrada de modal: fundo em fade, painel subindo com leve escala. */
export function animarModal(fundo: Element | null, painel: Element | null) {
  if (movimentoReduzido()) return
  if (fundo) gsap.from(fundo, { opacity: 0, duration: 0.2, ease: 'power2.out' })
  if (painel) {
    gsap.from(painel, {
      opacity: 0, y: 24, scale: 0.96,
      duration: 0.42, ease: 'power3.out',
    })
  }
}
