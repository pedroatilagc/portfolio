import { anim, splitWords, prefersReducedMotion, EASE } from './anim';

/**
 * Reveal no scroll com UM IntersectionObserver para a página inteira.
 *
 * - Só os elementos ABAIXO da dobra no carregamento são escondidos (via estilo inline,
 *   enquanto estão fora da tela → nenhum flash, nenhum layout shift visível).
 * - Os que já estão na tela ficam como estão.
 * - Sem JS ou com reduced motion: nada é escondido.
 */

type Variant = 'fade' | 'words' | 'line' | 'clip' | 'bars' | 'area';
type Pending = {
  el: HTMLElement;
  variant: Variant;
  words?: HTMLElement[];
  parts?: HTMLElement[]; // colunas (bars) ou o grupo da área (area)
  finishers: (() => void)[];
};

const VARIANTS: Variant[] = ['words', 'line', 'clip', 'bars', 'area'];

const CLIP_HIDDEN = 'inset(100% 0 0 0 round 16px)';
const CLIP_SHOWN = 'inset(0% 0 0 0 round 16px)';

function hide(p: Pending) {
  const s = p.el.style;
  switch (p.variant) {
    case 'fade':
      s.opacity = '0';
      s.transform = 'translateY(20px)';
      break;
    case 'words':
      p.words = splitWords(p.el);
      p.words.forEach((w) => (w.style.transform = 'translateY(110%)'));
      break;
    case 'line':
      s.transform = 'scaleX(0)';
      s.transformOrigin = 'left center';
      break;
    case 'clip':
      s.clipPath = CLIP_HIDDEN;
      break;
    case 'bars':
      // cada coluna (<g data-col>) começa achatada na base; transform-origin: bottom no CSS
      p.parts = [...p.el.querySelectorAll<HTMLElement>('[data-col]')];
      p.parts.forEach((c) => (c.style.transform = 'scaleY(0)'));
      break;
    case 'area':
      p.parts = [...p.el.querySelectorAll<HTMLElement>('[data-area], [data-area-dots]')];
      p.parts.forEach((g) => {
        g.style.opacity = '0';
        g.style.clipPath = 'inset(0 100% 0 0)';
      });
      break;
  }
}

function show(p: Pending, instant = false) {
  const delay = instant ? 0 : Number(p.el.dataset.revealDelay ?? 0) * 100;
  const duration = (ms: number) => (instant ? 0 : ms);
  const push = (d: { finish: () => void }) => p.finishers.push(d.finish);

  switch (p.variant) {
    case 'fade':
      push(
        anim(
          p.el,
          [
            { opacity: 0, transform: 'translateY(20px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: duration(550), delay, easing: EASE.out, reset: true },
        ),
      );
      break;
    case 'words':
      p.words?.forEach((w, i) =>
        push(
          anim(w, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], {
            duration: duration(1000),
            delay: instant ? 0 : delay + i * 40,
            easing: EASE.expo,
            reset: true,
          }),
        ),
      );
      break;
    case 'line':
      push(
        anim(p.el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: duration(900),
          delay,
          easing: EASE.expo,
          reset: true,
        }),
      );
      break;
    case 'clip':
      push(
        anim(p.el, [{ clipPath: CLIP_HIDDEN }, { clipPath: CLIP_SHOWN }], {
          duration: duration(900),
          delay,
          easing: EASE.expo,
          reset: true,
        }),
      );
      break;
    case 'bars':
      // stagger por dia: cada coluna cresce 70ms depois da anterior
      p.parts?.forEach((c, i) =>
        push(
          anim(c, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
            duration: duration(800),
            delay: instant ? 0 : delay + i * 70,
            easing: EASE.expo,
            reset: true,
          }),
        ),
      );
      break;
    case 'area':
      p.parts?.forEach((g) =>
        push(
          anim(
            g,
            [
              { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
              { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
            ],
            { duration: duration(1100), delay, easing: EASE.inOut, reset: true },
          ),
        ),
      );
      break;
  }
}

export function initReveal(): () => void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return () => {};

  const els = [...document.querySelectorAll<HTMLElement>('main [data-reveal]')];
  const pending = new Map<HTMLElement, Pending>();
  const vh = window.innerHeight;

  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh) continue; // já visível (ou acima) no load: não anima
    const raw = el.dataset.reveal;
    const variant: Variant = VARIANTS.includes(raw as Variant) ? (raw as Variant) : 'fade';
    const p: Pending = { el, variant, finishers: [] };
    hide(p);
    pending.set(el, p);
  }
  if (!pending.size) return () => {};

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const p = pending.get(entry.target as HTMLElement);
        if (!p) continue;
        io.unobserve(p.el);
        pending.delete(p.el);
        show(p);
      }
    },
    { rootMargin: '-80px 0px', threshold: 0 },
  );
  pending.forEach((p) => io.observe(p.el));

  // Acessibilidade: se o foco do teclado chegar num elemento ainda escondido,
  // revela na hora (ninguém pode focar algo invisível).
  const onFocus = (e: FocusEvent) => {
    const target = e.target as Node;
    for (const p of pending.values()) {
      if (p.el.contains(target)) {
        io.unobserve(p.el);
        pending.delete(p.el);
        show(p, true);
        p.finishers.forEach((f) => f());
      }
    }
  };
  document.addEventListener('focusin', onFocus);

  // Reduced motion ligado no meio da navegação: mostra tudo.
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (e: MediaQueryListEvent) => {
    if (!e.matches) return;
    for (const p of pending.values()) {
      io.unobserve(p.el);
      show(p, true);
    }
    pending.clear();
  };
  mq.addEventListener('change', onMotion);

  return () => {
    io.disconnect();
    document.removeEventListener('focusin', onFocus);
    mq.removeEventListener('change', onMotion);
  };
}
