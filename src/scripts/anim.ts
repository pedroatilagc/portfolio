/**
 * Helpers de animação sobre a Web Animations API (element.animate).
 *
 * Por que WAAPI: é a mesma engine das animações CSS (roda no compositor quando
 * animamos só transform/opacity), mas controlada por JS — dá para encadear,
 * esperar `finished`, cancelar e ler o progresso, sem biblioteca.
 */

export const EASE = {
  expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  out: 'cubic-bezier(0.33, 1, 0.68, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const reducedMotionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => reducedMotionQuery().matches;

export type AnimOpts = KeyframeAnimationOptions & {
  /** Depois de terminar, remove os estilos inline das propriedades animadas
   *  (útil quando o estado final é o "natural" do CSS, ex.: transform: none,
   *  para não brigar com um :hover que também usa transform). */
  reset?: boolean;
};

type Done = { finished: Promise<void>; finish: () => void };

function propsOf(keyframes: Keyframe[]): string[] {
  const props = new Set<string>();
  for (const kf of keyframes) {
    for (const key of Object.keys(kf)) {
      if (key !== 'offset' && key !== 'easing' && key !== 'composite') props.add(key);
    }
  }
  return [...props];
}

function applyInline(el: HTMLElement, kf: Keyframe) {
  for (const [key, value] of Object.entries(kf)) {
    if (key === 'offset' || key === 'easing' || key === 'composite') continue;
    (el.style as unknown as Record<string, string>)[key] = String(value);
  }
}

function clearInline(el: HTMLElement, props: string[]) {
  for (const p of props) (el.style as unknown as Record<string, string>)[p] = '';
}

/**
 * anim(el, keyframes, opts)
 * - fill: 'both' → aplica o 1º keyframe durante o delay (sem "piscar" o estado final)
 * - easing padrão: expo
 * - ao terminar: commitStyles() grava o estado final como estilo inline e
 *   cancel() remove a animação. Assim não fica uma animação "pendurada" segurando
 *   o elemento (o que impediria transições CSS e gastaria memória).
 * - com reduced motion: aplica direto o último keyframe, sem animar.
 */
export function anim(el: HTMLElement, keyframes: Keyframe[], opts: AnimOpts = {}): Done {
  const { reset, ...options } = opts;
  const last = keyframes[keyframes.length - 1];

  if (prefersReducedMotion() || typeof el.animate !== 'function') {
    if (reset) clearInline(el, propsOf(keyframes));
    else applyInline(el, last);
    return { finished: Promise.resolve(), finish: () => {} };
  }

  const a = el.animate(keyframes, { fill: 'both', easing: EASE.expo, ...options });
  const finished = a.finished.then(
    () => {
      if (reset) {
        clearInline(el, propsOf(keyframes));
      } else {
        try {
          a.commitStyles();
        } catch {
          // commitStyles lança se o elemento não estiver renderizado (display:none)
          applyInline(el, last);
        }
      }
      a.cancel();
    },
    () => {
      /* cancelada: nada a fazer */
    },
  );
  return {
    finished,
    finish: () => {
      try {
        a.finish();
      } catch {
        /* animação já cancelada */
      }
    },
  };
}

/**
 * Tween linear de 0 → `to`, chamando onUpdate a cada frame (requestAnimationFrame).
 * Usado pela digitação: t = progresso × length, e slice(0, floor(t)).
 */
export function tween(
  duration: number,
  to: number,
  onUpdate: (value: number) => void,
  delay = 0,
): { finished: Promise<void>; stop: () => void } {
  let raf = 0;
  let timer = 0;
  let stopped = false;
  let resolve!: () => void;
  const finished = new Promise<void>((r) => (resolve = r));

  const start = () => {
    const t0 = performance.now();
    const frame = (now: number) => {
      if (stopped) return;
      const p = duration <= 0 ? 1 : Math.min(1, (now - t0) / duration);
      onUpdate(p * to);
      if (p < 1) raf = requestAnimationFrame(frame);
      else resolve();
    };
    raf = requestAnimationFrame(frame);
  };
  timer = window.setTimeout(start, delay);

  return {
    finished,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      onUpdate(to);
      resolve();
    },
  };
}

/** Divide o texto de um título em palavras: <span class="split-w"><span>palavra</span></span>.
 *  O texto completo fica num .sr-only e as palavras com aria-hidden,
 *  para o leitor de tela ler a frase inteira, e não palavra por palavra. */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'done') {
    return [...el.querySelectorAll<HTMLElement>('.split-w > span')];
  }
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  el.textContent = '';

  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;

  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');

  const inners: HTMLElement[] = [];
  text.split(' ').forEach((word, i, arr) => {
    const outer = document.createElement('span');
    outer.className = 'split-w';
    const inner = document.createElement('span');
    inner.textContent = word;
    outer.appendChild(inner);
    visual.appendChild(outer);
    if (i < arr.length - 1) visual.appendChild(document.createTextNode(' '));
    inners.push(inner);
  });

  el.append(sr, visual);
  el.dataset.split = 'done';
  return inners;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
