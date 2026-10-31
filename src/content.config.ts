import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Cada arquivo .md/.mdx em src/content/projetos vira uma entrada da coleção "projetos".
// O schema zod valida o frontmatter no build: um campo faltando ou de tipo errado
// faz o `npm run build` falhar apontando o arquivo, em vez de quebrar a página em produção.
const projetos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projetos' }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string(),
    area: z.string(), // vira o eyebrow do card e da página
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    data: z.coerce.date(), // aceita "2026-10-31" no frontmatter e entrega um Date
    status: z.enum(['concluído', 'em andamento']),
    tempoDedicado: z.string().optional(),
    destaque: z.boolean().default(false),
    ordem: z.number().optional(),
  }),
});

export const collections = { projetos };
