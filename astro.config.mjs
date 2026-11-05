// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // TODO: Pedro preencher — troque pela URL final (ex.: https://pedro.senderix.com.br).
  // É usada para gerar URLs absolutas (canonical e og:image).
  site: 'https://pedro.senderix.com.br',
  integrations: [mdx()],
  // Dois idiomas. Português é o padrão e fica sem prefixo (/), inglês fica em /en/.
  // Com isso o Astro preenche Astro.currentLocale ('pt' ou 'en') em cada página.
  i18n: {
    locales: ['pt', 'en'],
    defaultLocale: 'pt',
    routing: { prefixDefaultLocale: false },
  },
  // Sem `output`/adapter: o padrão é estático (SSG). Tudo vira HTML no `npm run build`.
  markdown: {
    shikiConfig: {
      // O tema "css-variables" faz o Shiki emitir cores como var(--astro-code-*),
      // que definimos em src/styles/code.css a partir dos tokens do design system.
      theme: 'css-variables',
      wrap: false,
    },
  },
});
