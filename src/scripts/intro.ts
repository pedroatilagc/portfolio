import { anim, tween, EASE, reducedMotionQuery } from './anim';

/**
 * Intro da home (1ª visita da sessão).
 *
 * Quem decide se ela roda é o script inline do <head> (src/components/BootScript.astro):
 * ele põe .intro-loading no <html> antes do primeiro paint. Aqui só conferimos a classe.
 *
 * Timeline (ms desde a montagem do overlay):
 *    0  linha 1 digitando (60ms/char)
 *  350  linha 2 digitando (35ms/char)
 *  750  linha 3 digitando (80ms/char)
 *  900  terminal some (opacity 1→0, 200ms ease-out)
 * 1050  "_" aparece
 * 1100  SWAP: terminal display:none, wordmark entra (200ms) + cursor piscando + linha scaleX
 * 2300  WIPE: overlay sobe (translateY 0→-100%, 500ms ease-in-out) → remove, libera scroll
 */

export const INTRO_KEY = 'pc_intro_played';

type IntroState = 'idle' | 'running' | 'wiping' | 'done';
declare global {
  interface Window {
    __introState?: IntroState;
  }
}

const LINES = [
  { text: 'pedro.camara --init', charDelay: 60, delay: 0 },
  { text: 'loading projects ........ ok', charDelay: 35, delay: 350 },
  { text: 'ready', charDelay: 80, delay: 750 },
];

const T_TERMINAL_OUT = 900;
const T_UNDERSCORE = 1050;
const T_SWAP = 1100;
const T_WIPE = 2300;
const FAILSAFE = 4000;

function markPlayed() {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* modo privado restrito: sem problema, o <head> já trata erro como "já tocou" */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

export function shouldRunIntro(): boolean {
  return document.documentElement.classList.contains('intro-loading');
}

export function runIntro(): void {
  const html = document.documentElement;
  if (window.__introState && window.__introState !== 'idle') return;
  window.__introState = 'running';

  // ---------- monta o overlay ----------
  const overlay = el('div', 'intro');
  overlay.setAttribute('aria-hidden', 'true');

  const terminal = el('div', 'intro-terminal');
  const typed: HTMLSpanElement[] = [];
  const underscore = el('span', 'intro-underscore', '_');
  LINES.forEach((line, i) => {
    const row = el('div', 'intro-line');
    row.append(el('span', 'intro-prompt', '> '));
    const t = el('span', 'intro-typed');
    typed.push(t);
    row.append(t);
    if (i === LINES.length - 1) row.append(underscore);
    terminal.append(row);
  });

  const mark = el('div', 'intro-mark');
  const nameWrap = el('span', 'intro-name-wrap');
  const name = el('span', 'intro-name', 'Pedro Câmara');
  const rule = el('span', 'intro-rule');
  nameWrap.append(name, rule);
  const cursor = el('span', 'intro-cursor', '▊');
  mark.append(nameWrap, cursor);

  overlay.append(terminal, mark);
  document.body.append(overlay);

  // Overlay visível (ele força visibility:visible); agora o body pode "voltar":
  // ele está coberto pelo overlay, então não há flash.
  html.classList.remove('intro-loading');
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // ---------- controle ----------
  const timers: number[] = [];
  const tweens: { stop: () => void }[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  let wipeStarted = false;
  let finished = false;
  let blink: Animation | null = null;

  const startWipe = () => {
    if (wipeStarted) return;
    wipeStarted = true;
    window.__introState = 'wiping';
    window.dispatchEvent(new CustomEvent('intro:wipe'));
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    tweens.forEach((t) => t.stop());
    blink?.cancel();
    rmq.removeEventListener('change', onMotionChange);
    startWipe(); // garante que o hero saiba que pode entrar
    overlay.remove();
    document.body.style.overflow = prevOverflow;
    html.classList.remove('intro-loading');
    markPlayed();
    window.__introState = 'done';
    window.dispatchEvent(new CustomEvent('intro:complete'));
  };

  // Se o usuário ativar reduced motion durante a intro, encerra na hora.
  const rmq = reducedMotionQuery();
  const onMotionChange = (e: MediaQueryListEvent) => {
    if (e.matches) finish();
  };
  rmq.addEventListener('change', onMotionChange);

  // Failsafe: se algo travar, em 4s a intro termina de qualquer jeito.
  at(FAILSAFE, finish);

  // ---------- Fase A: digitação ----------
  LINES.forEach((line, i) => {
    const len = line.text.length;
    tweens.push(
      tween(
        len * line.charDelay,
        len,
        (v) => {
          typed[i].textContent = line.text.slice(0, Math.floor(v));
        },
        line.delay,
      ),
    );
  });

  at(T_TERMINAL_OUT, () => {
    anim(terminal, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE.out });
  });

  at(T_UNDERSCORE, () => {
    underscore.style.opacity = '1';
  });

  // ---------- SWAP ----------
  at(T_SWAP, () => {
    terminal.style.display = 'none';
    mark.style.display = 'flex';
    anim(mark, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    // cursor: pisca para sempre (fica de fora do helper, que é para animações finitas)
    blink = cursor.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 500,
      direction: 'alternate',
      iterations: Infinity,
      easing: 'linear',
    });
    anim(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 400,
      easing: EASE.out,
    });
  });

  // ---------- WIPE ----------
  at(T_WIPE, () => {
    startWipe();
    const wipe = overlay.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], {
      duration: 500,
      easing: EASE.inOut,
      fill: 'forwards',
    });
    wipe.finished.then(finish, finish);
  });
}
