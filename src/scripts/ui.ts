import { tween, prefersReducedMotion } from './anim';

/* ---------- Header: borda/fundo só depois de rolar ---------- */
export function initHeader(): () => void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return () => {};
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
  return () => window.removeEventListener('scroll', update);
}

/* ---------- Botão copiar nos blocos de código (Shiki) ---------- */
export function initCopyButtons(): void {
  document.querySelectorAll<HTMLPreElement>('.prose pre.astro-code').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.replaceWith(wrap);
    wrap.append(pre);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'copiar';
    btn.setAttribute('aria-label', 'Copiar código');
    btn.addEventListener('click', async () => {
      const text = pre.querySelector('code')?.innerText ?? pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'copiado';
        btn.dataset.copied = '';
      } catch {
        btn.textContent = 'erro';
      }
      setTimeout(() => {
        btn.textContent = 'copiar';
        delete btn.dataset.copied;
      }, 1600);
    });
    wrap.append(btn);
  });
}

/* ---------- TOC: item ativo segue o heading que está lendo ---------- */
export function initToc(): () => void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]')];
  if (!links.length) return () => {};
  const ids = [...new Set(links.map((a) => decodeURIComponent(a.hash.slice(1))))];
  const headings = ids
    .map((id) => document.getElementById(id))
    .filter((h): h is HTMLElement => Boolean(h));
  if (!headings.length) return () => {};

  let current = '';
  const setActive = (id: string) => {
    if (id === current) return;
    current = id;
    for (const a of links) {
      const on = decodeURIComponent(a.hash.slice(1)) === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };

  // O IntersectionObserver só serve de "gatilho" barato: a cada cruzamento,
  // o ativo é o último heading cujo topo já passou de 30% da altura da tela.
  const compute = () => {
    const line = window.innerHeight * 0.3;
    let active = headings[0].id;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= line) active = h.id;
      else break;
    }
    setActive(active);
  };
  const io = new IntersectionObserver(compute, {
    rootMargin: '0px 0px -60% 0px',
    threshold: [0, 1],
  });
  headings.forEach((h) => io.observe(h));
  compute();

  // Complemento: num salto de scroll (clique na TOC, Home/End), um heading pode ir de
  // "abaixo" para "acima" da área observada sem nunca intersectar, e o IO não dispara.
  // Um recálculo por frame no scroll (no máximo 1 por rAF) cobre esse caso.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      compute();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // No mobile, fecha o <details> ao escolher um item
  const details = document.querySelector<HTMLDetailsElement>('[data-toc-mobile]');
  const onClick = (e: Event) => {
    if ((e.target as HTMLElement).closest('a') && details) details.open = false;
  };
  details?.addEventListener('click', onClick);

  return () => {
    io.disconnect();
    window.removeEventListener('scroll', onScroll);
    details?.removeEventListener('click', onClick);
  };
}

/* ---------- Faixa de stack: botão pausar/retomar ---------- */
export function initMarquee(): void {
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((root) => {
    const btn = root.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const paused = root.toggleAttribute('data-paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.textContent = paused ? 'Retomar faixa' : 'Pausar faixa';
    });
  });
}

/* ---------- Terminal mockup: digita ao entrar no viewport ----------
   Cada linha tem o texto inteiro em dois spans: .t-on (visível) e .t-off
   (visibility:hidden). Digitar = mover caracteres de um para o outro.
   A caixa nunca muda de tamanho → zero layout shift. */
export function initTerminals(): () => void {
  if (prefersReducedMotion() || !document.documentElement.classList.contains('motion-ok')) {
    return () => {};
  }
  const terms = [...document.querySelectorAll<HTMLElement>('[data-terminal-type]')].filter(
    (t) => t.getBoundingClientRect().top >= window.innerHeight,
  );
  if (!terms.length) return () => {};

  const stops: (() => void)[] = [];
  const prepare = (term: HTMLElement) => {
    const lines = [...term.querySelectorAll<HTMLElement>('[data-line]')];
    return lines.map((line) => {
      const text = line.dataset.text ?? '';
      const on = line.querySelector<HTMLElement>('.t-on')!;
      const off = line.querySelector<HTMLElement>('.t-off')!;
      on.textContent = '';
      off.textContent = text;
      line.classList.add('is-pending');
      return { line, text, on, off, kind: line.dataset.line };
    });
  };

  const play = async (lines: ReturnType<typeof prepare>) => {
    for (const l of lines) {
      l.line.classList.remove('is-pending');
      if (l.kind === 'cmd') {
        // 28ms/char, mas no máximo 900ms: comandos longos não podem segurar a saída
        const t = tween(Math.min(l.text.length * 28, 900), l.text.length, (v) => {
          const n = Math.floor(v);
          l.on.textContent = l.text.slice(0, n);
          l.off.textContent = l.text.slice(n);
        });
        stops.push(t.stop);
        await t.finished;
        await new Promise((r) => setTimeout(r, 180));
      } else {
        l.on.textContent = l.text;
        l.off.textContent = '';
        await new Promise((r) => setTimeout(r, 22));
      }
    }
  };

  const prepared = new Map(terms.map((t) => [t, prepare(t)]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const lines = prepared.get(e.target as HTMLElement);
        if (lines) play(lines);
      }
    },
    { rootMargin: '-80px 0px', threshold: 0 },
  );
  terms.forEach((t) => io.observe(t));

  return () => {
    io.disconnect();
    stops.forEach((s) => s());
  };
}
