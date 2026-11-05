/*
  Internacionalização (PT/EN).

  - Português é o idioma padrão e mora em "/"; inglês mora em "/en/".
  - As páginas de projeto mudam o segmento: /projetos/<slug>/ ↔ /en/projects/<slug>/.
  - Todo texto de interface sai do dicionário abaixo. Conteúdo longo (o artigo de
    cada projeto) fica em MDX separado por idioma: src/content/projetos/{pt,en}/.

  Uso num componente Astro:
    const lang = getLang(Astro.currentLocale);
    const t = ui[lang];
*/

export const LANGS = ['pt', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'pt';

export function getLang(locale: string | undefined): Lang {
  return locale === 'en' ? 'en' : 'pt';
}

/** Lê o idioma no navegador (o <html lang> é trocado a cada navegação). */
export function docLang(): Lang {
  return document.documentElement.lang.startsWith('en') ? 'en' : 'pt';
}

export const HTML_LANG: Record<Lang, string> = { pt: 'pt-BR', en: 'en' };
export const OG_LOCALE: Record<Lang, string> = { pt: 'pt_BR', en: 'en_US' };
export const INTL_LOCALE: Record<Lang, string> = { pt: 'pt-BR', en: 'en-US' };

// ---------- URLs ----------
export const homeUrl = (lang: Lang) => (lang === 'en' ? '/en/' : '/');
export const projectUrl = (lang: Lang, slug: string) =>
  lang === 'en' ? `/en/projects/${slug}/` : `/projetos/${slug}/`;
/** id de entrada da coleção ('pt/senderix-eval') → slug da URL ('senderix-eval'). */
export const slugOf = (id: string) => id.replace(/^(pt|en)\//, '');
export const langOf = (id: string): Lang => (id.startsWith('en/') ? 'en' : 'pt');

export const sectionUrl = (lang: Lang, id: 'projetos' | 'sobre') => `${homeUrl(lang)}#${id}`;

/** A mesma página no outro idioma (usada no toggle e nas tags hreflang). */
export function translatePath(pathname: string, to: Lang): string {
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const rest = isEn ? pathname.slice(3) || '/' : pathname;
  const proj = rest.match(/^\/(?:projetos|projects)\/([^/]+)\/?$/);
  if (proj) return projectUrl(to, proj[1]);
  return to === 'en' ? `/en${rest === '/' ? '/' : rest}` : rest;
}

// ---------- dicionário ----------
export const ui = {
  pt: {
    meta: {
      title: 'Pedro Átila Gomes Câmara — Engenheiro de IA',
      description:
        'Pedro Átila Gomes Câmara, engenheiro de IA em Fortaleza-CE. Estudante de Ciência da Computação: sistemas com LLMs documentados por inteiro, do problema à arquitetura, decisões e resultados.',
      ogImageAlt: 'Pedro Câmara',
    },
    skipLink: 'Pular para o conteúdo',
    nav: {
      label: 'Principal',
      home: 'Pedro Câmara, página inicial',
      projects: 'Projetos',
      about: 'Sobre',
      newTab: '(abre em nova aba)',
    },
    langToggle: {
      label: 'Idioma',
      switchTo: 'Read in English',
    },
    hero: {
      role: 'Engenheiro de IA',
      location: 'Fortaleza-CE',
      lede: 'Estudante de Ciência da Computação e entusiasta de inteligência artificial. Aqui cada projeto é documentado por inteiro: o problema, a arquitetura, as decisões e os resultados.',
      email: 'Enviar e-mail',
      ctaProjects: 'Ver projetos',
      ctaAbout: 'Sobre mim',
    },
    sections: {
      projectsEyebrow: 'Projetos',
      projectsTitle: 'Trabalho documentado por inteiro',
      aboutEyebrow: 'Sobre',
      aboutTitle: 'Oi, eu sou o Pedro.',
    },
    stack: { label: 'Tecnologias que uso' },
    card: { cta: 'Ver projeto' },
    project: {
      back: 'Projetos',
      date: 'Data',
      status: 'Status',
      time: 'Tempo dedicado',
      repo: 'Repositório',
      statusValue: { concluído: 'concluído', 'em andamento': 'em andamento' } as Record<string, string>,
    },
    toc: 'Nesta página',
    decision: 'Decisão',
    decisionAria: 'Decisão técnica',
    table: 'Tabela (role para os lados se necessário)',
    code: { copy: 'copiar', copied: 'copiado', error: 'erro', aria: 'Copiar código' },
    github: {
      title: 'Atividade no GitHub',
      contributions: (n: number) => (n === 1 ? 'contribuição' : 'contribuições'),
      lastYear: 'no último ano',
      calendarAria: 'Calendário de contribuições dos últimos 12 meses. Use as setas para navegar pelos dias.',
      days: ['Seg', 'Qua', 'Sex'],
      less: 'Menos',
      more: 'Mais',
      recent: 'Atividade recente',
      updated: 'Atualizado em',
      push: (r: string) => `Push em ${r}`,
      prOpen: (r: string) => `PR aberto em ${r}`,
      prMerge: (r: string) => `PR mesclado em ${r}`,
      repo: (r: string) => `Criou o repositório ${r}`,
      tooltip: (n: number, date: string) => `${n} ${n === 1 ? 'contribuição' : 'contribuições'} em ${date}`,
    },
    notFound: {
      title: 'Página não encontrada',
      description: 'Esta página não existe.',
      eyebrow: 'Erro 404',
      text: 'O endereço pode ter mudado, ou nunca ter existido.',
      home: 'Voltar ao início',
      projects: 'Ver projetos',
    },
    charts: {
      day: 'Dia',
      legend: 'Legenda',
      model: 'Modelo',
      min: 'Min',
      max: 'Max',
      avg: 'Média',
      sum: 'Soma',
      pctTotal: '% do total',
      source: 'Fonte: OpenRouter — painel de Activity',
      areaAria: (t: string, a: string, b: string, soma: string, pico: string, v: string) =>
        `${t}, de ${a} a ${b}, em gráfico de área. Soma de ${soma}; pico em ${pico}, com ${v}.`,
      barsAria: (t: string, a: string, b: string, total: string, pico: string, v: string) =>
        `${t}, de ${a} a ${b}, em barras empilhadas por dia. Total de ${total}; pico em ${pico}, com ${v}.`,
    },
  },
  en: {
    meta: {
      title: 'Pedro Átila Gomes Câmara — AI Engineer',
      description:
        'Pedro Átila Gomes Câmara, AI engineer in Fortaleza, Brazil. Computer Science student: LLM systems documented end to end, from the problem to the architecture, decisions and results.',
      ogImageAlt: 'Pedro Câmara',
    },
    skipLink: 'Skip to content',
    nav: {
      label: 'Main',
      home: 'Pedro Câmara, home page',
      projects: 'Projects',
      about: 'About',
      newTab: '(opens in a new tab)',
    },
    langToggle: {
      label: 'Language',
      switchTo: 'Ler em português',
    },
    hero: {
      role: 'AI Engineer',
      location: 'Fortaleza, Brazil',
      lede: 'Computer Science student and artificial intelligence enthusiast. Every project here is documented end to end: the problem, the architecture, the decisions and the results.',
      email: 'Send an email',
      ctaProjects: 'See projects',
      ctaAbout: 'About me',
    },
    sections: {
      projectsEyebrow: 'Projects',
      projectsTitle: 'Work documented end to end',
      aboutEyebrow: 'About',
      aboutTitle: "Hi, I'm Pedro.",
    },
    stack: { label: 'Technologies I use' },
    card: { cta: 'View project' },
    project: {
      back: 'Projects',
      date: 'Date',
      status: 'Status',
      time: 'Time spent',
      repo: 'Repository',
      statusValue: { concluído: 'completed', 'em andamento': 'in progress' } as Record<string, string>,
    },
    toc: 'On this page',
    decision: 'Decision',
    decisionAria: 'Technical decision',
    table: 'Table (scroll sideways if needed)',
    code: { copy: 'copy', copied: 'copied', error: 'error', aria: 'Copy code' },
    github: {
      title: 'GitHub activity',
      contributions: (n: number) => (n === 1 ? 'contribution' : 'contributions'),
      lastYear: 'in the last year',
      calendarAria: 'Contribution calendar for the last 12 months. Use the arrow keys to move between days.',
      days: ['Mon', 'Wed', 'Fri'],
      less: 'Less',
      more: 'More',
      recent: 'Recent activity',
      updated: 'Updated on',
      push: (r: string) => `Pushed to ${r}`,
      prOpen: (r: string) => `Opened a PR in ${r}`,
      prMerge: (r: string) => `Merged a PR in ${r}`,
      repo: (r: string) => `Created repository ${r}`,
      tooltip: (n: number, date: string) => `${n} ${n === 1 ? 'contribution' : 'contributions'} on ${date}`,
    },
    notFound: {
      title: 'Page not found',
      description: 'This page does not exist.',
      eyebrow: 'Error 404',
      text: 'The address may have changed, or it never existed.',
      home: 'Back to home',
      projects: 'See projects',
    },
    charts: {
      day: 'Day',
      legend: 'Legend',
      model: 'Model',
      min: 'Min',
      max: 'Max',
      avg: 'Average',
      sum: 'Sum',
      pctTotal: '% of total',
      source: 'Source: OpenRouter — Activity dashboard',
      areaAria: (t: string, a: string, b: string, soma: string, pico: string, v: string) =>
        `${t}, from ${a} to ${b}, as an area chart. Sum of ${soma}; peak on ${pico}, at ${v}.`,
      barsAria: (t: string, a: string, b: string, total: string, pico: string, v: string) =>
        `${t}, from ${a} to ${b}, as stacked bars per day. Total of ${total}; peak on ${pico}, at ${v}.`,
    },
  },
} as const;

export type UI = (typeof ui)[Lang];

/** "27/10" → "Oct 27" no inglês; no português fica como está. */
export function dayLabel(dia: string, lang: Lang): string {
  if (lang === 'pt') return dia;
  const [d, m] = dia.split('/').map(Number);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, m - 1, 1)),
  );
  return `${month} ${d}`;
}
