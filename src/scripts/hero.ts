import { anim, splitWords, prefersReducedMotion, EASE } from './anim';

const STEP = 120; // ms entre cada item da cascata (badge → parágrafo → ícones → botões)
// Com intro: começa 550ms após o INÍCIO do wipe (o wipe dura 500ms; o eyebrow já
// entra no fim dele e a cascata continua, então a revelação parece um movimento só).
const AFTER_WIPE = 550;
const NO_INTRO = 100;

function play(items: HTMLElement[]) {
  items.forEach((item, i) => {
    const delay = i * STEP;
    if (item.dataset.hero === 'words') {
      const target = item.querySelector<HTMLElement>('[data-words]') ?? item;
      const words = splitWords(target);
      // Quem anima são as palavras. Elas recebem o 1º keyframe (translateY 110%,
      // escondidas pelo overflow:hidden do .split-w) neste mesmo frame, graças ao
      // fill:'both' — então o container já pode ficar visível sem "piscar".
      item.style.opacity = '1';
      words.forEach((w, j) => {
        anim(w, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], {
          duration: 1000,
          delay: delay + j * 40,
          easing: EASE.expo,
          reset: true,
        });
      });
    } else {
      anim(
        item,
        [
          { opacity: 0, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 800, delay, easing: EASE.expo },
      );
    }
  });
}

export function initHero(introRunning: boolean): () => void {
  const items = [...document.querySelectorAll<HTMLElement>('[data-hero-hidden]')];
  if (!items.length) return () => {};
  // Sem .motion-ok o CSS nunca escondeu nada: não há o que animar.
  if (!document.documentElement.classList.contains('motion-ok') || prefersReducedMotion()) {
    items.forEach((i) => (i.style.opacity = '1'));
    return () => {};
  }

  let timer = 0;
  const start = (ms: number) => {
    timer = window.setTimeout(() => play(items), ms);
  };

  if (introRunning) {
    const onWipe = () => start(AFTER_WIPE);
    window.addEventListener('intro:wipe', onWipe, { once: true });
    return () => {
      window.removeEventListener('intro:wipe', onWipe);
      clearTimeout(timer);
    };
  }
  start(NO_INTRO);
  return () => clearTimeout(timer);
}
