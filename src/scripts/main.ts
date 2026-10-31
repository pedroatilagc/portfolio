import { runIntro, shouldRunIntro } from './intro';
import { initHero } from './hero';
import { initReveal } from './reveal';
import { initHeader, initCopyButtons, initToc, initMarquee, initTerminals } from './ui';
import { initCharts } from './charts';

/**
 * Ponto de entrada de todo o JS do site.
 *
 * Com o <ClientRouter /> do Astro, a navegação entre páginas NÃO recarrega o
 * documento: o Astro busca o HTML novo e troca o conteúdo. Este módulo roda uma
 * vez só, então tudo que depende do DOM da página precisa re-inicializar no
 * evento "astro:page-load" (que dispara no 1º carregamento e após cada navegação),
 * e ser desmontado em "astro:before-swap" (observers, listeners).
 */

let cleanups: (() => void)[] = [];

function init() {
  // A intro só existe no 1º carregamento real: depois de uma navegação pelo
  // roteador, o <html> não tem .intro-loading (ver BootScript.astro).
  const introRunning = shouldRunIntro();
  if (introRunning) runIntro();

  cleanups.push(
    initHero(introRunning),
    initReveal(),
    initHeader(),
    initToc(),
    initTerminals(),
    initCharts(),
  );
  initCopyButtons();
  initMarquee();
}

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});
