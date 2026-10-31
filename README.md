# Portfólio — Pedro Câmara

Site estático em [Astro](https://astro.build) com páginas detalhadas por projeto.

## Requisitos

- Node **≥ 22.23.4** (exigência do Astro 7)

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Servidor de desenvolvimento em `localhost:4321` |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run diagrams` | Re-renderiza `src/diagrams/*.mmd` em `.svg` (rode depois de editar um diagrama e versione o `.svg`) |

## Onde mexer

- **Novo projeto:** crie `src/content/projetos/<slug>.mdx`. O frontmatter é validado pelo schema em `src/content.config.ts`, e a página `/projetos/<slug>/` é gerada automaticamente.
- **Tokens de design:** `src/styles/tokens.css`.
- **Links e stack da home:** `src/data/site.ts`.
- **Animações:** `src/scripts/` (`anim.ts` é o helper sobre a Web Animations API; `intro.ts`, `hero.ts`, `reveal.ts`, `ui.ts`).
