import { prefersReducedMotion } from './anim';

/**
 * Text scramble ("decode") do nome no hero, com cara de dado corrompido. Vanilla.
 *
 * Como funciona:
 * 1. split(): o texto vira <span class="dw"> por palavra (white-space: nowrap) com
 *    um <span class="dc"> por caractere. Espaços ficam como texto normal entre as
 *    palavras: nunca embaralham e são os únicos pontos de quebra de linha.
 * 2. measure(): com a fonte final carregada, mede a largura de cada letra em
 *    Fraunces e trava o <span> nela. O símbolo sorteado ocupa exatamente o mesmo
 *    espaço → zero layout shift. Guarda também o centro de cada letra (para o hover).
 * 3. Cada caractere tem estado próprio: ativo (embaralhando) até `lockAt`.
 *    UM loop de requestAnimationFrame atende todos os ativos; quando não sobra
 *    nenhum, ele para. Na entrada, todos ativam com lockAt escalonado (esquerda →
 *    direita). No hover, só as letras perto do cursor ativam.
 *
 * Efeitos de corrupção (todos em transform/opacity/text-shadow: nenhum mexe no layout):
 * - a cada troca de símbolo, a letra recebe deslocamento, flicker e separação RGB
 *   aleatórios (variáveis CSS --gx, --gy, --go, --rx);
 * - de vez em quando um glifo de bloco (█▓▒░) no lugar do símbolo;
 * - "rasgo": uma palavra que ainda tem letras corrompidas desliza e inclina por ~70ms;
 * - ao travar, a letra dá um flash curto (classe .is-locked, keyframe no CSS).
 */

const CHARSET = '{}[]<>/\\=;:_#$%&*+-~|01' + '0123456789abcdef';
const BLOCKS = '█▓▒░';
const BLOCK_CHANCE = 0.14;
const SWAP_MS = 50;

const ENTER = { stagger: 35, total: 1400 };
// Hover: cada letra atingida fica corrompida por 220–380ms e depois descansa 400ms.
const HOVER_MIN = 220;
const HOVER_JITTER = 160;
const COOLDOWN = 400;
const HOVER_RADIUS_EM = 0.85; // alcance horizontal do cursor, em em (~2–3 letras)
const TEAR_EVERY = [70, 160]; // intervalo entre rasgos, em ms
const TEAR_MS = 70;
const NO_INTRO_DELAY = 150;

type Char = {
  el: HTMLSpanElement;
  word: HTMLSpanElement;
  real: string;
  index: number;
  active: boolean;
  lockAt: number;
  swappedAt: number;
  restUntil: number;
  cx: number; // centro, relativo ao root (px)
  cy: number;
};

const pick = (s: string) => s[(Math.random() * s.length) | 0];
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

function randomGlyph(avoid: string) {
  let g = avoid;
  while (g === avoid) g = Math.random() < BLOCK_CHANCE ? pick(BLOCKS) : pick(CHARSET);
  return g;
}

class Decoder {
  private chars: Char[] = [];
  private active = new Set<Char>();
  private raf = 0;
  private dirty = false;
  private nextTear = 0;
  private torn: { el: HTMLSpanElement; until: number } | null = null;
  private fontPx = 16;

  constructor(private root: HTMLElement) {
    this.split();
  }

  get running() {
    return this.active.size > 0;
  }

  private split() {
    const text = (this.root.textContent ?? '').replace(/\s+/g, ' ').trim().normalize('NFC');
    this.root.textContent = '';
    let index = 0;
    text.split(' ').forEach((word, w, words) => {
      const wrap = document.createElement('span');
      wrap.className = 'dw';
      wrap.setAttribute('aria-hidden', 'true');
      // Array.from separa por code point: "Á" e "â" são um caractere só.
      for (const ch of Array.from(word)) {
        const el = document.createElement('span');
        el.className = 'dc';
        el.textContent = ch;
        wrap.append(el);
        this.chars.push({
          el,
          word: wrap,
          real: ch,
          index: index++,
          active: false,
          lockAt: 0,
          swappedAt: 0,
          restUntil: 0,
          cx: 0,
          cy: 0,
        });
      }
      this.root.append(wrap);
      if (w < words.length - 1) {
        this.root.append(' ');
        index++; // o espaço conta no tempo da entrada, para o ritmo seguir a leitura
      }
    });
  }

  /** Trava a largura de cada caractere na largura da letra final (Fraunces). */
  measure() {
    if (this.running) {
      this.dirty = true;
      return;
    }
    // escreve tudo, lê tudo, escreve tudo: um único reflow
    this.chars.forEach((c) => (c.el.style.width = ''));
    const base = this.root.getBoundingClientRect();
    const rects = this.chars.map((c) => c.el.getBoundingClientRect());
    this.chars.forEach((c, i) => {
      const r = rects[i];
      c.el.style.width = `${r.width}px`;
      c.cx = r.left - base.left + r.width / 2;
      c.cy = r.top - base.top + r.height / 2;
    });
    this.fontPx = parseFloat(getComputedStyle(this.root).fontSize) || 16;
  }

  private corrupt(c: Char, now: number) {
    const s = c.el.style;
    c.el.textContent = randomGlyph(c.el.textContent ?? '');
    s.setProperty('--gx', rnd(-1, 1).toFixed(2));
    s.setProperty('--gy', rnd(-1, 1).toFixed(2));
    s.setProperty('--go', rnd(0.45, 1).toFixed(2));
    s.setProperty('--rx', rnd(0.4, 1.6).toFixed(2));
    c.swappedAt = now;
  }

  private activate(c: Char, lockAt: number, now: number) {
    c.active = true;
    c.lockAt = lockAt;
    c.el.classList.remove('is-locked');
    c.el.classList.add('is-scrambling');
    this.corrupt(c, now);
    this.active.add(c);
  }

  private lock(c: Char, now: number) {
    c.active = false;
    c.restUntil = now + COOLDOWN;
    c.el.textContent = c.real;
    c.el.classList.remove('is-scrambling');
    c.el.classList.add('is-locked'); // flash curto (keyframe no CSS)
    this.active.delete(c);
  }

  private tear(now: number) {
    if (this.torn && now >= this.torn.until) {
      this.torn.el.classList.remove('is-torn');
      this.torn = null;
    }
    if (this.torn || now < this.nextTear) return;
    // só rasga palavras que ainda têm letras corrompidas
    const words = [...new Set([...this.active].map((c) => c.word))];
    if (!words.length) return;
    const el = words[(Math.random() * words.length) | 0];
    el.style.setProperty('--tx', rnd(-1, 1).toFixed(2));
    el.classList.add('is-torn');
    this.torn = { el, until: now + TEAR_MS };
    this.nextTear = now + rnd(TEAR_EVERY[0], TEAR_EVERY[1]);
  }

  private loop() {
    if (this.raf) return;
    const frame = (now: number) => {
      // Só os caracteres ativos entram no laço.
      for (const c of this.active) {
        if (now >= c.lockAt) this.lock(c, now);
        else if (now - c.swappedAt >= SWAP_MS) this.corrupt(c, now);
      }
      this.tear(now);
      if (this.active.size || this.torn) {
        this.raf = requestAnimationFrame(frame);
      } else {
        this.raf = 0;
        if (this.dirty) {
          this.dirty = false;
          this.measure();
        }
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Entrada: o nome inteiro corrompido, travando da esquerda para a direita. */
  enter(onStart: () => void) {
    const now = performance.now();
    const last = this.chars.at(-1)?.index ?? 0;
    const base = Math.max(SWAP_MS * 3, ENTER.total - last * ENTER.stagger);
    this.chars.forEach((c) => this.activate(c, now + base + c.index * ENTER.stagger, now));
    this.nextTear = now + rnd(TEAR_EVERY[0], TEAR_EVERY[1]);
    onStart(); // no mesmo frame: o nome aparece já corrompido
    this.loop();
  }

  /** Hover: corrompe só as letras perto do cursor. Letra já ativa ou descansando: ignora. */
  touch(clientX: number, clientY: number) {
    const base = this.root.getBoundingClientRect();
    const x = clientX - base.left;
    const y = clientY - base.top;
    const rx = this.fontPx * HOVER_RADIUS_EM;
    const ry = this.fontPx * 0.6;
    const now = performance.now();
    let hit = false;
    for (const c of this.chars) {
      if (c.active || now < c.restUntil) continue;
      const dx = Math.abs(c.cx - x);
      if (dx > rx || Math.abs(c.cy - y) > ry) continue;
      // mais perto do cursor = fica corrompida um pouco mais
      const near = 1 - dx / rx;
      this.activate(c, now + HOVER_MIN + near * HOVER_JITTER * Math.random() + near * 80, now);
      hit = true;
    }
    if (hit) this.loop();
  }

  /** Para tudo e deixa o texto real (troca de página ou reduced motion ligado no meio). */
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.active.clear();
    this.torn?.el.classList.remove('is-torn');
    this.torn = null;
    this.chars.forEach((c) => {
      c.active = false;
      c.el.textContent = c.real;
      c.el.classList.remove('is-scrambling', 'is-locked');
    });
  }
}

function fontsReady(): Promise<unknown> {
  if (!('fonts' in document)) return Promise.resolve();
  return Promise.all([
    document.fonts.load('600 1em Fraunces'),
    document.fonts.load('500 1em "JetBrains Mono"'),
  ])
    .catch(() => {})
    .then(() => document.fonts.ready);
}

export function initDecodeText(introRunning: boolean): () => void {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-decode]')];
  if (!roots.length) return () => {};
  const reveal = (el: HTMLElement) => el.setAttribute('data-decode-ready', '');

  // Sem .motion-ok (reduced motion ou sem o script do <head>): nome direto, sem efeito.
  if (!document.documentElement.classList.contains('motion-ok') || prefersReducedMotion()) {
    roots.forEach(reveal);
    return () => {};
  }

  let disposed = false;
  const cleanups: (() => void)[] = [];
  const decoders: Decoder[] = [];

  fontsReady().then(() => {
    if (disposed) return;
    const canHover = window.matchMedia('(hover: hover)');

    for (const root of roots) {
      const d = new Decoder(root);
      d.measure();
      decoders.push(d);

      // Hover só com mouse e onde existe hover de verdade (no touch não há estado de hover).
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !canHover.matches || prefersReducedMotion()) return;
        if (root.hasAttribute('data-decode-ready')) d.touch(e.clientX, e.clientY);
      };
      root.addEventListener('pointermove', onMove);
      cleanups.push(() => root.removeEventListener('pointermove', onMove));
    }

    const start = () => {
      if (disposed) return;
      decoders.forEach((d, i) => d.enter(() => reveal(roots[i])));
    };
    if (introRunning && window.__introState !== 'done') {
      window.addEventListener('intro:complete', start, { once: true });
      cleanups.push(() => window.removeEventListener('intro:complete', start));
    } else {
      const t = window.setTimeout(start, NO_INTRO_DELAY);
      cleanups.push(() => clearTimeout(t));
    }

    // Resize muda o tamanho da fonte (clamp com vw): mede de novo, com debounce.
    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => decoders.forEach((d) => d.measure()), 150);
    };
    window.addEventListener('resize', onResize);
    cleanups.push(() => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    });

    // Reduced motion ligado no meio: para e mostra o nome.
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = (e: MediaQueryListEvent) => {
      if (!e.matches) return;
      decoders.forEach((d) => d.stop());
      roots.forEach(reveal);
    };
    rmq.addEventListener('change', onMotion);
    cleanups.push(() => rmq.removeEventListener('change', onMotion));
  });

  return () => {
    disposed = true;
    decoders.forEach((d) => d.stop());
    cleanups.forEach((fn) => fn());
  };
}
