/**
 * Tooltip dos gráficos (src/components/charts).
 *
 * Cada dia tem um <button class="ch-hit"> invisível por cima da coluna: ele é o
 * alvo do mouse (maior que a barra) e do teclado (Tab). O conteúdo do tooltip
 * já vem calculado do build em data-tip (JSON); aqui só montamos e posicionamos.
 * Leitores de tela não dependem do tooltip: o botão tem aria-label com os mesmos
 * valores, e cada gráfico tem uma tabela sr-only.
 */

type Tip = { dia: string; linhas: [string, string, string][]; total: string | null };

function montar(tipEl: HTMLElement, tip: Tip) {
  tipEl.replaceChildren();
  const dia = document.createElement('div');
  dia.className = 'ch-tip-dia';
  dia.textContent = tip.dia;
  tipEl.append(dia);

  for (const [nome, cor, valor] of tip.linhas) {
    const row = document.createElement('div');
    row.className = 'ch-tip-row';
    const sw = document.createElement('span');
    sw.className = 'ch-sw';
    sw.style.setProperty('--sw', cor);
    const n = document.createElement('span');
    n.textContent = nome;
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = valor;
    row.append(sw, n, v);
    tipEl.append(row);
  }
  if (tip.total) {
    const row = document.createElement('div');
    row.className = 'ch-tip-row ch-tip-total';
    const n = document.createElement('span');
    n.textContent = 'Total';
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = tip.total;
    row.append(n, v);
    tipEl.append(row);
  }
}

export function initCharts(): () => void {
  const offs: (() => void)[] = [];

  document.querySelectorAll<HTMLElement>('[data-chart]').forEach((chart) => {
    const plot = chart.querySelector<HTMLElement>('.ch-plot');
    const tipEl = chart.querySelector<HTMLElement>('.ch-tip');
    if (!plot || !tipEl) return;
    const hits = [...chart.querySelectorAll<HTMLButtonElement>('.ch-hit')];
    const cols = [...chart.querySelectorAll<SVGGElement>('[data-col]')];
    const dots = [...chart.querySelectorAll<HTMLElement>('.ch-dot, .ch-cross')];

    const mostrar = (i: number) => {
      const btn = hits[i];
      montar(tipEl, JSON.parse(btn.dataset.tip!) as Tip);
      tipEl.hidden = false;

      // posiciona centrado na coluna, sem sair da área do gráfico
      const largura = plot.clientWidth;
      const centro = (Number(btn.dataset.centro) / 100) * largura;
      const w = tipEl.offsetWidth;
      const espaco = 8;
      let left = centro - w / 2;
      left = Math.max(-espaco * 4, Math.min(left, largura - w + espaco * 4));
      tipEl.style.left = `${left}px`;
      tipEl.style.transform = `translateY(calc(-100% - ${espaco}px))`;

      chart.dataset.active = '';
      cols.forEach((c, k) => c.classList.toggle('is-active', k === i));
      dots.forEach((d) => d.classList.toggle('is-active', Number(d.dataset.idx) === i));
    };
    const esconder = () => {
      tipEl.hidden = true;
      delete chart.dataset.active;
      cols.forEach((c) => c.classList.remove('is-active'));
      dots.forEach((d) => d.classList.remove('is-active'));
    };

    hits.forEach((btn, i) => {
      const on = () => mostrar(i);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') esconder();
      };
      btn.addEventListener('pointerenter', on);
      btn.addEventListener('focus', on);
      btn.addEventListener('click', on); // toque no celular
      btn.addEventListener('keydown', onKey);
      offs.push(() => {
        btn.removeEventListener('pointerenter', on);
        btn.removeEventListener('focus', on);
        btn.removeEventListener('click', on);
        btn.removeEventListener('keydown', onKey);
      });
    });
    const sair = (e: Event) => {
      // só esconde se o foco/ponteiro saiu do gráfico inteiro
      const rel = (e as FocusEvent).relatedTarget as Node | null;
      if (e.type === 'focusout' && rel && plot.contains(rel)) return;
      esconder();
    };
    plot.addEventListener('pointerleave', sair);
    plot.addEventListener('focusout', sair);
    offs.push(() => {
      plot.removeEventListener('pointerleave', sair);
      plot.removeEventListener('focusout', sair);
    });
  });

  return () => offs.forEach((f) => f());
}
