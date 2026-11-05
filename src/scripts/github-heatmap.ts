/**
 * Heatmap do GitHub: tooltip + navegação por teclado + scroll inicial no fim.
 *
 * - Um listener delegado por tipo de evento no card (não um por quadrado: são ~371).
 * - Teclado: o SVG tem um único quadrado com tabindex="0" (o dia mais recente).
 *   Setas movem o foco por data (↑↓ = ±1 dia, ←→ = ±1 semana): "roving tabindex",
 *   então o heatmap custa só uma parada no Tab.
 */

import { docLang, ui, INTL_LOCALE } from '../i18n';

// Idioma lido do <html lang> no momento do uso (muda ao navegar entre / e /en/).
function label(rect: SVGRectElement): string {
  const lang = docLang();
  const n = Number(rect.dataset.c ?? 0);
  const date = new Intl.DateTimeFormat(INTL_LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${rect.dataset.d}T00:00:00Z`),
  );
  return ui[lang].github.tooltip(n, date);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

export function initGitHubHeatmap(): () => void {
  const card = document.querySelector<HTMLElement>('[data-gh-card]');
  const svg = card?.querySelector<SVGSVGElement>('[data-gh-heatmap]');
  const tip = card?.querySelector<HTMLElement>('[data-gh-tooltip]');
  const scroller = card?.querySelector<HTMLElement>('[data-gh-scroller]');
  if (!card || !svg || !tip || !scroller) return () => {};

  // Mobile: mostra as semanas mais recentes primeiro.
  scroller.scrollLeft = scroller.scrollWidth;

  let active: SVGRectElement | null = null;

  const show = (rect: SVGRectElement) => {
    active?.removeAttribute('data-active');
    active = rect;
    rect.setAttribute('data-active', '');
    tip.textContent = label(rect);
    tip.hidden = false;
    const r = rect.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    // Centralizado no quadrado, mas sem sair do card (no mobile, os quadrados da borda).
    const half = tip.offsetWidth / 2;
    const x = r.left - c.left + r.width / 2;
    tip.style.left = `${Math.min(Math.max(x, half + 8), c.width - half - 8)}px`;
    tip.style.top = `${r.top - c.top}px`;
  };
  const hide = () => {
    active?.removeAttribute('data-active');
    active = null;
    tip.hidden = true;
  };
  const rectFrom = (t: EventTarget | null) =>
    t instanceof SVGRectElement && t.dataset.d ? t : null;

  const onOver = (e: PointerEvent) => {
    const rect = rectFrom(e.target);
    if (rect) show(rect);
    else if (document.activeElement && svg.contains(document.activeElement)) return;
    else hide();
  };
  const onLeave = () => {
    if (!svg.contains(document.activeElement)) hide();
  };
  const onFocusIn = (e: FocusEvent) => {
    const rect = rectFrom(e.target);
    if (!rect) return;
    rect.setAttribute('role', 'img');
    rect.setAttribute('aria-label', label(rect));
    show(rect);
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!svg.contains(e.relatedTarget as Node | null)) hide();
  };
  const onKey = (e: KeyboardEvent) => {
    const from = rectFrom(e.target);
    const delta = KEYS[e.key];
    if (!from || delta === undefined) return;
    const to = svg.querySelector<SVGRectElement>(`rect[data-d="${shiftDate(from.dataset.d!, delta)}"]`);
    e.preventDefault();
    if (!to) return;
    from.setAttribute('tabindex', '-1');
    to.setAttribute('tabindex', '0');
    to.focus();
    // mantém o quadrado focado à vista dentro do card rolável
    to.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  svg.addEventListener('pointerover', onOver);
  svg.addEventListener('pointerleave', onLeave);
  svg.addEventListener('focusin', onFocusIn);
  svg.addEventListener('focusout', onFocusOut);
  svg.addEventListener('keydown', onKey);
  // Ao rolar o card, o tooltip acompanha o quadrado ativo.
  const onScroll = () => active && show(active);
  scroller.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    svg.removeEventListener('pointerover', onOver);
    svg.removeEventListener('pointerleave', onLeave);
    svg.removeEventListener('focusin', onFocusIn);
    svg.removeEventListener('focusout', onFocusOut);
    svg.removeEventListener('keydown', onKey);
    scroller.removeEventListener('scroll', onScroll);
  };
}
